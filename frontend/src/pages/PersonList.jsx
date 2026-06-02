import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Eye, Pencil, Trash2, UserRound, ChevronDown, Users, Camera, X } from 'lucide-react';
import { getPersons, createPerson, updatePerson, deletePerson, getDisabilityTypes, createDisabilityInfo, deleteDisabilityInfo, getPersonPhotos, uploadPersonPhoto } from '../api';
import { useAuth } from '../context/AuthContext';

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

const splitPrefix = (fullName = '') => {
  for (const p of PREFIXES) {
    if (fullName.startsWith(p)) return { prefix: p, nameOnly: fullName.slice(p.length).trim() };
  }
  return { prefix: '', nameOnly: fullName };
};

const emptyForm = {
  fullName: '', thaiId: '', gender: 'MALE', birthDate: '',
  phone: '', mobile: '', email: '', landmark: '',
  houseNo: '', moo: '', building: '', floor: '',
  soi: '', road: '', subDistrict: '', district: '',
  province: '', postalCode: '',
  address: '',
  nationality: 'ไทย', religion: 'พุทธ', maritalStatus: 'SINGLE',
  educationLevel: '', lifeStatus: 'ALIVE',
};

export default function PersonList() {
  const navigate = useNavigate();
  const { canEdit } = useAuth();
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

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(persons.length / PAGE_SIZE);
  const paged = persons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const load = (q = '') => getPersons(q ? { search: q } : {}).then((r) => { setPersons(r.data); setPage(1); });
  useEffect(() => {
    load();
    getDisabilityTypes().then((r) => setDisabilityTypes(r.data));
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
    modalRef.current?.showModal();
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert('รูปต้องมีขนาดไม่เกิน 2MB');
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoBase64(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!nameOnly.trim()) return alert('กรุณากรอกชื่อ-นามสกุล');
    if (!form.thaiId || form.thaiId.length !== 13) return alert('กรุณากรอกเลขบัตรประชาชน / บัตรคนพิการ ให้ครบ 13 หลัก');
    const fullName = `${prefix}${prefix ? ' ' : ''}${nameOnly.trim()}`;
    const payload = {
      fullName,
      thaiId: form.thaiId, gender: form.gender, birthDate: form.birthDate,
      phone: form.phone, mobile: form.mobile, email: form.email, landmark: form.landmark,
      houseNo: form.houseNo, moo: form.moo, building: form.building, floor: form.floor,
      soi: form.soi, road: form.road, subDistrict: form.subDistrict, district: form.district,
      province: form.province, postalCode: form.postalCode,
      address: form.address,
      nationality: form.nationality, religion: form.religion,
      maritalStatus: form.maritalStatus, educationLevel: form.educationLevel, lifeStatus: form.lifeStatus,
    };
    if (!payload.birthDate) delete payload.birthDate;
    if (!payload.thaiId) delete payload.thaiId;
    if (!editId && !disabilityTypeId) return alert('กรุณาเลือกประเภทความพิการ');
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
    } catch (err) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('ยืนยันลบข้อมูล?')) return;
    await deletePerson(id);
    load(search);
  };

  const initials = (name = '') => name.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header Banner */}
      <div className="mb-3 rounded-2xl overflow-hidden relative shadow-md border border-orange-100 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#fff7ed 0%,#ffedd5 60%,#fed7aa 100%)' }}>
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle,#ea580c,transparent)' }} />
        <div className="absolute right-28 -bottom-8 w-32 h-32 rounded-full opacity-10"
          style={{ background: '#c2410c' }} />
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: 'linear-gradient(180deg,#ea580c,#fb923c)' }} />
        <div className="relative px-8 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>
              <Users size={20} color="white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="h-px w-5 bg-orange-400 rounded-full" />
                <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">ฐานข้อมูล</span>
              </div>
              <h1 className="text-xl font-extrabold text-orange-950 leading-tight">ข้อมูลคนพิการ</h1>
              <p className="text-xs text-orange-400 font-semibold mt-0.5">{persons.length} รายการในระบบ</p>
            </div>
          </div>
          {canEdit && (
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg active:scale-95 transition-all flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}
              onClick={() => openModal()}>
              <Plus size={15} /> เพิ่มคนพิการ
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 px-4 py-2.5 mb-3 flex gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-md rounded-xl border border-gray-200 px-3.5 py-1.5 bg-gray-50 hover:bg-white focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-400/40 focus-within:border-orange-400 transition-all">
          <Search size={15} className="text-gray-400 flex-shrink-0" />
          <input
            type="text" placeholder="ค้นหาชื่อ หรือ เลขบัตรประชาชน..."
            className="grow text-sm bg-transparent outline-none text-gray-800"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(search)}
          />
        </div>
        <button className="btn btn-primary btn-sm h-auto" onClick={() => load(search)}>ค้นหา</button>
        {search && <button className="btn btn-ghost btn-sm h-auto" onClick={() => { setSearch(''); load(''); }}>ล้าง</button>}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
        <table className="table table-sm table-zebra w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-orange-50 text-orange-600 text-xs uppercase tracking-wider">
              <th className="w-10">#</th>
              <th>ชื่อ-นามสกุล</th>
              <th>เลขบัตร</th>
              <th>เพศ</th>
              <th>จังหวัด</th>
              <th>การศึกษา</th>
              <th>สถานะ</th>
              <th className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {persons.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-14 text-gray-400">
                  <UserRound size={40} className="mx-auto mb-2 text-gray-200" />
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
            {paged.map((p, i) => (
              <tr key={p.id} className="hover:bg-orange-50/40 transition-colors">
                <td className="text-gray-400 text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {initials(p.fullName)}
                    </div>
                    <span className="font-semibold text-orange-950 text-sm">{p.fullName}</span>
                  </div>
                </td>
                <td className="font-mono text-sm text-gray-500">{p.thaiId || '—'}</td>
                <td>
                  <span className={`badge badge-sm font-semibold ${GENDER_BADGE[p.gender]}`}>
                    {GENDER_LABELS[p.gender]}
                  </span>
                </td>
                <td className="text-sm text-gray-600">{p.province || '—'}</td>
                <td className="text-sm text-gray-600">{p.educationLevel || '—'}</td>
                <td>
                  <span className={`badge badge-sm font-semibold ${p.lifeStatus === 'ALIVE' ? 'badge-success' : 'badge-ghost'}`}>
                    {p.lifeStatus === 'ALIVE' ? 'มีชีวิต' : 'เสียชีวิต'}
                  </span>
                </td>
                <td>
                  <div className="flex items-center justify-center gap-1">
                    <button className="btn btn-ghost btn-xs text-orange-500 hover:bg-orange-50" onClick={() => navigate(`/persons/${p.id}`)}>
                      <Eye size={14} />
                    </button>
                    {canEdit && <>
                      <button className="btn btn-ghost btn-xs text-amber-500 hover:bg-amber-50" onClick={() => openModal(p)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-ghost btn-xs text-red-500 hover:bg-red-50" onClick={() => handleDelete(p.id)}>
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
          <div className="flex items-center justify-between px-5 py-3 border-t border-orange-100 flex-shrink-0">
            <span className="text-sm text-gray-400">
              หน้า <span className="font-bold text-orange-600">{page}</span> จาก {totalPages}
              <span className="ml-2 text-gray-300">({persons.length} รายการ)</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                .reduce((acc, n, idx, arr) => {
                  if (idx > 0 && n - arr[idx - 1] > 1) acc.push('…');
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, idx) =>
                  n === '…'
                    ? <span key={`ellipsis-${idx}`} className="px-1 text-gray-300 text-sm">…</span>
                    : <button key={n}
                        onClick={() => setPage(n)}
                        className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                          page === n
                            ? 'text-white shadow-sm'
                            : 'border border-gray-200 text-gray-500 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600'
                        }`}
                        style={page === n ? { background: 'linear-gradient(135deg,#ea580c,#c2410c)' } : {}}>
                        {n}
                      </button>
                )}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <dialog ref={modalRef} className="modal">
        <div className="modal-box max-w-3xl p-0 overflow-hidden bg-white shadow-2xl">
          {/* Header */}
          <div className="px-6 py-5 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#431407 0%,#c2410c 100%)' }}>
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <UserRound size={20} color="#fff" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base leading-tight">{editId ? 'แก้ไขข้อมูลคนพิการ' : 'เพิ่มข้อมูลคนพิการใหม่'}</h3>
              <p className="text-orange-300/80 text-xs mt-0.5">กรุณากรอกข้อมูลให้ครบถ้วนตามแบบฟอร์ม กกจ.พก.1</p>
            </div>
          </div>
          {/* Body */}
          <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">

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
                  <p className="text-xs text-gray-400">รองรับ JPG, PNG ขนาดไม่เกิน 2MB</p>
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
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">ชื่อ-นามสกุล *</label>
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
                      className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all"
                      value={nameOnly}
                      onChange={(e) => setNameOnly(e.target.value)}
                    />
                  </div>
                </div>
                <FormField label="เลขบัตรประชาชน / บัตรคนพิการ *" value={form.thaiId} onChange={(v) => setForm({ ...form, thaiId: v })} numericOnly maxLength={13} />
                <ThaiDateField label="วันเกิด" value={form.birthDate} onChange={(v) => setForm({ ...form, birthDate: v })} />
                <SelectField label="เพศ" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })}
                  options={[['MALE','ชาย'],['FEMALE','หญิง'],['OTHER','อื่นๆ']]} />
                <MaritalField value={form.maritalStatus} onChange={(v) => setForm({ ...form, maritalStatus: v })} />
                <FormField label="สัญชาติ" value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} />
                <FormField label="ศาสนา" value={form.religion} onChange={(v) => setForm({ ...form, religion: v })} />
                <div className="col-span-2">
                  <EducationField value={form.educationLevel} onChange={(v) => setForm({ ...form, educationLevel: v })} />
                </div>
                <SelectField label="สถานะ" value={form.lifeStatus} onChange={(v) => setForm({ ...form, lifeStatus: v })}
                  options={[['ALIVE','มีชีวิต'],['DECEASED','เสียชีวิต']]} />

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
                      className="w-full appearance-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all cursor-pointer pr-9"
                      value={disabilityTypeId}
                      onChange={(e) => setDisabilityTypeId(e.target.value)}
                    >
                      <option value="">— {editId ? 'เพิ่มประเภทความพิการ' : 'เลือกประเภทความพิการ'} —</option>
                      {disabilityTypes.map((t) => (
                        <option key={t.id} value={String(t.id)}>{t.typeName}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
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
                  <FormField label="จังหวัด" value={form.province} onChange={(v) => setForm({ ...form, province: v })} />
                </div>
                <div className="col-span-2">
                  <FormField label="รหัสไปรษณีย์" value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} numericOnly maxLength={5} />
                </div>
              </div>
            </Section>

            {/* ส่วนที่ 3: ข้อมูลติดต่อ */}
            <Section label="ข้อมูลติดต่อ">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="โทรศัพท์บ้าน" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} numericOnly maxLength={10} />
                <FormField label="มือถือ" value={form.mobile} onChange={(v) => setForm({ ...form, mobile: v })} numericOnly maxLength={10} />
                <FormField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                <FormField label="สถานที่ใกล้เคียง" value={form.landmark} onChange={(v) => setForm({ ...form, landmark: v })} />
              </div>
            </Section>
          </div>
          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
            <button className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-200 transition-colors" onClick={() => modalRef.current?.close()}>ยกเลิก</button>
            <button className="px-6 py-2 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }} onClick={handleSave}>บันทึก</button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>
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

function FormField({ label, value, onChange, type = 'text', maxLength, numericOnly }) {
  const safeVal = value ?? '';
  const handleChange = (e) => {
    let v = e.target.value;
    if (numericOnly) v = v.replace(/\D/g, '');
    if (maxLength) v = v.slice(0, maxLength);
    onChange(v);
  };
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
        {label}{maxLength && <span className="ml-1 font-normal text-gray-300">({safeVal.length}/{maxLength})</span>}
      </label>
      <input
        type={type}
        inputMode={numericOnly ? 'numeric' : undefined}
        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all"
        value={safeVal}
        onChange={handleChange}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <select
          className="w-full appearance-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all cursor-pointer pr-9"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

function EducationField({ value = '', onChange }) {
  const isOther = value && !EDUCATION_OPTS.slice(0, -1).includes(value);
  const selectVal = isOther ? 'อื่นๆ' : (value || '');
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">ระดับการศึกษา</label>
      <div className="relative mb-2">
        <select
          className="w-full appearance-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all cursor-pointer pr-9"
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
    </div>
  );
}

function ThaiDateField({ label, value = '', onChange }) {
  const toDisplay = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${parseInt(y) + 543}`;
  };
  const [display, setDisplay] = useState(() => toDisplay(value));
  useEffect(() => { setDisplay(toDisplay(value)); }, [value]);
  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    let fmt = raw.length <= 2 ? raw : raw.length <= 4 ? `${raw.slice(0,2)}/${raw.slice(2)}` : `${raw.slice(0,2)}/${raw.slice(2,4)}/${raw.slice(4)}`;
    setDisplay(fmt);
    if (raw.length === 8) {
      const yAD = parseInt(raw.slice(4, 8)) - 543;
      onChange(`${yAD}-${raw.slice(2,4)}-${raw.slice(0,2)}`);
    } else if (raw.length === 0) onChange('');
  };
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">{label}</label>
      <input type="text" placeholder="วว/ดด/ปปปป (พ.ศ.)" maxLength={10}
        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all"
        value={display} onChange={handleChange} />
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
