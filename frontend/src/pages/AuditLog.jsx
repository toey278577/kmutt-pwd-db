import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getAuditLogs, getUsers } from '../api';

const ACTIONS = {
  CREATE:       { label: 'เพิ่ม',              cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  UPDATE:       { label: 'แก้ไข',              cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  DELETE:       { label: 'ลบ',                cls: 'bg-red-100 text-red-700 border-red-200' },
  IMPORT:       { label: 'นำเข้า Excel',       cls: 'bg-sky-100 text-sky-700 border-sky-200' },
  RESET:        { label: 'ล้างข้อมูลทั้งหมด',   cls: 'bg-red-600 text-white border-red-700' },
  LOGIN:        { label: 'เข้าสู่ระบบ',         cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  LOGIN_FAILED: { label: 'ล็อกอินไม่สำเร็จ',    cls: 'bg-rose-100 text-rose-700 border-rose-200' },
};

const ENTITIES = {
  person: 'ข้อมูลคนพิการ', disability: 'ข้อมูลความพิการ', training: 'ประวัติอบรม',
  workexp: 'ประสบการณ์งาน', followup: 'ติดตามผล', skills: 'ทักษะ', personorg: 'สถานประกอบการของคน',
  photos: 'รูปถ่าย', assessments: 'ผลประเมิน', organization: 'สถานประกอบการ', batch: 'รุ่นอบรม',
  course: 'หลักสูตร', user: 'ผู้ใช้งาน', system: 'ระบบ', auth: 'บัญชี',
};

const PAGE_SIZE = 50;
const inputCls = 'rounded-xl border border-gray-100 px-3 py-2 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all';
const emptyFilter = { q: '', action: '', userId: '', from: '', to: '' };

const fmtTime = (iso) => new Date(iso).toLocaleString('th-TH', {
  day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
});

export default function AuditLog() {
  const [filter, setFilter] = useState(emptyFilter);
  const [q, setQ] = useState('');            // ช่องค้นหา — หน่วงก่อนยิง API
  const [page, setPage] = useState(1);
  // เก็บผลพร้อม key ของเงื่อนไขที่โหลดมา — key ไม่ตรงกับปัจจุบัน = กำลังโหลด
  const [result, setResult] = useState({ key: null, data: { items: [], total: 0 }, err: '' });
  const [users, setUsers] = useState([]);
  const key = JSON.stringify({ filter, page });
  const { data, err } = result;
  const loading = result.key !== key;

  useEffect(() => { getUsers().then((r) => setUsers(r.data)).catch(() => {}); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilter((f) => (f.q === q ? f : { ...f, q }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const params = { page, pageSize: PAGE_SIZE };
    for (const [k, v] of Object.entries(filter)) if (v) params[k] = v;
    getAuditLogs(params)
      .then((r) => setResult({ key, data: r.data, err: '' }))
      .catch((e) => setResult((prev) => ({ key, data: prev.data, err: e.response?.data?.error || 'โหลดประวัติไม่สำเร็จ' })));
  }, [key, filter, page]);

  const set = (k) => (e) => { setFilter((f) => ({ ...f, [k]: e.target.value })); setPage(1); };
  const clear = () => { setFilter(emptyFilter); setQ(''); setPage(1); };
  const hasFilter = q || Object.values(filter).some(Boolean);
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
          <History size={22} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-black page-title leading-tight">ประวัติการใช้งาน</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            ใครเพิ่ม แก้ไข ลบข้อมูลอะไร เมื่อไหร่ — ทั้งหมด <span className="text-orange-600 font-bold">{data.total.toLocaleString()}</span> รายการ
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl border border-orange-100/80 shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อคนพิการ / ผู้ใช้"
            className={`${inputCls} w-full pl-9`} />
        </div>
        <select value={filter.action} onChange={set('action')} className={inputCls}>
          <option value="">ทุกการกระทำ</option>
          {Object.entries(ACTIONS).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}
        </select>
        <select value={filter.userId} onChange={set('userId')} className={inputCls}>
          <option value="">ผู้ใช้ทุกคน</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          ตั้งแต่ <input type="date" value={filter.from} onChange={set('from')} className={inputCls} />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          ถึง <input type="date" value={filter.to} onChange={set('to')} className={inputCls} />
        </label>
        {hasFilter && (
          <button onClick={clear} className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-all">
            <X size={14} /> ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-orange-100/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '720px' }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['เวลา', 'ผู้ใช้', 'การกระทำ', 'ข้อมูล', 'รายการ', 'IP'].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={loading ? 'opacity-50' : ''}>
              {data.items.map((l) => {
                const a = ACTIONS[l.action] || { label: l.action, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
                return (
                  <tr key={l.id} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtTime(l.createdAt)}</td>
                    <td className="px-4 py-3 font-bold text-gray-800">{l.userName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${a.cls}`}>{a.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{ENTITIES[l.entity] || l.entity}</td>
                    <td className="px-4 py-3 text-gray-800">
                      {l.personId && !(l.entity === 'person' && l.action === 'DELETE')
                        ? <Link to={`/persons/${l.personId}`} className="text-orange-600 hover:underline font-medium">{l.label || `#${l.personId}`}</Link>
                        : (l.label || '—')}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{l.ip || '—'}</td>
                  </tr>
                );
              })}
              {!loading && data.items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  {err || (hasFilter ? 'ไม่พบรายการตามตัวกรอง' : 'ยังไม่มีประวัติการใช้งาน')}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
            <span className="text-gray-400">หน้า {page} / {pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="p-2 rounded-xl border border-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40 disabled:pointer-events-none transition-all">
                <ChevronLeft size={16} />
              </button>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
                className="p-2 rounded-xl border border-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40 disabled:pointer-events-none transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
