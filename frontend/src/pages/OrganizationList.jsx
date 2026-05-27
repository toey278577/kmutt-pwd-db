import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { getOrganizations, createOrganization, updateOrganization, deleteOrganization } from '../api';
import { useAuth } from '../context/AuthContext';

const emptyForm = { orgName: '', businessType: '', address: '', contactName: '', phone: '', email: '', note: '' };
const COLORS = ['bg-orange-100 text-orange-600', 'bg-cyan-100 text-cyan-600', 'bg-emerald-100 text-emerald-600', 'bg-amber-100 text-amber-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600'];

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
    try {
      if (editId) await updateOrganization(editId, form);
      else await createOrganization(form);
      modalRef.current?.close(); load();
    } catch (err) { alert(err.response?.data?.error || 'เกิดข้อผิดพลาด'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('ยืนยันลบ?')) return;
    await deleteOrganization(id); load();
  };

  return (
    <div>
      <div className="mb-7 rounded-2xl overflow-hidden relative shadow-md border border-orange-100"
        style={{ background: 'linear-gradient(135deg,#fff7ed 0%,#ffedd5 60%,#fed7aa 100%)' }}>
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle,#ea580c,transparent)' }} />
        <div className="absolute right-28 -bottom-8 w-32 h-32 rounded-full opacity-10"
          style={{ background: '#c2410c' }} />
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: 'linear-gradient(180deg,#ea580c,#fb923c)' }} />
        <div className="relative px-8 py-6 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>
              <Building2 size={22} color="white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="h-px w-5 bg-orange-400 rounded-full" />
                <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">ฐานข้อมูล</span>
              </div>
              <h1 className="text-2xl font-extrabold text-orange-950 leading-tight">สถานประกอบการ</h1>
              <p className="text-sm text-orange-400 font-semibold mt-0.5">{orgs.length} แห่งในระบบ</p>
            </div>
          </div>
          {canEdit && (
            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg active:scale-95 transition-all flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}
              onClick={() => openModal()}>
              <Plus size={16} /> เพิ่มองค์กร
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="table table-zebra w-full" style={{ minWidth: '640px' }}>
          <thead>
            <tr className="bg-orange-50 text-orange-600 text-xs uppercase tracking-wider">
              <th className="w-10">#</th>
              <th style={{ minWidth: '180px' }}>ชื่อองค์กร</th>
              <th style={{ minWidth: '120px' }}>ประเภทธุรกิจ</th>
              <th style={{ minWidth: '110px' }}>ผู้ติดต่อ</th>
              <th style={{ minWidth: '140px' }}>เบอร์โทร / Email</th>
              <th className="text-center" style={{ minWidth: '80px' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-14 text-gray-400">
                  <Building2 size={40} className="mx-auto mb-2 text-gray-200" />
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
            {orgs.map((o, i) => (
              <tr key={o.id} className="hover:bg-orange-50/40 transition-colors">
                <td className="text-gray-400 text-xs">{i + 1}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${COLORS[i % COLORS.length]}`}>
                      {o.orgName.slice(0, 2)}
                    </div>
                    <span className="font-semibold text-orange-950 text-sm">{o.orgName}</span>
                  </div>
                </td>
                <td>
                  {o.businessType
                    ? <span className="badge badge-sm bg-orange-50 text-orange-600 border-0 font-medium">{o.businessType}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="text-sm text-gray-600">{o.contactName || '—'}</td>
                <td>
                  <p className="text-sm text-gray-700">{o.phone || ''}</p>
                  <p className="text-xs text-gray-400">{o.email || ''}</p>
                </td>
                <td>
                  {canEdit && (
                    <div className="flex items-center justify-center gap-1">
                      <button className="btn btn-ghost btn-xs text-amber-500 hover:bg-amber-50" onClick={() => openModal(o)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-ghost btn-xs text-red-500 hover:bg-red-50" onClick={() => handleDelete(o.id)}>
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

      <dialog ref={modalRef} className="modal">
        <div className="modal-box max-w-md p-0 overflow-hidden bg-white shadow-2xl">
          {/* Header */}
          <div className="px-6 py-5 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#431407 0%,#c2410c 100%)' }}>
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Building2 size={20} color="#fff" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base leading-tight">{editId ? 'แก้ไของค์กร' : 'เพิ่มองค์กรใหม่'}</h3>
              <p className="text-orange-300/80 text-xs mt-0.5">กรุณากรอกข้อมูลให้ครบถ้วน</p>
            </div>
          </div>
          {/* Body */}
          <div className="p-5 grid grid-cols-2 gap-3">
            {[
              { label: 'ชื่อองค์กร *', key: 'orgName', col2: true },
              { label: 'ประเภทธุรกิจ', key: 'businessType' },
              { label: 'ผู้ติดต่อ', key: 'contactName' },
              { label: 'เบอร์โทร', key: 'phone' },
              { label: 'Email', key: 'email' },
            ].map(({ label, key, col2 }) => (
              <div key={key} className={col2 ? 'col-span-2' : ''}>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">{label}</label>
                <input
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">ที่อยู่</label>
              <textarea
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all resize-none"
                rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">หมายเหตุ</label>
              <textarea
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all resize-none"
                rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
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
