import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Search, Plus, Eye, Pencil, Trash2, UserRound, ChevronDown, Users, Camera, X, FileSpreadsheet, Download, Upload, SlidersHorizontal } from 'lucide-react';
import { getPersons, getPerson, createPerson, importPersons, updatePerson, deletePerson, getDisabilityTypes, createDisabilityInfo, deleteDisabilityInfo, getPersonPhotos, uploadPersonPhoto, deletePersonPhoto, getBatches } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { THAI_PROVINCES, checkProvince } from '../utils/province';
import { PREFIXES, splitPrefix } from '../utils/name';
import { resizeImage } from '../utils/resizeImage';
import { useThaiDate } from '../utils/useThaiDate';
import { matchBatch, matchCourse, matchDisabilities } from '../utils/importCheck';
import { useDiscardGuard } from '../utils/useDiscardGuard';
import DiscardBar from '../components/DiscardBar';

const GENDER_LABELS = { MALE: 'ชาย', FEMALE: 'หญิง', OTHER: 'อื่นๆ' };
// ผลติดตามล่าสุด — สีเดียวกับหน้าติดตามผล
const EMP = {
  EMPLOYED:   { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'มีงานทำ' },
  UNEMPLOYED: { cls: 'bg-gray-100 text-gray-600 border-gray-200',          label: 'ว่างงาน' },
  STUDYING:   { cls: 'bg-sky-100 text-sky-700 border-sky-200',             label: 'ศึกษาต่อ' },
};
// ตัวกรองรายชื่อ (ใช้พร้อมกันได้ + จำไว้ใน URL) — key = ชื่อใน URL, api = ชื่อที่ส่งให้หลังบ้าน
const FILTERS = [
  { key: 'batch', api: 'batchId' }, { key: 'gender', api: 'gender' }, { key: 'province', api: 'province' },
  { key: 'dis', api: 'disabilityTypeId' }, { key: 'emp', api: 'employment' },
];
const NO_FILTERS = Object.fromEntries(FILTERS.map(({ key }) => [key, '']));
const fmtShortDate = (d) => d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '';
const GENDER_BADGE = { MALE: 'bg-sky-100 text-sky-600 border-sky-200', FEMALE: 'bg-pink-100 text-pink-500 border-pink-200', OTHER: 'bg-gray-100 text-gray-500 border-gray-200' };


const EDUCATION_OPTS = [
  'ต่ำกว่าประถมศึกษา',
  'ประถมศึกษา',
  'มัธยมศึกษาตอนต้น',
  'มัธยมศึกษาตอนปลายหรือเทียบเท่า',
  'อนุปริญญา / ปวส.',
  'ปริญญาตรี',
  'ปริญญาโทขึ้นไป',
  'อื่นๆ',
];



const emptyForm = {
  fullName: '', nickname: '', thaiId: '', gender: 'MALE', birthDate: '',
  phone: '', mobile: '', email: '', landmark: '',
  houseNo: '', moo: '', building: '', floor: '',
  soi: '', road: '', subDistrict: '', district: '',
  province: '', postalCode: '',
  address: '',
  nationality: 'ไทย', religion: 'พุทธ', maritalStatus: 'SINGLE',
  educationLevel: '', lifeStatus: 'ALIVE', batchId: '', courseId: '',
};

