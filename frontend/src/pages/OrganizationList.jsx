import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { getOrganizations, createOrganization, updateOrganization, deleteOrganization } from '../api';
import { useAuth } from '../context/AuthContext';

const emptyForm = { orgName: '', businessType: '', address: '', contactName: '', phone: '', email: '', note: '' };
const AVATAR_GRADIENTS = [
  'from-orange-500 to-red-500', 'from-cyan-500 to-blue-500',
  'from-emerald-500 to-teal-500', 'from-violet-500 to-purple-500',
  'from-pink-500 to-rose-500', 'from-amber-500 to-orange-500',
];

const inputCls = 'w-full rounded-2xl border border-gray-100 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all';
const labelCls = 'block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide';

export default function OrganizationList() {
  const { canEdit } = useAuth();
  const modalRef = useRef(null);
  const [orgs, setOrgs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const load = () => getOrganizations().then((r) => setOrgs(r.data));
  useEffect(() => { load(); }, []);

  const openModal = (org = null) => {
    if (org) { setForm({ ...emptyForm, ...org }); setEditId(org.id); }
    else { setForm(emptyForm); setEditId(null); }
    modalRef.current?.showModal();
  };

  const handleSave = async () => {
    if (!form.orgName.trim()) return alert('กรุณากรอกชื่อองค์กร');
    try {
      if (editId) await updateOrganization(editId, form);
      else await createOrganization(form);
      modalRef.current?.close();
      load();
    } catch (err) { alert(err.response?.data?.error || 'เกิดข้อผิดพลาด'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('ยืนยันลบ?')) return;
    await deleteOrganization(id);
    load();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Building2 size={22} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-800 leading-tight">สถานประกอบการ</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              <span className="text-orange-600 font-bold">{orgs.length}</span> แห่งในระบบ
            </p>
          </div>
        </div>
        {canEdit && (
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 active:scale-95 transition-all shadow-sm flex-shrink-0"
            onClick={() => openModal()}>
            <Plus size={16} /> เพิ่มองค์กร
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-orange-100/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '640px' }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['#', 'ชื่อองค์กร', 'ประเภทธุรกิจ', 'ผู้ติดต่อ', 'เบอร์โทร / Email', 'จัดการ'].map((h, i) => (
                  <th key={h} className={`px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide ${i === 0 ? 'w-10' : ''} ${i === 5 ? 'text-center' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-300">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-3xl bg-orange-50 flex items-center justify-center">
                        <Building2 size={28} className="text-orange-200" />
                      </div>
                      <p className="text-sm font-medium">ไม่พบข้อมูล</p>
                    </div>
                  </td>
                </tr>
              )}
              {orgs.map((o, i) => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                  <td className="px-4 py-3.5 text-gray-300 text-xs font-mono">{i + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} text-white text-xs font-black flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        {o.orgName.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm leading-none">{o.orgName}</p>
                        {o.address && <p className="text-gray-400 text-xs mt-0.5 truncate max-w-[160px]">{o.address}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {o.businessType
                      ? <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-100">{o.businessType}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-sm">{o.contactName || '—'}</td>
                  <td className="px-4 py-3.5">
                    <p className="text-gray-700 text-sm">{o.phone || '—'}</p>
                    {o.email && <p className="text-gray-400 text-xs mt-0.5">{o.email}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    {canEdit && (
                      <div className="flex items-center justify-center gap-1">
                        <button className="w-7 h-7 rounded-xl flex items-center justify-center text-amber-400 hover:bg-amber-50 hover:text-amber-600 transition-all" onClick={() => openModal(o)}>
                          <Pencil size={14} />
                        </button>
                        <button className="w-7 h-7 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-all" onClick={() => handleDelete(o.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <dialog ref={modalRef} className="modal">
        <div className="modal-box max-w-md p-0 overflow-hidden bg-white shadow-2xl rounded-3xl">
          <div className="relative px-6 py-5 flex items-center gap-4 overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#1c0a00 0%,#7c2d12 60%,#ea580c 100%)' }}>
            <div className="absolute inset-0 opacity-5"
              style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
            <div className="relative w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <Building2 size={18} color="#fff" />
            </div>
            <div className="relative">
              <h3 className="text-white font-black text-base leading-tight">{editId ? 'แก้ไของค์กร' : 'เพิ่มองค์กรใหม่'}</h3>
              <p className="text-orange-200/60 text-xs mt-0.5">กรุณากรอกข้อมูลให้ครบถ้วน</p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            {[
              { label: 'ชื่อองค์กร *', key: 'orgName', col2: true },
              { label: 'ประเภทธุรกิจ', key: 'businessType' },
              { label: 'ผู้ติดต่อ', key: 'contactName' },
              { label: 'เบอร์โทร', key: 'phone' },
              { label: 'Email', key: 'email' },
            ].map(({ label, key, col2 }) => (
              <div key={key} className={col2 ? 'col-span-2' : ''}>
                <label className={labelCls}>{label}</label>
                <input className={inputCls} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <div className="col-span-2">
              <label className={labelCls}>ที่อยู่</label>
              <textarea className={inputCls + ' resize-none'} rows={2}
                value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>หมายเหตุ</label>
              <textarea className={inputCls + ' resize-none'} rows={2}
                value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
            <button className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-gray-500 hover:bg-gray-200 transition-all"
              onClick={() => modalRef.current?.close()}>ยกเลิก</button>
            <button className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)', boxShadow: '0 4px 15px rgba(234,88,12,0.3)' }}
              onClick={handleSave}>บันทึก</button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>
    </div>
  );
}
