import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Search, Plus, Eye, Pencil, Trash2, UserRound, ChevronDown, Users, Camera, X, Layers, FileSpreadsheet, Download, Upload } from 'lucide-react';
import { getPersons, createPerson, importPersons, updatePerson, deletePerson, getDisabilityTypes, createDisabilityInfo, deleteDisabilityInfo, getPersonPhotos, uploadPersonPhoto, getBatches } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const GENDER_LABELS = { MALE: 'ชาย', FEMALE: 'หญิง', OTHER: 'อื่นๆ' };
const GENDER_BADGE = { MALE: 'bg-sky-100 text-sky-600 border-sky-200', FEMALE: 'bg-pink-100 text-pink-500 border-pink-200', OTHER: 'bg-gray-100 text-gray-500 border-gray-200' };

const PREFIXES = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง'];

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

// 77 จังหวัดของไทย (สำหรับ dropdown เลือกจังหวัด)
const THAI_PROVINCES = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา',
  'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก',
  'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ',
  'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา',
  'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร',
  'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย',
  'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี',
  'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง',
  'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี',
];

const splitPrefix = (fullName = '') => {
  for (const p of PREFIXES) {
    if (fullName.startsWith(p)) return { prefix: p, nameOnly: fullName.slice(p.length).trim() };
  }
  return { prefix: '', nameOnly: fullName };
};

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
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [page, setPage] = useState(1);
  const [disabilityTypes, setDisabilityTypes] = useState([]);
  const [disabilityTypeId, setDisabilityTypeId] = useState('');
  const [editPersonDisabilities, setEditPersonDisabilities] = useState([]);
  const [prefix, setPrefix] = useState('นาย');
  const [nameOnly, setNameOnly] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  const photoInputRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState(false);
  const formBodyRef = useRef(null);
  const [batches, setBatches] = useState([]);
  const [batchFilter, setBatchFilter] = useState('');
  const [importModal, setImportModal] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(persons.length / PAGE_SIZE);
  const paged = persons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const load = (q = '', b = batchFilter) => {
    setLoadError(false);
    const params = {};
    if (q) params.search = q;
    if (b) params.batchId = b;
    return getPersons(params)
      .then((r) => { setPersons(r.data); setPage(1); })
      .catch(() => setLoadError(true));
  };
  const handleBatchFilter = (b) => {
    setBatchFilter(b);
    load(search, b);
  };
  useEffect(() => {
    load();
    getDisabilityTypes().then((r) => setDisabilityTypes(r.data)).catch(() => {});
    getBatches().then((r) => setBatches(r.data)).catch(() => {});
  }, []);

  const openModal = (person = null) => {
    setPhotoBase64('');
    if (person) {
      const { prefix: p, nameOnly: n } = splitPrefix(person.fullName || '');
      // แปลง null → '' ทุก field ก่อน spread เพื่อป้องกัน controlled input error
      const cleaned = Object.fromEntries(Object.entries(person).map(([k, v]) => [k, v === null ? '' : v]));
      setForm({ ...emptyForm, ...cleaned, birthDate: person.birthDate?.slice(0, 10) || '' });
      setPrefix(p || 'นาย');
      setNameOnly(n);
      setEditId(person.id);
      setEditPersonDisabilities(person.disabilityInfos || []);
      // โหลดรูปเดิม
      getPersonPhotos(person.id).then(r => {
        const profile = r.data.find(p => p.photoType === 'profile');
        if (profile?.filePath) setPhotoBase64(profile.filePath);
      }).catch(() => {});
    } else {
      setForm(emptyForm);
      setPrefix('นาย');
      setNameOnly('');
      setEditId(null);
      setEditPersonDisabilities([]);
    }
    setDisabilityTypeId('');
    setErrors({});
    modalRef.current?.showModal();
  };

  const validate = () => {
    const e = {};
    if (!nameOnly.trim()) e.nameOnly = 'กรุณากรอกชื่อ-นามสกุล';
    if (!form.thaiId || form.thaiId.length !== 13) e.thaiId = 'กรุณากรอกเลขบัตร 13 หลัก';
    if (!form.birthDate) e.birthDate = 'กรุณากรอกวันเกิด';
    if (!form.educationLevel) e.educationLevel = 'กรุณาเลือกระดับการศึกษา';
    if (!form.province) e.province = 'กรุณากรอกจังหวัด';
    if (!form.phone && !form.mobile) e.contact = 'กรุณากรอกเบอร์โทรศัพท์หรือมือถืออย่างน้อย 1 ช่อง';
    if (!editId && !disabilityTypeId && editPersonDisabilities.length === 0) e.disability = 'กรุณาเลือกประเภทความพิการ';
    if (!form.batchId) e.batchId = 'กรุณาเลือกรุ่นที่เข้าร่วม';
    return e;
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('ไฟล์ใหญ่เกินไป', 'รูปต้องไม่เกิน 5MB — แนะนำ JPG/PNG ขนาด 300×300 ถึง 600×600 px');
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoBase64(ev.target.result);
    reader.readAsDataURL(file);
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
        if (disabilityTypeId) await createDisabilityInfo(editId, { disabilityTypeId });
      } else {
        const created = await createPerson(payload);
        personId = created.data.id;
        if (disabilityTypeId) await createDisabilityInfo(personId, { disabilityTypeId });
      }
      if (photoBase64) {
        await uploadPersonPhoto(personId, { filePath: photoBase64, photoType: 'profile' });
      }
      modalRef.current?.close();
      load(search);
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

  const initials = (name = '') => name.slice(0, 2).toUpperCase();

  // ── นำเข้า Excel ──
  const parseGender = (v) => {
    const s = String(v || '').trim();
    if (['MALE', 'FEMALE', 'OTHER'].includes(s)) return s;
    if (s.includes('หญิง')) return 'FEMALE';
    if (s.includes('ชาย')) return 'MALE';
    return 'MALE';
  };
  const parseBirth = (v) => {
    if (!v) return '';
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v).trim();
    const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (m) { let y = parseInt(m[3]); if (y > 2400) y -= 543; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
    return '';
  };
  const resolveBatch = (numRaw, yearRaw) => {
    if (!numRaw) return '';
    const num = parseInt(String(numRaw).replace(/\D/g, ''));
    const yr = yearRaw ? parseInt(String(yearRaw).replace(/\D/g, '')) : null;
    const found = batches.find(b => b.batchNumber === num && (yr ? b.year === yr : true));
    return found ? String(found.id) : '';
  };

  const downloadTemplate = () => {
    const headers = ['ชื่อ-นามสกุล', 'ชื่อเล่น', 'เลขบัตรประชาชน', 'เพศ', 'วันเกิด', 'เบอร์โทร', 'จังหวัด', 'ระดับการศึกษา', 'รุ่นที่', 'ปี'];
    const example = ['นาย สมชาย ใจดี', 'ชาย', '1234567890123', 'ชาย', '15/05/2540', '0812345678', 'กรุงเทพมหานคร', 'ปริญญาตรี', '13', '2569'];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'นำเข้าคนพิการ');
    XLSX.writeFile(wb, 'เทมเพลตนำเข้าคนพิการ.xlsx');
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
          mobile: String(row['เบอร์โทร'] || row['เบอร์โทรศัพท์'] || '').trim(),
          province: String(row['จังหวัด'] || '').trim(),
          educationLevel: String(row['ระดับการศึกษา'] || row['วุฒิการศึกษา'] || '').trim(),
          batchId: resolveBatch(row['รุ่นที่'], row['ปี']),
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

  const handleImport = async () => {
    if (importRows.length === 0) return;
    setImporting(true);
    try {
      const res = await importPersons(importRows);
      const { created, failed, errors } = res.data;
      setImportModal(false);
      setImportRows([]);
      load(search);
      if (failed > 0) {
        toast.error(`นำเข้า ${created} สำเร็จ, ${failed} ไม่สำเร็จ`,
          errors.slice(0, 3).map(er => `แถว ${er.row}: ${er.error}`).join(' • ') + (errors.length > 3 ? ' …' : ''));
      } else {
        toast.success(`นำเข้าสำเร็จ ${created} รายการ!`);
      }
    } catch (err) {
      toast.error('นำเข้าไม่สำเร็จ', err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Users size={22} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-black page-title leading-tight">ข้อมูลคนพิการ</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              <span className="text-orange-600 font-bold">{persons.length}</span> รายการในระบบ
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 active:scale-95 transition-all shadow-sm"
              onClick={() => { setImportRows([]); setImportModal(true); }}>
              <FileSpreadsheet size={16} /> นำเข้า Excel
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 active:scale-95 transition-all shadow-sm"
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
            placeholder="ค้นหาชื่อ-นามสกุล หรือเลขบัตรประชาชน..."
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-300 min-w-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(search)}
          />

          {/* Clear */}
          {search && (
            <button onClick={() => { setSearch(''); load(''); }}
              className="p-1.5 rounded-lg text-gray-300 hover:text-orange-500 hover:bg-orange-50 transition-all flex-shrink-0">
              <X size={13} />
            </button>
          )}

          {/* Search button — float inside, not flush to edge */}
          <button onClick={() => load(search)}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>
            ค้นหา
          </button>
        </div>

        {/* Batch filter — รายชื่อแยกรุ่น (Dropdown) */}
        {batches.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
              <Layers size={13} className="text-orange-400" /> แยกรุ่น:
            </span>
            <div className="relative">
              <select
                value={batchFilter}
                onChange={(e) => handleBatchFilter(e.target.value)}
                className="appearance-none text-sm font-semibold rounded-xl border border-orange-200 bg-white text-gray-700 pl-3 pr-9 py-2 hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 cursor-pointer transition-all">
                <option value="">ทุกรุ่น</option>
                {batches.map(b => (
                  <option key={b.id} value={String(b.id)}>รุ่นที่ {b.batchNumber}/{b.year}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-3xl border border-orange-100/80 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                {['#','ชื่อ-นามสกุล','เลขบัตร','เพศ','จังหวัด','การศึกษา','สถานะ','จัดการ'].map((h, i) => (
                  <th key={h} className={`px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider ${i === 0 ? 'w-10' : ''} ${i === 7 ? 'text-center w-28' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadError && (
                <tr>
                  <td colSpan={8} className="text-center py-16">
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
                  <td colSpan={8} className="text-center py-16 text-gray-300">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-3xl bg-orange-50 flex items-center justify-center">
                        <UserRound size={28} className="text-orange-200" />
                      </div>
                      <p className="text-sm font-medium">ไม่พบข้อมูล</p>
                    </div>
                  </td>
                </tr>
              )}
              {paged.map((p, i) => (
                <tr key={p.id}
                  className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/persons/${p.id}`)}>
                  <td className="px-4 py-3.5 text-gray-300 text-xs font-mono">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl text-white text-xs font-black flex items-center justify-center flex-shrink-0 shadow-sm"
                        style={{ background: `linear-gradient(135deg,${['#ea580c','#06b6d4','#10b981','#8b5cf6','#ec4899'][i % 5]},${['#c2410c','#0284c7','#047857','#7c3aed','#db2777'][i % 5]})` }}>
                        {initials(p.fullName)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm leading-none">{p.fullName}</p>
                        <p className="text-gray-300 text-xs mt-0.5">{p.disabilityInfos?.[0]?.disabilityType?.typeName || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-gray-400">{p.thaiId || '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${GENDER_BADGE[p.gender]}`}>
                      {GENDER_LABELS[p.gender]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 text-sm">{p.province || '—'}</td>
                  <td className="px-4 py-3.5 text-gray-400 text-xs max-w-[120px] truncate">{p.educationLevel || '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.lifeStatus === 'ALIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                      {p.lifeStatus === 'ALIVE' ? 'มีชีวิต' : 'เสียชีวิต'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button className="w-7 h-7 rounded-xl flex items-center justify-center text-orange-400 hover:bg-orange-50 hover:text-orange-600 transition-all" onClick={() => navigate(`/persons/${p.id}`)}>
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
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-50 flex-shrink-0">
            <span className="text-xs text-gray-400">
              หน้า <span className="font-bold text-orange-600">{page}</span> / {totalPages}
              <span className="ml-1.5 text-gray-300">· {persons.length} รายการ</span>
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 rounded-xl text-sm font-bold border border-gray-100 text-gray-400 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all">←</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce((acc, n, idx, arr) => { if (idx > 0 && n - arr[idx-1] > 1) acc.push('…'); acc.push(n); return acc; }, [])
                .map((n, idx) => n === '…'
                  ? <span key={`e-${idx}`} className="px-1 text-gray-200 text-xs">…</span>
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
      <dialog ref={modalRef} className="modal">
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
                  <p className="text-xs text-gray-400">JPG/PNG ไม่เกิน 5MB</p>
                  <p className="text-xs text-gray-300">แนะนำ 300×300 px ขึ้นไป</p>
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
                <ThaiDateField label="วันเกิด" required value={form.birthDate} error={errors.birthDate}
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
                      {editPersonDisabilities.map((d) => (
                        <div key={d.id} className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl">
                          <span>{d.disabilityType?.typeName}</span>
                          <button type="button" className="text-red-400 hover:text-red-600 transition-colors ml-1"
                            onClick={async () => {
                              await deleteDisabilityInfo(editId, d.id);
                              setEditPersonDisabilities(prev => prev.filter(x => x.id !== d.id));
                            }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <select
                      className={`w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 transition-all cursor-pointer pr-9 ${errors.disability ? 'border-red-400 bg-red-50 focus:ring-red-300/40' : 'border-gray-200 focus:ring-orange-400/40 focus:border-orange-400'}`}
                      value={disabilityTypeId}
                      onChange={(e) => { setDisabilityTypeId(e.target.value); if (errors.disability) setErrors(p => ({...p, disability: ''})); }}
                    >
                      <option value="">— {editId ? 'เพิ่มประเภทความพิการ' : 'เลือกประเภทความพิการ'} —</option>
                      {disabilityTypes.map((t) => (
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
            <button
              className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-gray-500 hover:bg-gray-200 transition-all active:scale-95"
              onClick={() => modalRef.current?.close()}>ยกเลิก</button>
            <button
              className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)', boxShadow: '0 4px 15px rgba(234,88,12,0.3)' }}
              onClick={handleSave}>บันทึกข้อมูล</button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
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
                  <p className="text-xs text-gray-500 mt-0.5">คอลัมน์: ชื่อ-นามสกุล*, ชื่อเล่น, เลขบัตรประชาชน, เพศ, วันเกิด (วว/ดด/ปปปป พ.ศ.), เบอร์โทร, จังหวัด, ระดับการศึกษา, รุ่นที่, ปี</p>
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

              {/* Preview */}
              {importRows.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-bold text-gray-700 mb-2">ตัวอย่างข้อมูล ({importRows.length} รายการ)</p>
                  <div className="border border-gray-200 rounded-xl overflow-auto" style={{ maxHeight: '260px' }}>
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="text-gray-500">
                          <th className="px-2 py-2 text-left">#</th>
                          <th className="px-2 py-2 text-left">ชื่อ-นามสกุล</th>
                          <th className="px-2 py-2 text-left">ชื่อเล่น</th>
                          <th className="px-2 py-2 text-left">เลขบัตร</th>
                          <th className="px-2 py-2 text-center">เพศ</th>
                          <th className="px-2 py-2 text-left">จังหวัด</th>
                          <th className="px-2 py-2 text-left">รุ่น</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 50).map((r, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                            <td className="px-2 py-1.5 text-gray-700">{r.fullName}</td>
                            <td className="px-2 py-1.5 text-gray-500">{r.nickname}</td>
                            <td className="px-2 py-1.5 text-gray-500 font-mono">{r.thaiId}</td>
                            <td className="px-2 py-1.5 text-center text-gray-500">{r.gender === 'FEMALE' ? 'หญิง' : r.gender === 'OTHER' ? 'อื่นๆ' : 'ชาย'}</td>
                            <td className="px-2 py-1.5 text-gray-500">{r.province}</td>
                            <td className="px-2 py-1.5 text-gray-500">{r.batchId ? (batches.find(b => String(b.id) === r.batchId)?.batchNumber ?? '—') : '—'}</td>
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
              <button onClick={handleImport} disabled={importRows.length === 0 || importing}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50">
                {importing ? 'กำลังนำเข้า...' : `นำเข้า ${importRows.length} รายการ`}
              </button>
            </div>
          </div>
        </div>
      )}
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
        {maxLength && <span className="ml-1 font-normal text-gray-300">({safeVal.length}/{maxLength})</span>}
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
  const toDisplay = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${parseInt(y) + 543}`;
  };
  const [display, setDisplay] = useState(() => toDisplay(value));
  useEffect(() => { setDisplay(toDisplay(value)); }, [value]);
  const todayTH = new Date().getFullYear() + 543;
  const handleChangeWithValidation = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    let fmt = raw.length <= 2 ? raw : raw.length <= 4 ? `${raw.slice(0,2)}/${raw.slice(2)}` : `${raw.slice(0,2)}/${raw.slice(2,4)}/${raw.slice(4)}`;
    setDisplay(fmt);
    if (raw.length === 8) {
      const yearTH = parseInt(raw.slice(4, 8));
      if (yearTH >= todayTH) { setDisplay(''); return; } // ปีต้องเป็นอดีต
      const yAD = yearTH - 543;
      onChange(`${yAD}-${raw.slice(2,4)}-${raw.slice(0,2)}`);
    } else if (raw.length === 0) onChange('');
  };
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input type="text" placeholder="วว/ดด/ปปปป (พ.ศ.) — ต้องเป็นอดีต" maxLength={10}
        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 transition-all ${hasError ? 'border-red-400 bg-red-50 focus:ring-red-300/40' : 'border-gray-200 focus:ring-orange-400/40 focus:border-orange-400'}`}
        value={display} onChange={handleChangeWithValidation} />
      {hasError && <p className="text-xs text-red-500 mt-1">{error}</p>}
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
