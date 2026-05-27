import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Eye, Pencil, Trash2, UserRound, ChevronDown, Users } from 'lucide-react';
import { getPersons, createPerson, updatePerson, deletePerson, getDisabilityTypes, createDisabilityInfo } from '../api';
import { useAuth } from '../context/AuthContext';

const GENDER_LABELS = { MALE: 'ชาย', FEMALE: 'หญิง', OTHER: 'อื่นๆ' };
const GENDER_BADGE = { MALE: 'bg-sky-100 text-sky-600 border-sky-200', FEMALE: 'bg-pink-100 text-pink-500 border-pink-200', OTHER: 'bg-gray-100 text-gray-500 border-gray-200' };

const emptyForm = {
  fullName: '', thaiId: '', gender: 'MALE', birthDate: '',
  phone: '', email: '', address: '', province: '',
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

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(persons.length / PAGE_SIZE);
  const paged = persons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const load = (q = '') => getPersons(q ? { search: q } : {}).then((r) => { setPersons(r.data); setPage(1); });
  useEffect(() => {
    load();
    getDisabilityTypes().then((r) => setDisabilityTypes(r.data));
  }, []);

  const openModal = (person = null) => {
    if (person) {
      setForm({ ...emptyForm, ...person, birthDate: person.birthDate?.slice(0, 10) || '' });
      setEditId(person.id);
    } else {
      setForm(emptyForm);
      setEditId(null);
    }
    setDisabilityTypeId('');
    modalRef.current?.showModal();
  };

  const handleSave = async () => {
    const { fullName, thaiId, gender, birthDate, phone, email, address, province,
            nationality, religion, maritalStatus, educationLevel, lifeStatus } = form;
    const payload = { fullName, thaiId, gender, birthDate, phone, email, address, province,
                      nationality, religion, maritalStatus, educationLevel, lifeStatus };
    if (!payload.birthDate) delete payload.birthDate;
    if (!payload.thaiId) delete payload.thaiId;
    try {
      if (editId) {
        await updatePerson(editId, payload);
      } else {
        const created = await createPerson(payload);
        if (disabilityTypeId) {
          await createDisabilityInfo(created.data.id, { disabilityTypeId });
        }
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
        <div className="modal-box max-w-2xl p-0 overflow-hidden bg-white shadow-2xl">
          {/* Header */}
          <div className="px-6 py-5 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#431407 0%,#c2410c 100%)' }}>
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <UserRound size={20} color="#fff" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base leading-tight">{editId ? 'แก้ไขข้อมูลคนพิการ' : 'เพิ่มข้อมูลคนพิการใหม่'}</h3>
              <p className="text-orange-300/80 text-xs mt-0.5">กรุณากรอกข้อมูลให้ครบถ้วน</p>
            </div>
          </div>
          {/* Body */}
          <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-orange-500" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ข้อมูลส่วนตัว</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <FormField label="ชื่อ-นามสกุล *" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
                </div>
                <FormField label="เลขบัตรประชาชน" value={form.thaiId} onChange={(v) => setForm({ ...form, thaiId: v })} numericOnly maxLength={13} />
                <ThaiDateField label="วันเกิด" value={form.birthDate} onChange={(v) => setForm({ ...form, birthDate: v })} />
                <SelectField label="เพศ" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })}
                  options={[['MALE','ชาย'],['FEMALE','หญิง'],['OTHER','อื่นๆ']]} />
                <MaritalField value={form.maritalStatus} onChange={(v) => setForm({ ...form, maritalStatus: v })} />
                <FormField label="สัญชาติ" value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} />
                <FormField label="ศาสนา" value={form.religion} onChange={(v) => setForm({ ...form, religion: v })} />
                <FormField label="ระดับการศึกษา" value={form.educationLevel} onChange={(v) => setForm({ ...form, educationLevel: v })} />
                <SelectField label="สถานะ" value={form.lifeStatus} onChange={(v) => setForm({ ...form, lifeStatus: v })}
                  options={[['ALIVE','มีชีวิต'],['DECEASED','เสียชีวิต']]} />
              </div>
            </div>
            {!editId && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-cyan-500" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ข้อมูลความพิการ</p>
                </div>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all cursor-pointer pr-9"
                    value={disabilityTypeId}
                    onChange={(e) => setDisabilityTypeId(e.target.value)}
                  >
                    <option value="">— ไม่ระบุ / เลือกภายหลัง —</option>
                    {disabilityTypes.map((t) => (
                      <option key={t.id} value={String(t.id)}>{t.typeName}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-orange-500" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ข้อมูลติดต่อ</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="เบอร์โทร" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} numericOnly maxLength={10} />
                <FormField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                <FormField label="จังหวัด" value={form.province} onChange={(v) => setForm({ ...form, province: v })} />
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">ที่อยู่</label>
                  <textarea
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all resize-none"
                    rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>
            </div>
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

function FormField({ label, value = '', onChange, type = 'text', maxLength, numericOnly }) {
  const handleChange = (e) => {
    let v = e.target.value;
    if (numericOnly) v = v.replace(/\D/g, '');
    if (maxLength) v = v.slice(0, maxLength);
    onChange(v);
  };
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
        {label}{maxLength && <span className="ml-1 font-normal text-gray-300">({value.length}/{maxLength})</span>}
      </label>
      <input
        type={type}
        inputMode={numericOnly ? 'numeric' : undefined}
        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all"
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}

function SelectField({ label, value = '', onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <select
          className="w-full appearance-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all cursor-pointer pr-9"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
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