export default function PersonList() {
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const toast = useToast();
  const modalRef = useRef(null);
  const [persons, setPersons] = useState([]);
  // เลขหน้า / คำค้น / รุ่นที่เลือก เก็บไว้ใน URL (?page=&q=&batch=)
  // กดดูรายละเอียดแล้วกลับมา หรือรีเฟรช ก็ยังอยู่หน้าเดิม
  const [urlParams, setUrlParams] = useSearchParams();
  const [search, setSearch] = useState(() => urlParams.get('q') || '');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [disabilityTypes, setDisabilityTypes] = useState([]);
  const [disabilityTypeId, setDisabilityTypeId] = useState('');
  const [editPersonDisabilities, setEditPersonDisabilities] = useState([]);
  // ประเภทความพิการที่กดถังขยะในฟอร์ม — ลบจริงตอนกดบันทึก (เดิมลบทันที กดยกเลิกฟอร์มก็ไม่กลับมา)
  const [removedDisabilityIds, setRemovedDisabilityIds] = useState([]);
  const [prefix, setPrefix] = useState('นาย');
  const [nameOnly, setNameOnly] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  const [existingPhotoId, setExistingPhotoId] = useState(null);   // รูปเดิมของคนที่กำลังแก้ — ใช้ตอนกด "ลบรูป" แล้วบันทึก
  const [formNonce, setFormNonce] = useState(0);
  const photoInputRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState(false);
  const formBodyRef = useRef(null);
  const [batches, setBatches] = useState([]);
  const [filters, setFilters] = useState(() => Object.fromEntries(FILTERS.map(({ key }) => [key, urlParams.get(key) || ''])));
  const activeFilters = FILTERS.filter(({ key }) => filters[key]).length;
  const [showFilters, setShowFilters] = useState(false);   // มือถือ: กดปุ่ม "ตัวกรอง" ถึงจะกางออก
  const [importModal, setImportModal] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);
  const guard = useDiscardGuard(() => modalRef.current?.close());
  // ค่าที่ใช้เทียบว่าแก้อะไรไปหรือยัง (รูปเทียบแค่ว่าเลือกรูปใหม่ / กดลบรูปเดิม เพราะรูปเดิมโหลดตามมาทีหลัง)
  const formState = () => ({
    form, prefix, nameOnly, disabilityTypeId, removedDisabilityIds,
    photoNew: photoBase64.startsWith('data:'), photoRemoved: !!existingPhotoId && !photoBase64,
  });
  const requestClose = () => guard.request(formState());

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(persons.length / PAGE_SIZE);
  // ลบคนสุดท้ายของหน้าสุดท้าย หน้านั้นจะหายไป → แสดงหน้าสุดท้ายที่ยังมีแทน
  const page = Math.min(Math.max(1, parseInt(urlParams.get('page'), 10) || 1), Math.max(1, totalPages));
  const paged = persons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const setPage = (next) => setUrlParams((prev) => {
    const p = new URLSearchParams(prev);
    const n = typeof next === 'function' ? next(page) : next;
    if (n > 1) p.set('page', String(n)); else p.delete('page');
    return p;
  }, { replace: true });

  // โหลดซ้ำโดยอยู่หน้าเดิม — ใช้หลังแก้ไข/ลบ
  // ค้นหาแบบพิมพ์แล้วขึ้นเลย ยิงหลายครั้งติดกัน → ใช้แค่ผลของครั้งล่าสุด (เน็ตช้า ผลเก่าอาจกลับมาทีหลังแล้วทับผลใหม่)
  const loadSeq = useRef(0);
  const load = (q = '', f = filters) => {
    setLoadError(false);
    const params = {};
    if (q.trim()) params.search = q.trim();
    for (const { key, api } of FILTERS) if (f[key]) params[api] = f[key];
    const seq = ++loadSeq.current;
    return getPersons(params)
      .then((r) => { if (seq === loadSeq.current) setPersons(r.data); })
      .catch(() => { if (seq === loadSeq.current) setLoadError(true); });
  };
  // ผลลัพธ์ชุดใหม่ (ค้นหา / เปลี่ยนตัวกรอง / เพิ่มคน / นำเข้า) → จำคำค้น+ตัวกรองลง URL แล้วเริ่มหน้า 1
  // เขียน URL ตอนผู้ใช้กดเท่านั้น ไม่เขียนตอนโหลดเสร็จ กันกรณีกดไปหน้าอื่นแล้วโดนดึงกลับ
  const searchTimer = useRef(null);
  const applyFilter = (q = search, f = filters) => {
    clearTimeout(searchTimer.current);   // มีค้นหาที่รอยิงอยู่ → ยกเลิก ใช้ค่าล่าสุดนี้แทน
    q = q.trim();
    setUrlParams(() => {
      const p = new URLSearchParams();
      if (q) p.set('q', q);
      for (const { key } of FILTERS) if (f[key]) p.set(key, f[key]);
      return p;
    }, { replace: true });
    return load(q, f);
  };
  const setFilter = (key, value) => {
    const f = { ...filters, [key]: value };
    setFilters(f);
    applyFilter(search, f);
  };
  const clearFilters = () => { setFilters(NO_FILTERS); applyFilter(search, NO_FILTERS); };
  // พิมพ์แล้วค้นให้เอง เมื่อหยุดพิมพ์ 0.35 วินาที (เดิมต้องกดปุ่ม "ค้นหา" หรือ Enter)
  const handleSearchInput = (v) => {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => applyFilter(v), 350);
  };
  useEffect(() => () => clearTimeout(searchTimer.current), []);   // ออกจากหน้าก่อนครบเวลา → ไม่ต้องค้น
  useEffect(() => {
    load(search);   // คำค้น / ตัวกรอง / หน้า เริ่มจากค่าใน URL แล้ว
    getDisabilityTypes().then((r) => setDisabilityTypes(r.data)).catch(() => {});
    getBatches().then((r) => setBatches(r.data)).catch(() => {});
  }, []);

  const openModal = async (row = null) => {
    setFormNonce((n) => n + 1);   // สร้างช่องในฟอร์มใหม่ทุกครั้งที่เปิด — ไม่ให้ตัวเลขที่พิมพ์ค้างจากรอบก่อนโผล่มา
    setPhotoBase64('');
    setExistingPhotoId(null);
    if (row) {
      // ดึงข้อมูลเต็มของคนนี้ก่อน — แถวในหน้ารายชื่อมีแค่บางช่อง (ไม่มีที่อยู่/อีเมล/หลักสูตร)
      // ถ้าเอาแถวนั้นใส่ฟอร์มตรงๆ กดบันทึกแล้วช่องที่ขาดจะถูกเขียนทับเป็นค่าว่างหมด
      let person;
      try {
        person = (await getPerson(row.id)).data;
      } catch (err) {
        toast.error('โหลดข้อมูลไม่สำเร็จ', err.response?.data?.error || 'ลองใหม่อีกครั้ง');
        return;
      }
      const { prefix: p, nameOnly: n } = splitPrefix(person.fullName || '');
      // แปลง null → '' ทุก field ก่อน spread เพื่อป้องกัน controlled input error
      const cleaned = Object.fromEntries(Object.entries(person).map(([k, v]) => [k, v === null ? '' : v]));
      const initial = { ...emptyForm, ...cleaned, birthDate: person.birthDate?.slice(0, 10) || '' };
      setForm(initial);
      guard.arm({ form: initial, prefix: p, nameOnly: n, disabilityTypeId: '', removedDisabilityIds: [], photoNew: false, photoRemoved: false });
      setPrefix(p);   // ไม่มีคำนำหน้า = "ไม่ระบุ" (เดิมเติม "นาย" ให้เอง ผู้หญิงที่นำเข้าจาก Excel ก็โดน)
      setNameOnly(n);
      setEditId(person.id);
      setEditPersonDisabilities(person.disabilityInfos || []);
      // โหลดรูปเดิม
      getPersonPhotos(person.id).then(r => {
        const profile = r.data.find(p => p.photoType === 'profile');
        if (profile?.filePath) { setPhotoBase64(profile.filePath); setExistingPhotoId(profile.id); }
      }).catch(() => {});
    } else {
      setForm(emptyForm);
      setPrefix('นาย');
      setNameOnly('');
      guard.arm({ form: emptyForm, prefix: 'นาย', nameOnly: '', disabilityTypeId: '', removedDisabilityIds: [], photoNew: false, photoRemoved: false });
      setEditId(null);
      setEditPersonDisabilities([]);
    }
    setDisabilityTypeId('');
    setRemovedDisabilityIds([]);
    setErrors({});
    modalRef.current?.showModal();
  };

  // ประเภทที่ยังเหลืออยู่ (ไม่นับที่กดถังขยะไว้) และประเภทที่ยังเลือกเพิ่มได้ (ไม่ให้เลือกซ้ำ)
  const keptDisabilities = editPersonDisabilities.filter((d) => !removedDisabilityIds.includes(d.id));
  const availableDisabilityTypes = disabilityTypes.filter((t) => !keptDisabilities.some((d) => d.disabilityTypeId === t.id));

  const validate = () => {
    const e = {};
    if (!nameOnly.trim()) e.nameOnly = 'กรุณากรอกชื่อ-นามสกุล';
    if (!form.thaiId || form.thaiId.length !== 13) e.thaiId = 'กรุณากรอกเลขบัตร 13 หลัก';
    if (!form.birthDate) e.birthDate = 'กรุณากรอกวันเกิด';
    if (!form.educationLevel) e.educationLevel = 'กรุณาเลือกระดับการศึกษา';
    if (!form.province) e.province = 'กรุณากรอกจังหวัด';
    if (!form.phone && !form.mobile) e.contact = 'กรุณากรอกเบอร์โทรศัพท์หรือมือถืออย่างน้อย 1 ช่อง';
    if (!editId && !disabilityTypeId) e.disability = 'กรุณาเลือกประเภทความพิการ';
    if (!form.batchId) e.batchId = 'กรุณาเลือกรุ่นที่เข้าร่วม';
    return e;
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';   // เลือกไฟล์เดิมซ้ำได้
    if (!file) return;
    try {
      setPhotoBase64(await resizeImage(file));   // ย่อให้อัตโนมัติ รูปมือถือใหญ่ๆ ก็ใช้ได้
    } catch (err) {
      toast.error('ใช้รูปนี้ไม่ได้', err.message);
    }
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      formBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      toast.error('กรอกข้อมูลไม่ครบ', 'กรุณากรอกช่องที่มีเครื่องหมาย * ให้ครบ');
      return;
    }
    setErrors({});
    const fullName = `${prefix}${prefix ? ' ' : ''}${nameOnly.trim()}`;
    const payload = {
      fullName,
      nickname: form.nickname,
      thaiId: form.thaiId, gender: form.gender, birthDate: form.birthDate,
      phone: form.phone, mobile: form.mobile, email: form.email, landmark: form.landmark,
      houseNo: form.houseNo, moo: form.moo, building: form.building, floor: form.floor,
      soi: form.soi, road: form.road, subDistrict: form.subDistrict, district: form.district,
      province: form.province, postalCode: form.postalCode,
      address: form.address,
      nationality: form.nationality, religion: form.religion,
      maritalStatus: form.maritalStatus, educationLevel: form.educationLevel, lifeStatus: form.lifeStatus,
      batchId: form.batchId || null,
      courseId: form.courseId || null,
    };
    if (!payload.birthDate) delete payload.birthDate;
    try {
      let personId = editId;
      if (editId) {
        await updatePerson(editId, payload);
        for (const did of removedDisabilityIds) await deleteDisabilityInfo(editId, did);
        if (disabilityTypeId) await createDisabilityInfo(editId, { disabilityTypeId });
      } else {
        const created = await createPerson(payload);
        personId = created.data.id;
        if (disabilityTypeId) await createDisabilityInfo(personId, { disabilityTypeId });
      }
      // อัปโหลดเฉพาะรูปที่เพิ่งเลือกใหม่ (เป็น data URL) — ถ้าเป็นรูปเดิมจะเป็น path ของไฟล์ ไม่ต้องส่งซ้ำ
      if (photoBase64?.startsWith('data:')) {
        await uploadPersonPhoto(personId, { filePath: photoBase64, photoType: 'profile' });   // หลังบ้านลบรูปเก่าให้เอง
      } else if (!photoBase64 && existingPhotoId) {
        // กด "ลบรูป" ในฟอร์ม → ลบจริงตอนบันทึก (เดิมแค่หายจากหน้าจอ รูปยังอยู่ในระบบ)
        await deletePersonPhoto(personId, existingPhotoId);
      }
      modalRef.current?.close();
      // แก้ไข = อยู่หน้าเดิม / เพิ่มใหม่ = กลับหน้า 1 (คนใหม่อยู่บนสุด จะได้เห็นเลย)
      if (editId) load(search); else applyFilter();
      toast.success(editId ? 'แก้ไขข้อมูลสำเร็จ!' : 'เพิ่มข้อมูลสำเร็จ!');
    } catch (err) {
      toast.error('บันทึกไม่สำเร็จ', err.response?.data?.error || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
    }
  };

  const handleDelete = async (id) => {
    if (!(await toast.confirm({ title: 'ลบข้อมูลคนพิการนี้?', message: 'ข้อมูลทั้งหมดรวมประวัติจะถูกลบและกู้คืนไม่ได้' }))) return;
    try {
      await deletePerson(id);
      load(search);
      toast.success('ลบสำเร็จ!');
    } catch (err) {
      toast.error('ลบไม่สำเร็จ', err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };


  // ── นำเข้า Excel ──
  const parseGender = (v) => {
    const s = String(v || '').trim();
    if (['MALE', 'FEMALE', 'OTHER'].includes(s)) return s;
    if (s.includes('หญิง')) return 'FEMALE';
    if (s.includes('ชาย')) return 'MALE';
    return 'MALE';
  };
  // แปลงเป็น YYYY-MM-DD (ค.ศ.) — Excel มองปี พ.ศ. เป็น ค.ศ. จึงต้องลบ 543 เองทุกทาง
  const toISO = (y, mo, d) => `${y > 2400 ? y - 543 : y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const parseBirth = (v) => {
    if (!v) return '';
    // ใช้ค่าตามเวลาเครื่อง ไม่ใช่ toISOString() ที่แปลงเป็น UTC แล้ววันถอยไป 1
    if (v instanceof Date) return isNaN(v) ? '' : toISO(v.getFullYear(), v.getMonth() + 1, v.getDate());
    const s = String(v).trim();
    const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (m) return toISO(parseInt(m[3]), m[2], m[1]);
    const m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m2) return toISO(parseInt(m2[1]), m2[2], m2[3]);
    return '';
  };
  // แสดงวันเกิดในตารางตัวอย่างเป็น วว/ดด/ปปปป พ.ศ. ให้ตรวจก่อนนำเข้า
  const showBirth = (iso) => {
    if (!iso) return '—';
    const [y, mo, d] = iso.split('-');
    return `${d}/${mo}/${parseInt(y) + 543}`;
  };
  // ที่อยู่แบบย่อ ไว้ตรวจในตารางตัวอย่างว่าอ่านที่อยู่จากไฟล์ได้ครบไหม
  const showAddress = (r) => {
    const parts = [
      r.houseNo, r.moo && `ม.${r.moo}`, r.soi, r.road,
      r.subDistrict, r.district, r.province, r.postalCode,
    ].filter(Boolean);
    return parts.length ? parts.join(' ') : '—';
  };
  // ชื่อประเภทความพิการแบบสั้นไว้โชว์ในตารางตัวอย่าง ("ความพิการทางการมองเห็น" → "การมองเห็น")
  const shortDis = (n) => n.replace(/^ความพิการทาง/, '');

  // ส่งออกรายชื่อที่ค้น/กรองอยู่ — ทุกคน (ทุกหน้า ไม่ใช่แค่หน้าที่เห็น) เช่น กรอง "หญิง + ว่างงาน" แล้วเอาไฟล์ไปโทรติดตาม
  // บรรทัดแรกของไฟล์บอกว่ากรองอะไรไว้ เปิดทีหลังจะได้รู้ว่าเป็นรายชื่อกลุ่มไหน
  const handleExport = () => {
    const thaiDate = (iso) => { if (!iso) return ''; const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${+y + 543}`; };
    const ageOf = (iso) => {
      if (!iso) return '';
      const b = new Date(iso), t = new Date();
      return t.getFullYear() - b.getFullYear() - (t < new Date(t.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
    };
    const batchName = (id) => { const b = batches.find((x) => String(x.id) === String(id)); return b ? `รุ่นที่ ${b.batchNumber}/${b.year}` : ''; };
    const empName = (v) => (v === 'NONE' ? 'ยังไม่ติดตาม' : EMP[v]?.label || v);
    const filterName = {
      batch: batchName, gender: (v) => GENDER_LABELS[v] || v, province: (v) => v,
      dis: (v) => disabilityTypes.find((t) => String(t.id) === v)?.typeName || v, emp: empName,
    };
    const q = urlParams.get('q') || '';
    const used = [q && `ค้นหา "${q}"`, ...FILTERS.filter(({ key }) => filters[key]).map(({ key }) => filterName[key](filters[key]))].filter(Boolean);
    const header = ['#', 'ชื่อ-นามสกุล', 'ชื่อเล่น', 'เลขบัตรประชาชน', 'เพศ', 'วันเกิด', 'อายุ', 'จังหวัด', 'มือถือ', 'โทรศัพท์',
      'ระดับการศึกษา', 'ประเภทความพิการ', 'รุ่น', 'งานล่าสุด', 'ติดตามล่าสุดเมื่อ', 'สถานะ'];
    const rows = persons.map((p, i) => {
      const fu = p.followUps?.[0];
      return [i + 1, p.fullName, p.nickname || '', p.thaiId || '', GENDER_LABELS[p.gender] || '', thaiDate(p.birthDate), ageOf(p.birthDate),
        p.province || '', p.mobile || '', p.phone || '', p.educationLevel || '',
        (p.disabilityInfos || []).map((d) => d.disabilityType?.typeName).filter(Boolean).join(', '),
        batchName(p.batchId), fu ? empName(fu.employmentStatus) : 'ยังไม่ติดตาม', fu ? thaiDate(fu.followUpDate) : '',
        p.lifeStatus === 'DECEASED' ? 'เสียชีวิต' : ''];
    });
    const ws = XLSX.utils.aoa_to_sheet([
      [`รายชื่อคนพิการ — ${used.length ? `ตัวกรอง: ${used.join(' · ')}` : 'ทั้งหมด'} (${persons.length} คน)`],
      [`ส่งออกเมื่อ ${new Date().toLocaleString('th-TH')}`],
      [],
      header,
      ...rows,
    ]);
    ws['!cols'] = [4, 26, 10, 16, 6, 11, 5, 16, 12, 12, 24, 30, 13, 12, 14, 9].map((wch) => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อคนพิการ');
    // ชื่อไฟล์บอกตัวกรอง (ส่งออกหลายกลุ่มในวันเดียวจะได้แยกไฟล์ออก ไม่ทับกัน) — ตัดอักขระที่ใช้ในชื่อไฟล์ไม่ได้
    const tag = used.join('-').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').slice(0, 80);
    XLSX.writeFile(wb, `รายชื่อคนพิการ${tag ? `-${tag}` : ''}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('ส่งออก Excel แล้ว', `${persons.length} คน${used.length ? ` (${used.join(' · ')})` : ''}`);
  };
  const exportBtn = (cls, label = 'ส่งออก Excel') => (
    <button onClick={handleExport} disabled={persons.length === 0} title={`ส่งออกรายชื่อที่แสดงอยู่ทั้งหมด ${persons.length} คน (ทุกหน้า)`}
      className={`${cls} items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none`}>
      <Download size={14} /> {label} ({persons.length})
    </button>
  );

  const downloadTemplate = () => {
    const headers = [
      'ชื่อ-นามสกุล', 'ชื่อเล่น', 'เลขบัตรประชาชน', 'เพศ', 'วันเกิด',
      'เบอร์โทร', 'โทรศัพท์บ้าน', 'อีเมล',
      'เลขที่', 'หมู่ที่', 'อาคาร/หมู่บ้าน', 'ชั้นที่', 'ซอย', 'ถนน',
      'แขวง/ตำบล', 'เขต/อำเภอ', 'จังหวัด', 'รหัสไปรษณีย์', 'สถานที่ใกล้เคียง',
      'ระดับการศึกษา', 'รุ่นที่', 'ปี', 'หลักสูตร', 'ประเภทความพิการ',
    ];
    const example = [
      'นาย สมชาย ใจดี', 'ชาย', '1234567890123', 'ชาย', '15/05/2540',
      '0812345678', '021234567', 'somchai@email.com',
      '99/1', '5', 'หมู่บ้านสุขใจ', '2', 'ซอยประชาอุทิศ 10', 'ถนนประชาอุทิศ',
      'บางมด', 'ทุ่งครุ', 'กรุงเทพมหานคร', '10140', 'ใกล้ มจธ.',
      'ปริญญาตรี', '13', '2569', '', 'ความพิการทางการมองเห็น',
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'นำเข้าคนพิการ');
    // แถมชีตรายชื่อจังหวัดไว้ก็อปไปวาง — ถ้าชื่อไม่ตรงระบบจะไม่ยอมให้นำเข้า
    const wsProv = XLSX.utils.aoa_to_sheet([['จังหวัด (ใช้ชื่อตามนี้เท่านั้น)'], ...THAI_PROVINCES.map(p => [p])]);
    wsProv['!cols'] = [{ wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsProv, 'รายชื่อจังหวัด');
    // รุ่น + หลักสูตรที่มีในระบบตอนนี้ — "รุ่นที่/ปี/หลักสูตร" ต้องตรงกับชีตนี้ ไม่งั้นนำเข้าไม่ได้
    const batchRows = batches.flatMap((b) => (b.courses?.length ? b.courses.map((c) => [b.batchNumber, b.year, c.name]) : [[b.batchNumber, b.year, '(ยังไม่มีหลักสูตร — เว้นว่าง)']]));
    const wsBatch = XLSX.utils.aoa_to_sheet([['รุ่นที่', 'ปี', 'หลักสูตร (ใช้ชื่อตามนี้เท่านั้น)'], ...batchRows]);
    wsBatch['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsBatch, 'รุ่นและหลักสูตร');
    const wsDis = XLSX.utils.aoa_to_sheet([['ประเภทความพิการ (ใส่หลายประเภทคั่นด้วย , ได้)'], ...disabilityTypes.map((t) => [t.typeName])]);
    wsDis['!cols'] = [{ wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsDis, 'ประเภทความพิการ');
    // ใส่เลขเวอร์ชันในชื่อไฟล์ กันสับสนกับเทมเพลตเก่าที่ค้างอยู่ในเครื่อง
    XLSX.writeFile(wb, 'เทมเพลตนำเข้าคนพิการ-v3.xlsx');
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const mapped = json.map((row, idx) => ({
          __row: idx + 2,
          fullName: String(row['ชื่อ-นามสกุล'] || row['ชื่อ-สกุล'] || row['ชื่อ'] || '').trim(),
          nickname: String(row['ชื่อเล่น'] || '').trim(),
          thaiId: String(row['เลขบัตรประชาชน'] || row['เลขบัตร'] || '').trim(),
          gender: parseGender(row['เพศ']),
          birthDate: parseBirth(row['วันเกิด']),
          mobile: String(row['เบอร์โทร'] || row['เบอร์โทรศัพท์'] || row['มือถือ'] || '').trim(),
          phone: String(row['โทรศัพท์บ้าน'] || row['โทรศัพท์'] || '').trim(),
          email: String(row['อีเมล'] || row['EMAIL'] || row['email'] || '').trim(),
          // ที่อยู่ปัจจุบัน
          houseNo: String(row['เลขที่'] || row['บ้านเลขที่'] || '').trim(),
          moo: String(row['หมู่ที่'] || row['หมู่'] || '').trim(),
          building: String(row['อาคาร/หมู่บ้าน'] || row['ชื่ออาคาร / หมู่บ้าน'] || row['อาคาร'] || '').trim(),
          floor: String(row['ชั้นที่'] || row['ชั้น'] || '').trim(),
          soi: String(row['ซอย'] || '').trim(),
          road: String(row['ถนน'] || '').trim(),
          subDistrict: String(row['แขวง/ตำบล'] || row['แขวง / ตำบล'] || row['ตำบล'] || '').trim(),
          district: String(row['เขต/อำเภอ'] || row['เขต / อำเภอ'] || row['อำเภอ'] || '').trim(),
          ...(() => {
            // ตรวจจังหวัดตั้งแต่ตอนอ่านไฟล์ ชื่อย่อ/คำนำหน้าแก้ให้อัตโนมัติ ที่เหลือบล็อกไม่ให้นำเข้า
            const p = checkProvince(row['จังหวัด']);
            return { province: p.value, __prov: p };
          })(),
          postalCode: String(row['รหัสไปรษณีย์'] || '').replace(/\D/g, '').trim(),
          landmark: String(row['สถานที่ใกล้เคียง'] || '').trim(),
          educationLevel: String(row['ระดับการศึกษา'] || row['วุฒิการศึกษา'] || '').trim(),
          ...(() => {
            // รุ่น / หลักสูตร / ประเภทความพิการ — ไม่ตรงกับในระบบ = บล็อกไม่ให้นำเข้า (เหมือนจังหวัด)
            const b = matchBatch(row['รุ่นที่'] ?? row['รุ่น'], row['ปี'], batches);
            const c = matchCourse(row['หลักสูตร'], b);
            const d = matchDisabilities(row['ประเภทความพิการ'] ?? row['ความพิการ'], disabilityTypes);
            return { batchId: b.batchId, courseId: c.courseId, disabilityTypeIds: d.ids, __batch: b, __course: c, __dis: d };
          })(),
        })).filter(r => r.fullName);
        if (mapped.length === 0) return toast.error('ไม่พบข้อมูล', 'ไฟล์ไม่มีแถวที่มีชื่อ-นามสกุล หรือหัวคอลัมน์ไม่ตรงเทมเพลต');
        setImportRows(mapped);
      } catch {
        toast.error('อ่านไฟล์ไม่ได้', 'กรุณาใช้ไฟล์ Excel (.xlsx/.xls) ตามเทมเพลต');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // สรุปผลตรวจจังหวัดของไฟล์ที่เลือกไว้ ใช้ทั้งตอนโชว์และตอนกันไม่ให้กดนำเข้า
  const provFixed = importRows.filter(r => r.__prov?.status === 'fixed');
  const provEmpty = importRows.filter(r => r.__prov?.status === 'empty');
  const disFixed = importRows.filter(r => r.__dis?.status === 'fixed');
  const disEmpty = importRows.filter(r => r.__dis?.status === 'empty');
  const batchEmpty = importRows.filter(r => r.__batch?.status === 'empty');
  // ทุกช่องที่ไม่ตรงกับในระบบ — มีแม้แต่จุดเดียวก็กดนำเข้าไม่ได้
  const CHECKS = [['จังหวัด', '__prov', 'สะกดไม่ตรงกับชื่อจังหวัด — ดูชีต "รายชื่อจังหวัด"'], ['รุ่น', '__batch'], ['หลักสูตร', '__course'], ['ประเภทความพิการ', '__dis']];
  const importIssues = importRows.flatMap(r => CHECKS
    .filter(([, k]) => r[k]?.status === 'bad')
    .map(([label, k, fallback]) => ({ row: r.__row, fullName: r.fullName, label, typed: r[k].typed, reason: r[k].reason || fallback })));
  const badRowCount = new Set(importIssues.map(i => i.row)).size;
  const isBadRow = (r) => CHECKS.some(([, k]) => r[k]?.status === 'bad');

  const handleImport = async () => {
    if (importRows.length === 0 || importIssues.length > 0) return;
    setImporting(true);
    try {
      const res = await importPersons(importRows);
      const { created, failed, errors } = res.data;
      setImportModal(false);
      setImportRows([]);
      applyFilter();
      if (failed > 0) {
        toast.error(`นำเข้า ${created} สำเร็จ, ${failed} ไม่สำเร็จ`,
          errors.slice(0, 3).map(er => `แถว ${er.row}: ${er.error}`).join(' • ') + (errors.length > 3 ? ' …' : ''));
      } else {
        toast.success(`นำเข้าสำเร็จ ${created} รายการ!`);
      }
    } catch (err) {
      const bad = err.response?.data?.badProvinces;
      const refs = err.response?.data?.badRefs;
      if (bad?.length) {
        toast.error('จังหวัดไม่ถูกต้อง — ยังไม่ได้นำเข้าข้อมูลใดๆ',
          bad.slice(0, 3).map(b => `แถว ${b.row}: "${b.province}"`).join(' • ') + (bad.length > 3 ? ' …' : ''));
      } else if (refs?.length) {
        toast.error('ข้อมูลไม่ตรงกับในระบบ — ยังไม่ได้นำเข้าข้อมูลใดๆ',
          refs.slice(0, 3).map(b => `แถว ${b.row}: ${b.field}`).join(' • ') + (refs.length > 3 ? ' …' : '') + ' — ลองเปิดหน้านี้ใหม่แล้วเลือกไฟล์อีกครั้ง');
      } else {
        toast.error('นำเข้าไม่สำเร็จ', err.response?.data?.error || 'เกิดข้อผิดพลาด');
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    // จอคอม: ความสูงพอดีจอ ตารางเลื่อนข้างใน · มือถือ: เลื่อนทั้งหน้าตามปกติ
    <div className="flex flex-col md:h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Users size={22} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-black page-title leading-tight">ข้อมูลคนพิการ</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {/* กำลังค้น/กรองรุ่นอยู่ → บอกว่า "พบ" ไม่ใช่ "ในระบบ" (เดิมค้นเจอ 1 คน ขึ้นว่าในระบบมี 1 รายการ) */}
              {urlParams.get('q') || FILTERS.some(({ key }) => urlParams.get(key))
                ? <>ค้นพบ <span className="text-orange-600 font-bold">{persons.length}</span> รายการ</>
                : <><span className="text-orange-600 font-bold">{persons.length}</span> รายการในระบบ</>}
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            <button
              className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 active:scale-95 transition-all shadow-sm"
              onClick={() => { setImportRows([]); setImportModal(true); }}>
              <FileSpreadsheet size={16} /> นำเข้า Excel
            </button>
            <button
              className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 active:scale-95 transition-all shadow-sm"
              onClick={() => openModal()}>
              <Plus size={16} /> เพิ่มคนพิการ
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-orange-100 shadow-sm px-3 py-2.5 transition-all duration-200 focus-within:border-orange-400 focus-within:shadow-[0_0_0_3px_rgba(234,88,12,0.12)]">
          {/* Icon */}
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>
            <Search size={14} color="white" />
          </div>

          {/* Input */}
          <input
            type="text"
            placeholder="ค้นหาชื่อ ชื่อเล่น เลขบัตร หรือเบอร์โทร"
            aria-label="ค้นหาคนพิการ"
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-400 min-w-0 py-1.5"
            value={search}
            onChange={(e) => handleSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilter(search)}
          />

          {/* Clear */}
          {search && (
            <button onClick={() => { setSearch(''); applyFilter(''); }} title="ล้างคำค้น"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-all flex-shrink-0">
              <X size={14} /> ล้าง
            </button>
          )}
        </div>

        {/* ตัวกรองหลายเงื่อนไขพร้อมกัน (เดิมกรองได้แค่รุ่น) — ช่องที่เลือกอยู่เป็นสีส้ม
            มือถือพับเก็บเป็นปุ่มเดียว (กางเต็มกินที่ครึ่งจอ) · จอคอมโชว์ตลอด */}
        <div className="flex items-center gap-2 mt-3 md:hidden">
          <button onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold whitespace-nowrap border transition-all ${activeFilters ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-orange-200 bg-white text-gray-700'}`}>
            <SlidersHorizontal size={15} className="text-orange-500" /> ตัวกรอง{activeFilters > 0 && ` (${activeFilters})`}
            <ChevronDown size={14} className={`text-orange-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {activeFilters > 0 && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-2 py-2 rounded-xl text-xs font-bold whitespace-nowrap text-gray-600 hover:text-orange-700 hover:bg-orange-50 transition-all">
              <X size={14} /> ล้างตัวกรอง
            </button>
          )}
          {/* มือถือป้ายสั้น — ชื่อเต็ม 3 ปุ่มเบียดจนตัวหนังสือตกบรรทัด (จำนวนที่เลือกดูได้ที่ปุ่มตัวกรอง) */}
          {exportBtn('flex ml-auto', 'Excel')}
        </div>
        <div className={`${showFilters ? 'flex' : 'hidden'} md:flex flex-wrap items-center gap-2 mt-2 md:mt-3`}>
          <span className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <SlidersHorizontal size={13} className="text-orange-400" /> ตัวกรอง:
          </span>
          <div className="grid grid-cols-2 gap-2 w-full md:flex md:flex-wrap md:w-auto">
            <FilterSelect label="รุ่น" value={filters.batch} onChange={(v) => setFilter('batch', v)}
              options={[['', 'ทุกรุ่น'], ...batches.map((b) => [String(b.id), `รุ่นที่ ${b.batchNumber}/${b.year}`])]} />
            <FilterSelect label="เพศ" value={filters.gender} onChange={(v) => setFilter('gender', v)}
              options={[['', 'ทุกเพศ'], ['MALE', 'ชาย'], ['FEMALE', 'หญิง'], ['OTHER', 'อื่นๆ']]} />
            <FilterSelect label="จังหวัด" value={filters.province} onChange={(v) => setFilter('province', v)}
              options={[['', 'ทุกจังหวัด'], ...THAI_PROVINCES.map((p) => [p, p])]} />
            <FilterSelect label="ประเภทความพิการ" value={filters.dis} onChange={(v) => setFilter('dis', v)}
              options={[['', 'ทุกประเภทความพิการ'], ...disabilityTypes.map((t) => [String(t.id), t.typeName.replace(/^ความพิการทาง/, '')])]} />
            <FilterSelect label="งานล่าสุด" value={filters.emp} onChange={(v) => setFilter('emp', v)}
              options={[['', 'งานล่าสุด: ทั้งหมด'], ['EMPLOYED', 'มีงานทำ'], ['UNEMPLOYED', 'ว่างงาน'], ['STUDYING', 'ศึกษาต่อ'], ['NONE', 'ยังไม่ติดตาม']]} />
          </div>
          {activeFilters > 0 && (
            <button onClick={clearFilters}
              className="hidden md:flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-orange-700 hover:bg-orange-50 transition-all">
              <X size={14} /> ล้างตัวกรอง ({activeFilters})
            </button>
          )}
          {exportBtn('hidden md:flex md:ml-auto')}
        </div>
      </div>

      {/* Table */}
      <div className="md:flex-1 md:min-h-0 bg-white rounded-3xl border border-orange-100/80 shadow-sm overflow-hidden flex flex-col">
        {/* จอคอม = ตาราง · มือถือ = การ์ดทีละคน (เดิมตารางบีบจนชื่อขาด 3-4 บรรทัด ต้องเลื่อนซ้าย-ขวาหาปุ่ม) */}
        <div className="flex-1 overflow-auto hidden md:block">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                {['#','ชื่อ-นามสกุล','เลขบัตร','เพศ','จังหวัด','การศึกษา','รุ่น','งานล่าสุด','จัดการ'].map((h, i) => (
                  <th key={h} className={`px-3 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap ${i === 0 ? 'w-10' : ''} ${i === 8 ? 'text-center w-28 sticky right-0 bg-gray-50' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadError && (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm text-gray-400">โหลดข้อมูลไม่สำเร็จ</p>
                      <button onClick={() => load(search)} className="px-4 py-2 rounded-xl text-white text-sm font-bold"
                        style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>ลองใหม่</button>
                    </div>
                  </td>
                </tr>
              )}
              {!loadError && persons.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-3xl bg-orange-50 flex items-center justify-center">
                        <UserRound size={28} className="text-orange-200" />
                      </div>
                      <p className="text-sm font-medium">ไม่พบข้อมูล</p>
                    </div>
                  </td>
                </tr>
              )}
              {paged.map((p, i) => {
                const b = batches.find((x) => x.id === p.batchId);
                const fu = p.followUps?.[0];
                return (
                <tr key={p.id}
                  className="row-link group border-b border-gray-50" title="กดเพื่อดูรายละเอียด"
                  onClick={() => navigate(`/persons/${p.id}`)}>
                  <td className="px-3 py-3.5 text-gray-400 text-xs font-mono">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="row-link-name font-bold text-gray-800 text-sm leading-none whitespace-nowrap">
                          {p.fullName}{p.nickname && <span className="font-normal text-gray-500"> ({p.nickname})</span>}
                          {p.lifeStatus === 'DECEASED' && <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-300 align-middle">เสียชีวิต</span>}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5 truncate max-w-[220px]" title={p.disabilityInfos?.map((d) => d.disabilityType?.typeName).join(', ')}>{p.disabilityInfos?.[0]?.disabilityType?.typeName || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 font-mono text-xs text-gray-400">{p.thaiId || '—'}</td>
                  <td className="px-3 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${GENDER_BADGE[p.gender]}`}>
                      {GENDER_LABELS[p.gender]}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-gray-500 text-sm">{p.province || '—'}</td>
                  <td className="px-3 py-3.5 text-gray-400 text-xs max-w-[120px] truncate">{p.educationLevel || '—'}</td>
                  <td className="px-3 py-3.5 whitespace-nowrap">
                    {b
                      ? <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">{b.batchNumber}/{b.year}</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-3.5 whitespace-nowrap">
                    {fu
                      ? <span title={`ติดตามล่าสุด ${fmtShortDate(fu.followUpDate)}`} className={`px-2.5 py-1 rounded-full text-xs font-bold border ${EMP[fu.employmentStatus]?.cls || ''}`}>{EMP[fu.employmentStatus]?.label || fu.employmentStatus}</span>
                      : <span className="text-xs text-gray-400">ยังไม่ติดตาม</span>}
                  </td>
                  {/* ปุ่มจัดการติดขอบขวา — จอแคบเลื่อนตารางได้ แต่ปุ่มยังเห็นตลอด */}
                  <td className="px-3 py-3.5 sticky right-0 bg-white" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button className="w-7 h-7 rounded-xl flex items-center justify-center text-orange-400 group-hover:text-orange-600 hover:bg-orange-100 transition-all" title="ดูรายละเอียด" onClick={() => navigate(`/persons/${p.id}`)}>
                        <Eye size={14} />
                      </button>
                      {canEdit && <>
                        <button className="w-7 h-7 rounded-xl flex items-center justify-center text-amber-400 hover:bg-amber-50 hover:text-amber-600 transition-all" onClick={() => openModal(p)}>
                          <Pencil size={14} />
                        </button>
                        <button className="w-7 h-7 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-all" onClick={() => handleDelete(p.id)}>
                          <Trash2 size={14} />
                        </button>
                      </>}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-100">
          {loadError && (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 mb-3">โหลดข้อมูลไม่สำเร็จ</p>
              <button onClick={() => load(search)} className="px-4 py-2 rounded-xl text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>ลองใหม่</button>
            </div>
          )}
          {!loadError && persons.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
              <div className="w-16 h-16 rounded-3xl bg-orange-50 flex items-center justify-center">
                <UserRound size={28} className="text-orange-200" />
              </div>
              <p className="text-sm font-medium">ไม่พบข้อมูล</p>
            </div>
          )}
          {paged.map((p) => {
            const b = batches.find((x) => x.id === p.batchId);
            return (
              <div key={p.id} className="p-4 active:bg-orange-50/50" onClick={() => navigate(`/persons/${p.id}`)}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-[15px] leading-snug">
                      {p.fullName}{p.nickname && <span className="font-normal text-gray-500"> ({p.nickname})</span>}
                    </p>
                    {p.disabilityInfos?.[0] && (
                      <p className="text-gray-500 text-xs mt-0.5">{p.disabilityInfos.map((d) => d.disabilityType?.typeName).join(', ')}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${GENDER_BADGE[p.gender]}`}>{GENDER_LABELS[p.gender]}</span>
                      {p.province && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">{p.province}</span>}
                      {b && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">รุ่น {b.batchNumber}/{b.year}</span>}
                      {p.followUps?.[0] && <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${EMP[p.followUps[0].employmentStatus]?.cls || ''}`}>{EMP[p.followUps[0].employmentStatus]?.label}</span>}
                      {p.lifeStatus === 'DECEASED' && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-300">เสียชีวิต</span>}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex flex-col gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button title="แก้ไข" className="w-10 h-10 rounded-xl flex items-center justify-center text-amber-600 bg-amber-50 border border-amber-100 active:scale-95" onClick={() => openModal(p)}>
                        <Pencil size={16} />
                      </button>
                      <button title="ลบ" className="w-10 h-10 rounded-xl flex items-center justify-center text-red-500 bg-red-50 border border-red-100 active:scale-95" onClick={() => handleDelete(p.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-50 flex-shrink-0">
            <span className="text-xs text-gray-400">
              หน้า <span className="font-bold text-orange-600">{page}</span> / {totalPages}
              <span className="ml-1.5 text-gray-400">· {persons.length} รายการ</span>
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 rounded-xl text-sm font-bold border border-gray-100 text-gray-400 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all">←</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce((acc, n, idx, arr) => { if (idx > 0 && n - arr[idx-1] > 1) acc.push('…'); acc.push(n); return acc; }, [])
                .map((n, idx) => n === '…'
                  ? <span key={`e-${idx}`} className="px-1 text-gray-400 text-xs">…</span>
                  : <button key={n} onClick={() => setPage(n)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${page === n ? 'text-white shadow-sm' : 'border border-gray-100 text-gray-400 hover:bg-orange-50 hover:text-orange-600'}`}
                      style={page === n ? { background: 'linear-gradient(135deg,#ea580c,#c2410c)' } : {}}>{n}</button>
                )}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-8 h-8 rounded-xl text-sm font-bold border border-gray-100 text-gray-400 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all">→</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <dialog ref={modalRef} className="modal" onCancel={(e) => { e.preventDefault(); requestClose(); }}>
        <div className="modal-box max-w-3xl p-0 overflow-hidden bg-white shadow-2xl rounded-3xl">
          {/* Header */}
          <div className="relative px-6 py-5 flex items-center gap-4 overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#1c0a00 0%,#7c2d12 60%,#ea580c 100%)' }}>
            <div className="absolute inset-0 opacity-5"
              style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
            <div className="relative w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
              <UserRound size={20} color="#fff" />
            </div>
            <div className="relative">
              <h3 className="text-white font-black text-base leading-tight">{editId ? 'แก้ไขข้อมูลคนพิการ' : 'เพิ่มข้อมูลคนพิการใหม่'}</h3>
              <p className="text-orange-200/60 text-xs mt-0.5">กรอกข้อมูลให้ครบถ้วนตามแบบฟอร์ม กกจ.พก.1</p>
            </div>
          </div>
          {/* Body */}
          <div ref={formBodyRef} className="p-6 max-h-[70vh] overflow-y-auto space-y-6">

            {/* Error Summary */}
            {Object.keys(errors).length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-bold text-red-600 mb-1.5">กรุณากรอกข้อมูลที่ยังขาดอยู่ ({Object.keys(errors).length} รายการ)</p>
                <ul className="space-y-0.5">
                  {Object.values(errors).map((msg, i) => (
                    <li key={i} className="text-sm text-red-500 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      {msg}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* รูปถ่าย */}
            <Section label="รูปถ่าย 1 นิ้ว">
              <div className="flex items-center gap-5">
                <div
                  className="w-24 h-28 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-orange-500 transition-colors flex-shrink-0"
                  onClick={() => photoInputRef.current?.click()}>
                  {photoBase64
                    ? <img src={photoBase64} alt="รูปถ่าย" className="w-full h-full object-cover" />
                    : <>
                        <Camera size={24} className="text-orange-300 mb-1" />
                        <span className="text-xs text-orange-400 text-center leading-tight">คลิกเพื่อ<br/>อัปโหลดรูป</span>
                      </>
                  }
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl border border-orange-300 text-orange-600 text-sm font-semibold hover:bg-orange-50 transition-colors">
                    เลือกรูปภาพ
                  </button>
                  {photoBase64 && (
                    <button
                      type="button"
                      onClick={() => { setPhotoBase64(''); if (photoInputRef.current) photoInputRef.current.value = ''; }}
                      className="px-4 py-2 rounded-xl border border-red-200 text-red-400 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center gap-1">
                      <X size={13} /> ลบรูป
                    </button>
                  )}
                  <p className="text-xs text-gray-400">JPG/PNG/WebP ไม่เกิน 20MB</p>
                  <p className="text-xs text-gray-400">ระบบย่อรูปให้อัตโนมัติ</p>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
            </Section>

            {/* ส่วนที่ 1: ข้อมูลส่วนตัว */}
            <Section label="ข้อมูลส่วนตัว">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                    ชื่อ-นามสกุล <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-shrink-0">
                      <select
                        className="appearance-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all cursor-pointer pr-7"
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value)}
                      >
                        <option value="">ไม่ระบุ</option>
                        {PREFIXES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    <input
                      type="text"
                      placeholder="ชื่อ นามสกุล"
                      className={`flex-1 rounded-xl border px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 transition-all ${errors.nameOnly ? 'border-red-400 bg-red-50 focus:ring-red-300/40' : 'border-gray-200 focus:ring-orange-400/40 focus:border-orange-400'}`}
                      value={nameOnly}
                      onChange={(e) => { setNameOnly(e.target.value); if (errors.nameOnly) setErrors(p => ({...p, nameOnly: ''})); }}
                    />
                  </div>
                  {errors.nameOnly && <p className="text-xs text-red-500 mt-1">{errors.nameOnly}</p>}
                </div>
                <FormField label="ชื่อเล่น" value={form.nickname} onChange={(v) => setForm({ ...form, nickname: v })} />
                <FormField label="เลขบัตรประชาชน / บัตรคนพิการ" required value={form.thaiId} error={errors.thaiId}
                  onChange={(v) => { setForm({ ...form, thaiId: v }); if (errors.thaiId) setErrors(p => ({...p, thaiId: ''})); }} numericOnly maxLength={13} />
                <ThaiDateField key={formNonce} label="วันเกิด" required value={form.birthDate} error={errors.birthDate}
                  onChange={(v) => { setForm({ ...form, birthDate: v }); if (errors.birthDate) setErrors(p => ({...p, birthDate: ''})); }} />
                <SelectField label="เพศ" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })}
                  options={[['MALE','ชาย'],['FEMALE','หญิง'],['OTHER','อื่นๆ']]} />
                <MaritalField value={form.maritalStatus} onChange={(v) => setForm({ ...form, maritalStatus: v })} />
                <FormField label="สัญชาติ" value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} />
                <FormField label="ศาสนา" value={form.religion} onChange={(v) => setForm({ ...form, religion: v })} />
                <div className="col-span-2">
                  <EducationField required value={form.educationLevel} error={errors.educationLevel}
                    onChange={(v) => { setForm({ ...form, educationLevel: v }); if (errors.educationLevel) setErrors(p => ({...p, educationLevel: ''})); }} />
                </div>
                <SelectField label="สถานะ" value={form.lifeStatus} onChange={(v) => setForm({ ...form, lifeStatus: v })}
                  options={[['ALIVE','มีชีวิต'],['DECEASED','เสียชีวิต']]} />

                {/* รุ่นที่เข้าร่วม */}
                <SelectField label="รุ่นที่เข้าร่วม" required error={errors.batchId}
                  value={String(form.batchId || '')}
                  onChange={(v) => { setForm({ ...form, batchId: v, courseId: '' }); if (errors.batchId) setErrors(p => ({...p, batchId: ''})); }}
                  options={[['', '— เลือกรุ่น —'], ...batches.map(b => [String(b.id), `รุ่นที่ ${b.batchNumber} ปี ${b.year}`])]} />

                {/* หลักสูตร (ตามรุ่นที่เลือก) */}
                <SelectField label="หลักสูตร"
                  value={String(form.courseId || '')}
                  onChange={(v) => setForm({ ...form, courseId: v })}
                  options={[
                    ['', form.batchId ? '— เลือกหลักสูตร —' : '— เลือกรุ่นก่อน —'],
                    ...((batches.find(b => String(b.id) === String(form.batchId))?.courses) || []).map(c => [String(c.id), c.name]),
                  ]} />

                {/* ประเภทความพิการ */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                    ประเภทความพิการ {!editId && <span className="text-red-400">*</span>}
                  </label>
                  {editPersonDisabilities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editPersonDisabilities.map((d) => {
                        const removed = removedDisabilityIds.includes(d.id);
                        return (
                          <div key={d.id} className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border ${removed ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                            <span className={removed ? 'line-through' : ''}>{d.disabilityType?.typeName}</span>
                            {removed ? (
                              <button type="button" title="ยกเลิกการลบ" className="text-orange-500 hover:text-orange-700 transition-colors ml-1 underline"
                                onClick={() => setRemovedDisabilityIds(prev => prev.filter(x => x !== d.id))}>
                                คืน
                              </button>
                            ) : (
                              <button type="button" title="ลบ (มีผลเมื่อกดบันทึก)" className="text-red-400 hover:text-red-600 transition-colors ml-1"
                                onClick={() => setRemovedDisabilityIds(prev => [...prev, d.id])}>
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {removedDisabilityIds.length > 0 && (
                    <p className="text-xs text-gray-400 mb-2">รายการที่ขีดฆ่าจะถูกลบเมื่อกด "บันทึกข้อมูล" — กด "ยกเลิก" ถ้าไม่ต้องการลบ</p>
                  )}
                  <div className="relative">
                    <select
                      className={`w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 transition-all cursor-pointer pr-9 ${errors.disability ? 'border-red-400 bg-red-50 focus:ring-red-300/40' : 'border-gray-200 focus:ring-orange-400/40 focus:border-orange-400'}`}
                      value={disabilityTypeId}
                      onChange={(e) => { setDisabilityTypeId(e.target.value); if (errors.disability) setErrors(p => ({...p, disability: ''})); }}
                    >
                      <option value="">— {editId ? 'เพิ่มประเภทความพิการ' : 'เลือกประเภทความพิการ'} —</option>
                      {availableDisabilityTypes.map((t) => (
                        <option key={t.id} value={String(t.id)}>{t.typeName}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {errors.disability && <p className="text-xs text-red-500 mt-1">{errors.disability}</p>}
                </div>
              </div>
            </Section>

            {/* ส่วนที่ 2: ที่อยู่ปัจจุบัน */}
            <Section label="ที่อยู่ปัจจุบัน">
              <div className="grid grid-cols-4 gap-3">
                <FormField label="เลขที่" value={form.houseNo} onChange={(v) => setForm({ ...form, houseNo: v })} />
                <FormField label="หมู่ที่" value={form.moo} onChange={(v) => setForm({ ...form, moo: v })} />
                <div className="col-span-2">
                  <FormField label="ชื่ออาคาร / หมู่บ้าน" value={form.building} onChange={(v) => setForm({ ...form, building: v })} />
                </div>
                <FormField label="ชั้นที่" value={form.floor} onChange={(v) => setForm({ ...form, floor: v })} />
                <div className="col-span-2">
                  <FormField label="ซอย" value={form.soi} onChange={(v) => setForm({ ...form, soi: v })} />
                </div>
                <div className="col-span-1">
                  <FormField label="ถนน" value={form.road} onChange={(v) => setForm({ ...form, road: v })} />
                </div>
                <div className="col-span-2">
                  <FormField label="แขวง / ตำบล" value={form.subDistrict} onChange={(v) => setForm({ ...form, subDistrict: v })} />
                </div>
                <div className="col-span-2">
                  <FormField label="เขต / อำเภอ" value={form.district} onChange={(v) => setForm({ ...form, district: v })} />
                </div>
                <div className="col-span-2">
                  <SelectField label="จังหวัด" required value={form.province} error={errors.province}
                    onChange={(v) => { setForm({ ...form, province: v }); if (errors.province) setErrors(p => ({...p, province: ''})); }}
                    options={[
                      ['', '— เลือกจังหวัด —'],
                      ...(form.province && !THAI_PROVINCES.includes(form.province) ? [[form.province, `${form.province} (เดิม)`]] : []),
                      ...THAI_PROVINCES.map(pv => [pv, pv]),
                    ]} />
                </div>
                <div className="col-span-2">
                  <FormField label="รหัสไปรษณีย์" value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} numericOnly maxLength={5} />
                </div>
              </div>
            </Section>

            {/* ส่วนที่ 3: ข้อมูลติดต่อ */}
            <Section label="ข้อมูลติดต่อ">
              {errors.contact && (
                <p className="text-xs text-red-500 -mt-2 mb-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> {errors.contact}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="โทรศัพท์บ้าน" value={form.phone} error={errors.contact && !form.phone && !form.mobile ? ' ' : ''}
                  onChange={(v) => { setForm({ ...form, phone: v }); if (errors.contact) setErrors(p => ({...p, contact: ''})); }} numericOnly maxLength={10} />
                <FormField label="มือถือ" required value={form.mobile} error={errors.contact && !form.phone && !form.mobile ? ' ' : ''}
                  onChange={(v) => { setForm({ ...form, mobile: v }); if (errors.contact) setErrors(p => ({...p, contact: ''})); }} numericOnly maxLength={10} />
                <FormField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                <FormField label="สถานที่ใกล้เคียง" value={form.landmark} onChange={(v) => setForm({ ...form, landmark: v })} />
              </div>
            </Section>
          </div>
          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
            {guard.asking ? <DiscardBar guard={guard} /> : (<>
              <button
                className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-gray-500 hover:bg-gray-200 transition-all active:scale-95"
                onClick={requestClose}>ยกเลิก</button>
              <button
                className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)', boxShadow: '0 4px 15px rgba(234,88,12,0.3)' }}
                onClick={handleSave}>บันทึกข้อมูล</button>
            </>)}
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button type="button" onClick={requestClose}>close</button></form>
      </dialog>

      {/* Import Excel Modal */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-green-600" /> นำเข้าข้อมูลจาก Excel
              </h2>
              <button onClick={() => setImportModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="px-6 py-5 overflow-y-auto">
              {/* Step 1: template */}
              <div className="flex items-start gap-3 mb-4 p-3 rounded-xl bg-orange-50 border border-orange-100">
                <div className="w-7 h-7 rounded-full bg-orange-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">1</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-700">ดาวน์โหลดเทมเพลต แล้วกรอกข้อมูล</p>
                  <p className="text-xs text-gray-500 mt-0.5">คอลัมน์: ชื่อ-นามสกุล*, ชื่อเล่น, เลขบัตรประชาชน, เพศ, วันเกิด (วว/ดด/ปปปป พ.ศ.), เบอร์โทร, โทรศัพท์บ้าน, อีเมล, ที่อยู่ (เลขที่, หมู่ที่, อาคาร/หมู่บ้าน, ชั้นที่, ซอย, ถนน, แขวง/ตำบล, เขต/อำเภอ, จังหวัด, รหัสไปรษณีย์, สถานที่ใกล้เคียง), ระดับการศึกษา, รุ่นที่, ปี, หลักสูตร, ประเภทความพิการ</p>
                  <p className="text-xs text-red-500 mt-1 font-semibold">ช่อง &quot;จังหวัด&quot; &quot;รุ่นที่/ปี&quot; &quot;หลักสูตร&quot; &quot;ประเภทความพิการ&quot; ต้องตรงกับในระบบ — ดูรายชื่อได้ในชีตของเทมเพลต ถ้ามีแถวไหนไม่ตรงจะนำเข้าไม่ได้ทั้งไฟล์</p>
                  <p className="text-xs text-gray-400 mt-0.5">สร้างรุ่นและหลักสูตรที่หน้า &quot;จัดการรุ่น&quot; ให้ครบก่อน แล้วค่อยดาวน์โหลดเทมเพลต (ชีต &quot;รุ่นและหลักสูตร&quot; จะมีรายการล่าสุด)</p>
                  <button onClick={downloadTemplate}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-orange-600 bg-white border border-orange-200 hover:bg-orange-50">
                    <Download size={13} /> ดาวน์โหลดเทมเพลต
                  </button>
                </div>
              </div>

              {/* Step 2: upload */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-7 h-7 rounded-full bg-orange-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">2</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-700 mb-2">เลือกไฟล์ Excel ที่กรอกแล้ว</p>
                  <input ref={importInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile} className="hidden" />
                  <button onClick={() => importInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all">
                    <Upload size={15} /> เลือกไฟล์
                  </button>
                </div>
              </div>

              {/* ผลตรวจ จังหวัด/รุ่น/หลักสูตร/ประเภทความพิการ — ไม่ตรงจุดเดียวก็กดนำเข้าไม่ได้จนกว่าจะแก้ไฟล์ */}
              {importIssues.length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm font-bold text-red-700 flex items-center gap-1.5">
                    <X size={15} /> นำเข้าไม่ได้ — มี {badRowCount} แถวที่ข้อมูลไม่ตรงกับในระบบ
                  </p>
                  <p className="text-xs text-red-500 mt-1 mb-2">
                    แก้ในไฟล์ Excel ตามที่บอกด้านล่าง (หรือสร้างรุ่น/หลักสูตรที่หน้า &quot;จัดการรุ่น&quot; ให้ครบ) แล้วเลือกไฟล์ใหม่อีกครั้ง — ยังไม่มีข้อมูลไหนถูกนำเข้า
                  </p>
                  <div className="bg-white rounded-lg border border-red-100 overflow-auto" style={{ maxHeight: '160px' }}>
                    <table className="w-full text-xs">
                      <tbody>
                        {importIssues.slice(0, 30).map((it, i) => (
                          <tr key={i} className="border-b border-red-50 last:border-0 align-top">
                            <td className="px-2 py-1.5 text-gray-400 whitespace-nowrap">แถว {it.row}</td>
                            <td className="px-2 py-1.5 text-gray-600 truncate max-w-[140px]">{it.fullName}</td>
                            <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{it.label}</td>
                            <td className="px-2 py-1.5 text-red-600 font-semibold whitespace-nowrap">&quot;{it.typed}&quot;</td>
                            <td className="px-2 py-1.5 text-red-500">{it.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importIssues.length > 30 && <p className="text-xs text-red-400 mt-1">แสดง 30 จุดแรก จากทั้งหมด {importIssues.length} จุด</p>}
                </div>
              )}

              {importRows.length > 0 && importIssues.length === 0 && (provFixed.length > 0 || provEmpty.length > 0 || disFixed.length > 0 || disEmpty.length > 0 || batchEmpty.length > 0) && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                  {provFixed.length > 0 && (
                    <p className="text-xs text-amber-700">
                      <b>แก้ชื่อจังหวัดให้อัตโนมัติ {provFixed.length} แถว</b> — เช่น แถว {provFixed[0].__row}: &quot;{provFixed[0].__prov.typed}&quot; → &quot;{provFixed[0].province}&quot;
                    </p>
                  )}
                  {disFixed.length > 0 && (
                    <p className="text-xs text-amber-700">
                      <b>จับคู่ประเภทความพิการให้อัตโนมัติ {disFixed.length} แถว</b> — เช่น แถว {disFixed[0].__row}: &quot;{disFixed[0].__dis.typed}&quot; → &quot;{disFixed[0].__dis.names.join(', ')}&quot;
                    </p>
                  )}
                  {provEmpty.length > 0 && (
                    <p className="text-xs text-amber-700">
                      <b>ไม่ได้กรอกจังหวัด {provEmpty.length} แถว</b> — นำเข้าได้ แต่จะไปอยู่กลุ่ม &quot;ไม่ระบุ&quot; ในกราฟภูมิภาค
                    </p>
                  )}
                  {batchEmpty.length > 0 && (
                    <p className="text-xs text-amber-700">
                      <b>ไม่ได้ใส่รุ่น {batchEmpty.length} แถว</b> — นำเข้าได้ แต่จะไม่อยู่ในรุ่นไหน และไม่มีแจ้งเตือนติดตามผล
                    </p>
                  )}
                  {disEmpty.length > 0 && (
                    <p className="text-xs text-amber-700">
                      <b>ไม่ได้ใส่ประเภทความพิการ {disEmpty.length} แถว</b> — นำเข้าได้ แต่ต้องมาใส่ทีหลังทีละคน
                    </p>
                  )}
                </div>
              )}

              {/* Preview */}
              {importRows.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-bold text-gray-700 mb-2">ตัวอย่างข้อมูล ({importRows.length} รายการ)</p>
                  <div className="border border-gray-200 rounded-xl overflow-auto" style={{ maxHeight: '260px' }}>
                    <table className="w-full text-xs" style={{ minWidth: "1080px" }}>
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="text-gray-500 whitespace-nowrap">
                          <th className="px-2 py-2 text-left">#</th>
                          <th className="px-2 py-2 text-left">ชื่อ-นามสกุล</th>
                          <th className="px-2 py-2 text-left">รุ่น</th>
                          <th className="px-2 py-2 text-left">หลักสูตร</th>
                          <th className="px-2 py-2 text-left">ประเภทความพิการ</th>
                          <th className="px-2 py-2 text-left">ชื่อเล่น</th>
                          <th className="px-2 py-2 text-left">เลขบัตร</th>
                          <th className="px-2 py-2 text-center">เพศ</th>
                          <th className="px-2 py-2 text-left">วันเกิด</th>
                          <th className="px-2 py-2 text-left">ที่อยู่</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 50).map((r, i) => (
                          <tr key={i} className={`border-t border-gray-100 ${isBadRow(r) ? 'bg-red-50' : ''}`}>
                            <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                            <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">{r.fullName}</td>
                            <td className={`px-2 py-1.5 whitespace-nowrap ${r.__batch?.status === 'bad' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                              {r.__batch?.status === 'ok' ? `${r.__batch.batch.batchNumber}/${r.__batch.batch.year}` : (r.__batch?.typed || '—')}
                            </td>
                            <td className={`px-2 py-1.5 max-w-[140px] truncate ${r.__course?.status === 'bad' ? 'text-red-600 font-semibold' : 'text-gray-500'}`} title={r.__course?.name || r.__course?.typed}>
                              {r.__course?.name || r.__course?.typed || '—'}
                            </td>
                            <td className={`px-2 py-1.5 max-w-[180px] truncate ${r.__dis?.status === 'bad' ? 'text-red-600 font-semibold' : 'text-gray-500'}`} title={r.__dis?.names?.join(', ') || r.__dis?.typed}>
                              {r.__dis?.names?.length ? r.__dis.names.map(shortDis).join(', ') : (r.__dis?.typed || '—')}
                            </td>
                            <td className="px-2 py-1.5 text-gray-500">{r.nickname}</td>
                            <td className="px-2 py-1.5 text-gray-500 font-mono">{r.thaiId}</td>
                            <td className="px-2 py-1.5 text-center text-gray-500">{r.gender === 'FEMALE' ? 'หญิง' : r.gender === 'OTHER' ? 'อื่นๆ' : 'ชาย'}</td>
                            <td className={`px-2 py-1.5 ${r.birthDate ? 'text-gray-500' : 'text-red-400'}`}>{showBirth(r.birthDate)}</td>
                            <td className={`px-2 py-1.5 max-w-[220px] truncate ${r.__prov?.status === 'bad' ? 'text-red-600 font-semibold' : 'text-gray-500'}`} title={showAddress(r)}>{showAddress(r)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importRows.length > 50 && <p className="text-xs text-gray-400 mt-1">แสดง 50 แถวแรก จากทั้งหมด {importRows.length} แถว</p>}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end flex-shrink-0">
              <button onClick={() => setImportModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">ยกเลิก</button>
              <button onClick={handleImport} disabled={importRows.length === 0 || importing || importIssues.length > 0}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:cursor-not-allowed ${importIssues.length > 0 ? 'bg-gray-200 text-gray-500' : 'text-white bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-50'}`}>
                {importing ? 'กำลังนำเข้า...'
                  : importIssues.length > 0 ? `แก้ไฟล์ก่อน (${badRowCount} แถว)`
                  : `นำเข้า ${importRows.length} รายการ`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ช่องตัวกรองเหนือรายชื่อ — เลือกค่าอยู่ = สีส้ม ให้เห็นว่ากำลังกรองอะไร
function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="relative min-w-0">
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none text-sm font-semibold rounded-xl border pl-3 pr-8 py-2 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 truncate
          ${value ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-orange-200 bg-white text-gray-700 hover:border-orange-300'}`}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none" />
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full bg-orange-500" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      </div>
      {children}
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', maxLength, numericOnly, required, error }) {
  const safeVal = value ?? '';
  const hasError = error && error.trim() !== '';
  const handleChange = (e) => {
    let v = e.target.value;
    if (numericOnly) v = v.replace(/\D/g, '');
    if (maxLength) v = v.slice(0, maxLength);
    onChange(v);
  };
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {maxLength && <span className="ml-1 font-normal text-gray-400">({safeVal.length}/{maxLength})</span>}
      </label>
      <input
        type={type}
        inputMode={numericOnly ? 'numeric' : undefined}
        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 transition-all ${hasError ? 'border-red-400 bg-red-50 focus:ring-red-300/40' : 'border-gray-200 focus:ring-orange-400/40 focus:border-orange-400'}`}
        value={safeVal}
        onChange={handleChange}
      />
      {hasError && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, required, error }) {
  const hasError = error && error.trim() !== '';
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          className={`w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 transition-all cursor-pointer pr-9 ${hasError ? 'border-red-400 bg-red-50 focus:ring-red-300/40' : 'border-gray-200 focus:ring-orange-400/40 focus:border-orange-400'}`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      {hasError && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function EducationField({ value = '', onChange, required, error }) {
  const hasError = error && error.trim() !== '';
  const isOther = value && !EDUCATION_OPTS.slice(0, -1).includes(value);
  const selectVal = isOther ? 'อื่นๆ' : (value || '');
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
        ระดับการศึกษา{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative mb-2">
        <select
          className={`w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 transition-all cursor-pointer pr-9 ${hasError ? 'border-red-400 bg-red-50 focus:ring-red-300/40' : 'border-gray-200 focus:ring-orange-400/40 focus:border-orange-400'}`}
          value={selectVal}
          onChange={(e) => onChange(e.target.value === 'อื่นๆ' ? 'อื่นๆ' : e.target.value)}
        >
          <option value="">— เลือกระดับการศึกษา —</option>
          {EDUCATION_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      {selectVal === 'อื่นๆ' && (
        <input
          type="text"
          placeholder="ระบุระดับการศึกษา..."
          className="w-full rounded-xl border border-orange-300 px-3.5 py-2.5 text-sm text-gray-800 bg-orange-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all"
          value={isOther ? value : ''}
          onChange={(e) => onChange(e.target.value || 'อื่นๆ')}
        />
      )}
      {hasError && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function ThaiDateField({ label, value = '', onChange, required, error }) {
  const hasError = error && error.trim() !== '';
  // วันเกิด → ต้องเป็นวันที่ผ่านมาแล้ว (เดิมพิมพ์ปีผิดแล้วช่องโดนล้างเงียบๆ ไม่บอกเหตุผล)
  const { display, onInput, msg } = useThaiDate(value, onChange, { pastOnly: true });
  const shownError = hasError ? error : msg?.type === 'error' ? msg.text : '';
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input type="text" inputMode="numeric" placeholder="วว/ดด/ปปปป (พ.ศ.) เช่น 15/05/2540" maxLength={10}
        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 transition-all ${shownError ? 'border-red-400 bg-red-50 focus:ring-red-300/40' : 'border-gray-200 focus:ring-orange-400/40 focus:border-orange-400'}`}
        value={display} onChange={onInput} />
      {shownError
        ? <p className="text-xs text-red-500 mt-1">{shownError}</p>
        : msg && <p className="text-xs text-gray-400 mt-1">{msg.text}</p>}
    </div>
  );
}

const MARITAL_OPTS = ['SINGLE', 'MARRIED', 'OTHER'];
function MaritalField({ value, onChange }) {
  const isCustom = value && !MARITAL_OPTS.includes(value);
  const selectVal = isCustom ? 'OTHER' : (value || 'SINGLE');

  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">สถานภาพ</label>
      <div className="relative mb-2">
        <select
          className="w-full appearance-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all cursor-pointer pr-9"
          value={selectVal}
          onChange={(e) => onChange(e.target.value === 'OTHER' ? 'OTHER' : e.target.value)}
        >
          <option value="SINGLE">โสด</option>
          <option value="MARRIED">สมรส</option>
          <option value="OTHER">อื่นๆ (ระบุ)</option>
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      {selectVal === 'OTHER' && (
        <input
          type="text"
          placeholder="ระบุสถานภาพ เช่น หย่าร้าง, หม้าย..."
          className="w-full rounded-xl border border-orange-300 px-3.5 py-2.5 text-sm text-gray-800 bg-orange-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all"
          value={isCustom ? value : ''}
          onChange={(e) => onChange(e.target.value || 'OTHER')}
        />
      )}
    </div>
  );
}
