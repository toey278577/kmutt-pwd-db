import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, Shield, Eye, UserCog, Users } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DangerZone from '../components/DangerZone';
import LoadError from '../components/LoadError';
import { useDiscardGuard } from '../utils/useDiscardGuard';
import DiscardBar from '../components/DiscardBar';
import MobileCard, { MobileEditBtn, MobileDelBtn } from '../components/MobileCard';

const ROLES = {
  ADMIN:  { label: 'ผู้ดูแลระบบ', bg: 'bg-red-100 text-red-700 border-red-200',       icon: Shield,  grad: 'from-red-500 to-orange-500' },
  STAFF:  { label: 'เจ้าหน้าที่',  bg: 'bg-amber-100 text-amber-700 border-amber-200', icon: UserCog, grad: 'from-amber-500 to-orange-500' },
  VIEWER: { label: 'ผู้ดูข้อมูล',  bg: 'bg-sky-100 text-sky-700 border-sky-200',       icon: Eye,     grad: 'from-sky-500 to-cyan-500' },
};

const empty = { name: '', email: '', password: '', role: 'STAFF' };
const inputCls = 'w-full rounded-2xl border border-gray-100 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all';
const labelCls = 'block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide';

export default function UserManagement() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const modalRef = useRef(null);
  const guard = useDiscardGuard(() => modalRef.current?.close());

  const [loadError, setLoadError] = useState(false);
  // เดิมไม่มี catch → โหลดพังแล้วหมุนค้างตลอด
  const load = () => getUsers().then((r) => { setUsers(r.data); setLoading(false); }).catch(() => { setLoadError(true); setLoading(false); });
  const retry = () => { setLoadError(false); setLoading(true); load(); };
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null); setForm(empty); setErr('');
    guard.arm(empty);
    modalRef.current?.showModal();
  };

  const openEdit = (u) => {
    const initial = { name: u.name, email: u.email, password: '', role: u.role };
    setEditing(u); setForm(initial); setErr('');
    guard.arm(initial);
    modalRef.current?.showModal();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErr('');
    if (form.password && form.password.length < 8) { setErr('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return; }
    setSaving(true);
    try {
      const data = { name: form.name, email: form.email.trim().toLowerCase(), role: form.role };
      if (form.password) data.password = form.password;
      if (editing) {
        await updateUser(editing.id, data);
      } else {
        if (!form.password) { setErr('กรุณากรอกรหัสผ่าน'); setSaving(false); return; }
        await createUser({ ...data, password: form.password });
      }
      modalRef.current?.close();
      load();
      toast.success(editing ? 'แก้ไขผู้ใช้สำเร็จ!' : 'เพิ่มผู้ใช้สำเร็จ!');
    } catch (e) {
      setErr(e.response?.data?.error || 'เกิดข้อผิดพลาด');
      toast.error('บันทึกไม่สำเร็จ', e.response?.data?.error || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (u) => {
    if (u.id === me?.id) return;
    try {
      await updateUser(u.id, { isActive: !u.isActive });
      load();
      toast.success(u.isActive ? 'ปิดใช้งานบัญชีแล้ว' : 'เปิดใช้งานบัญชีแล้ว');
    } catch (e) { toast.error('ทำรายการไม่สำเร็จ', e.response?.data?.error || 'เกิดข้อผิดพลาด'); }
  };

  const handleDelete = async (u) => {
    if (u.id === me?.id) return;
    if (!(await toast.confirm({ title: `ลบผู้ใช้ "${u.name}"?`, message: 'บัญชีนี้จะถูกลบถาวร กู้คืนไม่ได้' }))) return;
    try {
      await deleteUser(u.id);
      load();
      toast.success('ลบผู้ใช้สำเร็จ!');
    } catch (e) { toast.error('ลบไม่สำเร็จ', e.response?.data?.error || 'เกิดข้อผิดพลาด'); }
  };

  // วว/ดด/ปปปป พ.ศ. เหมือนทั้งระบบ (เดิมขึ้น 2026-10-14)
  const fmtDate = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${+y + 543}`; };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        <span className="text-orange-400 text-sm">กำลังโหลด...</span>
      </div>
    </div>
  );

  if (loadError) return <LoadError onRetry={retry} />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <UserCog size={22} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-black page-title leading-tight">จัดการผู้ใช้งาน</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              <span className="text-orange-600 font-bold">{users.length}</span> บัญชีในระบบ
            </p>
          </div>
        </div>
        <button onClick={openAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 active:scale-95 transition-all shadow-sm flex-shrink-0">
          <Plus size={16} /> เพิ่มผู้ใช้
        </button>
      </div>

      {/* จอคอม = ตาราง · มือถือ = การ์ด */}
      <div className="bg-white rounded-3xl border border-orange-100/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm" style={{ minWidth: '600px' }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['ชื่อ', 'อีเมล', 'บทบาท', 'สถานะ', 'วันที่สร้าง', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const role = ROLES[u.role] || ROLES.STAFF;
                const RoleIcon = role.icon;
                return (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-800 text-sm leading-none whitespace-nowrap">{u.name}</span>
                            {u.id === me?.id && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">คุณ</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-sm">{u.email}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${role.bg}`}>
                        <RoleIcon size={11} /> {role.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => handleToggle(u)} disabled={u.id === me?.id}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all
                          ${u.isActive
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                          } ${u.id === me?.id ? 'cursor-default opacity-60' : 'cursor-pointer'}`}>
                        {u.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs font-mono">{fmtDate(u.createdAt)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(u)}
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-amber-400 hover:bg-amber-50 hover:text-amber-600 transition-all">
                          <Pencil size={13} />
                        </button>
                        {u.id !== me?.id && (
                          <button onClick={() => handleDelete(u)}
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-all">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-100">
          {users.map((u) => {
            const role = ROLES[u.role] || ROLES.STAFF;
            const RoleIcon = role.icon;
            const self = u.id === me?.id;
            return (
              <MobileCard key={u.id}
                title={<>{u.name}{self && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 align-middle">คุณ</span>}</>}
                subtitle={u.email}
                chips={<>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${role.bg}`}><RoleIcon size={11} /> {role.label}</span>
                  <button onClick={() => handleToggle(u)} disabled={self}
                    className={`px-2 py-0.5 rounded-full text-xs font-bold border ${u.isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'} ${self ? 'opacity-60' : 'active:scale-95'}`}>
                    {u.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                  </button>
                </>}
                details={[['สร้างเมื่อ', u.createdAt ? fmtDate(u.createdAt) : '']]}
                actions={<>
                  <MobileEditBtn onClick={() => openEdit(u)} />
                  {!self && <MobileDelBtn onClick={() => handleDelete(u)} />}
                </>} />
            );
          })}
        </div>
      </div>

      {/* โซนอันตราย — รีเซ็ตระบบ (เห็นเฉพาะผู้ดูแลระบบ เพราะหน้านี้เปิดให้ ADMIN เท่านั้น) */}
      <DangerZone />

      {/* Modal */}
      <dialog ref={modalRef} className="modal" onCancel={(e) => { e.preventDefault(); guard.request(form); }}>
        <div className="modal-box bg-white rounded-3xl shadow-2xl p-0 max-w-md w-full overflow-hidden">
          <div className="relative px-6 py-5 flex items-center gap-4 overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#1c0a00 0%,#7c260a 60%,#e74111 100%)' }}>
            <div className="absolute inset-0 opacity-5"
              style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
            <div className="relative w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <Users size={18} className="text-white" />
            </div>
            <div className="relative flex-1">
              <h3 className="font-black text-white text-base leading-tight">
                {editing ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
              </h3>
              <p className="text-orange-200/60 text-xs mt-0.5">{editing ? editing.email : 'กรอกข้อมูลผู้ใช้'}</p>
            </div>
            <button type="button" className="relative text-white/50 hover:text-white text-xl leading-none transition-colors"
              onClick={() => guard.request(form)}>✕</button>
          </div>

          <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
            <div>
              <label className={labelCls}>ชื่อ-นามสกุล</label>
              <input className={inputCls} placeholder="ชื่อผู้ใช้" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className={labelCls}>อีเมล</label>
              <input type="email" className={inputCls} placeholder="email@example.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className={labelCls}>{editing ? 'รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่าน *'}</label>
              {/* กันพิมพ์ภาษาไทย — อนุญาตเฉพาะอังกฤษ ตัวเลข และสัญลักษณ์ (ASCII) */}
              <input type="password" className={inputCls} placeholder="อย่างน้อย 8 ตัว (ภาษาอังกฤษ/ตัวเลข/สัญลักษณ์)"
                autoComplete="new-password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value.replace(/[^\x21-\x7E]/g, '') })} />
              {form.password && form.password.length < 8 && (
                <p className="text-xs text-amber-600 mt-1">อีก {8 - form.password.length} ตัว (ต้องมีอย่างน้อย 8 ตัวอักษร)</p>
              )}
            </div>
            <div>
              <label className={labelCls}>บทบาท</label>
              <div className="relative">
                <select className={inputCls + ' appearance-none pr-9 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'} value={form.role}
                  disabled={editing?.id === me?.id}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
                  <option value="STAFF">เจ้าหน้าที่ (Staff)</option>
                  <option value="VIEWER">ผู้ดูข้อมูล (Viewer)</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {editing?.id === me?.id && (
                <p className="text-xs text-gray-400 mt-1">เปลี่ยนบทบาทของตัวเองไม่ได้ — กันเผลอลดสิทธิ์แล้วเข้าหน้านี้ไม่ได้อีก</p>
              )}
            </div>

            {err && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <span className="text-red-400 text-base">⚠</span>
                <p className="text-sm text-red-600">{err}</p>
              </div>
            )}

            {guard.asking ? <div className="pt-1"><DiscardBar guard={guard} /></div> : <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => guard.request(form)}
                className="flex-1 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-semibold transition-colors">
                ยกเลิก
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-2xl text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#e74111,#c9370c)', boxShadow: '0 4px 15px rgba(231,65,17,0.3)' }}>
                {saving
                  ? <div className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />บันทึก...</div>
                  : (editing ? 'บันทึก' : 'เพิ่มผู้ใช้')
                }
              </button>
            </div>}
          </form>
        </div>
        <form method="dialog" className="modal-backdrop"><button type="button" onClick={() => guard.request(form)}>close</button></form>
      </dialog>
    </div>
  );
}
