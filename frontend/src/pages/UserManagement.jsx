import { useEffect, useState, useRef } from 'react';
import { Users, Plus, Pencil, Trash2, ChevronDown, Shield, Eye, UserCog } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser } from '../api';
import { useAuth } from '../context/AuthContext';

const ROLES = {
  ADMIN:  { label: 'ผู้ดูแลระบบ', cls: 'badge-error',   icon: Shield },
  STAFF:  { label: 'เจ้าหน้าที่',  cls: 'badge-warning', icon: UserCog },
  VIEWER: { label: 'ผู้ดูข้อมูล',  cls: 'badge-info',    icon: Eye },
};

const empty = { name: '', email: '', password: '', role: 'STAFF' };

export default function UserManagement() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const modalRef = useRef(null);

  const load = () => getUsers().then((r) => { setUsers(r.data); setLoading(false); });

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setErr('');
    modalRef.current?.showModal();
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setErr('');
    modalRef.current?.showModal();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const data = { name: form.name, email: form.email, role: form.role };
      if (form.password) data.password = form.password;
      if (editing) {
        await updateUser(editing.id, data);
      } else {
        if (!form.password) { setErr('กรุณากรอกรหัสผ่าน'); setSaving(false); return; }
        await createUser({ ...data, password: form.password });
      }
      modalRef.current?.close();
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (u) => {
    if (u.id === me?.id) return;
    await updateUser(u.id, { isActive: !u.isActive });
    load();
  };

  const handleDelete = async (u) => {
    if (u.id === me?.id) return;
    if (!confirm(`ยืนยันลบผู้ใช้ "${u.name}"?`)) return;
    await deleteUser(u.id);
    load();
  };

  const inputCls = 'w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all';
  const labelCls = 'block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide';

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-orange-950">จัดการผู้ใช้งาน</h1>
          <p className="text-sm text-gray-400 mt-0.5">{users.length} บัญชี</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
          <Plus size={16} /> เพิ่มผู้ใช้
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
        <table className="table table-zebra w-full">
          <thead>
            <tr className="bg-orange-50 text-orange-600 text-xs uppercase tracking-wider">
              <th>ชื่อ</th>
              <th>อีเมล</th>
              <th>บทบาท</th>
              <th>สถานะ</th>
              <th>วันที่สร้าง</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const role = ROLES[u.role] || ROLES.STAFF;
              const RoleIcon = role.icon;
              return (
                <tr key={u.id} className="hover:bg-orange-50/40 transition-colors">
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center">
                        {u.name?.slice(0, 2)}
                      </div>
                      <span className="font-semibold text-orange-950 text-sm">{u.name}</span>
                      {u.id === me?.id && <span className="badge badge-xs badge-ghost">คุณ</span>}
                    </div>
                  </td>
                  <td className="text-sm text-gray-600">{u.email}</td>
                  <td>
                    <span className={`badge badge-sm font-semibold ${role.cls} gap-1`}>
                      <RoleIcon size={10} /> {role.label}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => handleToggle(u)} disabled={u.id === me?.id}
                      className={`badge badge-sm font-semibold ${u.isActive ? 'badge-success' : 'badge-ghost'} ${u.id === me?.id ? 'cursor-default' : 'cursor-pointer'}`}>
                      {u.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                    </button>
                  </td>
                  <td className="text-xs text-gray-400">{u.createdAt?.slice(0, 10)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(u)} className="btn btn-ghost btn-xs text-orange-600 hover:bg-orange-50">
                        <Pencil size={13} />
                      </button>
                      {u.id !== me?.id && (
                        <button onClick={() => handleDelete(u)} className="btn btn-ghost btn-xs text-red-400 hover:bg-red-50">
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

      <dialog ref={modalRef} className="modal">
        <div className="modal-box bg-white rounded-2xl shadow-2xl p-0 max-w-md w-full overflow-hidden">
          <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#431407,#9a3412)' }}>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Users size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">{editing ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</h3>
              <p className="text-orange-200 text-xs">{editing ? editing.email : 'กรอกข้อมูลผู้ใช้'}</p>
            </div>
            <button className="ml-auto text-white/70 hover:text-white" onClick={() => modalRef.current?.close()}>✕</button>
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
              <label className={labelCls}>{editing ? 'รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่าน'}</label>
              <input type="password" className={inputCls} placeholder="รหัสผ่าน" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>บทบาท</label>
              <div className="relative">
                <select className={inputCls + ' appearance-none pr-9'} value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
                  <option value="STAFF">เจ้าหน้าที่ (Staff)</option>
                  <option value="VIEWER">ผู้ดูข้อมูล (Viewer)</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {err && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{err}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => modalRef.current?.close()}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-semibold transition-colors">
                ยกเลิก
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm transition-colors disabled:opacity-60">
                {saving ? <span className="loading loading-spinner loading-xs" /> : (editing ? 'บันทึก' : 'เพิ่มผู้ใช้')}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>
    </div>
  );
}
