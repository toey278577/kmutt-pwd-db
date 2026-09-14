import { useState, useRef, useEffect } from 'react';
import { AlertTriangle, RotateCcw, ShieldAlert, Database, X, Loader2 } from 'lucide-react';
import { getSystemStats, resetSystem } from '../api';
import { useToast } from '../context/ToastContext';

const CONFIRM_TEXT = 'ล้างข้อมูลทั้งหมด';

const ROWS = [
  { key: 'persons',       label: 'ข้อมูลคนพิการ',        note: 'รวมรูปถ่าย ความพิการ อบรม ทักษะ งาน ติดตามผล' },
  { key: 'batches',       label: 'รุ่น',                 note: 'รวมหลักสูตรในรุ่น' },
  { key: 'courses',       label: 'หลักสูตร',             note: '' },
  { key: 'trainings',     label: 'ประวัติการอบรม',        note: '' },
  { key: 'followUps',     label: 'ผลการติดตาม',          note: '' },
  { key: 'assessments',   label: 'ผลประเมินทักษะ',        note: '' },
  { key: 'organizations', label: 'สถานประกอบการ',        note: '' },
];

export default function DangerZone() {
  const toast = useToast();
  const dlg = useRef(null);
  const [stats, setStats] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [keepUsers, setKeepUsers] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { getSystemStats().then((r) => setStats(r.data)).catch(() => {}); }, []);

  const open = () => {
    setConfirmText(''); setPassword(''); setKeepUsers(true); setErr('');
    getSystemStats().then((r) => setStats(r.data)).catch(() => {});
    dlg.current?.showModal();
  };

  const total = stats ? ROWS.reduce((sum, r) => sum + (stats[r.key] || 0), 0) : 0;
  const ready = confirmText.trim() === CONFIRM_TEXT && password.length > 0 && !busy;

  const handleReset = async () => {
    if (!ready) return;

    // ด่านสุดท้าย — ถามย้ำอีกครั้งกันมือลั่น
    const yes = await toast.confirm({
      title: 'แน่ใจนะว่าจะล้างข้อมูลทั้งหมด?',
      message: `ข้อมูล ${total.toLocaleString()} รายการจะถูกลบทันที และย้อนกลับเองไม่ได้`
        + `${keepUsers ? '' : ' รวมถึงบัญชีผู้ใช้งานคนอื่นด้วย'}`
        + ' — ระบบจะสำรองข้อมูลไว้ให้ก่อนลบ หากต้องการกู้คืนให้ติดต่อผู้ดูแลระบบ',
    });
    if (!yes) return;

    setBusy(true); setErr('');
    try {
      const { data } = await resetSystem({ password, confirmText: confirmText.trim(), keepUsers });
      dlg.current?.close();
      toast.success(`ล้างข้อมูลสำเร็จ ${data.total} รายการ`, `สำรองไว้ที่ ${data.backupFile} แล้ว`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      const msg = e.response?.data?.error || 'เกิดข้อผิดพลาด';
      setErr(msg);
      toast.error('ล้างข้อมูลไม่สำเร็จ', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* การ์ดโซนอันตราย */}
      <div className="bg-white rounded-3xl border-2 border-red-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-red-50/60 border-b border-red-100 flex items-center gap-2.5">
          <ShieldAlert size={17} className="text-red-500 flex-shrink-0" />
          <h2 className="text-sm font-black text-red-700">โซนอันตราย</h2>
          <span className="text-xs text-red-400 font-semibold">เฉพาะผู้ดูแลระบบ</span>
        </div>

        <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <RotateCcw size={15} className="text-red-500" /> รีเซ็ตระบบ (เริ่มต้นใหม่)
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              ล้างข้อมูลทั้งหมดให้เหมือนเพิ่งติดตั้งระบบใหม่ — คนพิการ รุ่น หลักสูตร การอบรม ติดตามผล
              ผลประเมิน และสถานประกอบการ จะถูกลบทั้งหมด
              <br />
              <span className="text-green-600 font-semibold">บัญชีผู้ใช้งานและประเภทความพิการยังอยู่</span>
              {' · '}
              <span className="text-gray-400">ระบบสำรองข้อมูลให้อัตโนมัติก่อนลบ</span>
            </p>
            {stats && (
              <p className="text-xs text-gray-400 mt-2">
                ตอนนี้มีข้อมูลที่จะถูกลบรวม <b className="text-red-500">{total.toLocaleString()}</b> รายการ
              </p>
            )}
          </div>
          <button onClick={open}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-sm flex-shrink-0">
            <RotateCcw size={15} /> รีเซ็ตระบบ
          </button>
        </div>
      </div>

      {/* กล่องยืนยัน */}
      <dialog ref={dlg} className="modal">
        <div className="modal-box max-w-lg rounded-3xl p-0 overflow-hidden bg-white">
          <div className="px-6 py-4 bg-red-600 text-white flex items-center gap-3">
            <AlertTriangle size={20} className="flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-black text-base leading-tight">ยืนยันการรีเซ็ตระบบ</h3>
              <p className="text-xs text-red-100 mt-0.5">การกระทำนี้ลบข้อมูลจริง ย้อนกลับเองไม่ได้</p>
            </div>
            <button onClick={() => dlg.current?.close()} className="text-white/70 hover:text-white"><X size={20} /></button>
          </div>

          <div className="p-6 space-y-4">
            {/* สรุปสิ่งที่จะถูกลบ */}
            <div className="rounded-2xl border border-red-100 overflow-hidden">
              <div className="px-4 py-2 bg-red-50 text-xs font-bold text-red-700 flex items-center gap-1.5">
                <Database size={13} /> ข้อมูลที่จะถูกลบ
              </div>
              <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                {ROWS.map((r) => (
                  <div key={r.key} className="px-4 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700">{r.label}</p>
                      {r.note && <p className="text-[11px] text-gray-400 truncate">{r.note}</p>}
                    </div>
                    <span className="text-sm font-bold text-red-600 flex-shrink-0">
                      {stats ? (stats[r.key] ?? 0).toLocaleString() : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ตัวเลือกบัญชีผู้ใช้ */}
            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={!keepUsers} onChange={(e) => setKeepUsers(!e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-red-600 flex-shrink-0" />
              <span className="text-xs text-gray-600 leading-relaxed">
                ลบบัญชีผู้ใช้งานคนอื่นด้วย ({stats ? Math.max((stats.users || 1) - 1, 0) : '—'} บัญชี)
                <br />
                <span className="text-gray-400">บัญชีของคุณจะยังอยู่เสมอ เพื่อให้เข้าระบบต่อได้</span>
              </span>
            </label>

            {/* ด่านยืนยัน */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                พิมพ์ <span className="text-red-600 font-black">{CONFIRM_TEXT}</span> เพื่อยืนยัน
              </label>
              <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_TEXT} autoComplete="off"
                className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-all" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">รหัสผ่านของคุณ</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-all" />
            </div>

            {err && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                <AlertTriangle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600">{err}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => dlg.current?.close()} disabled={busy}
                className="flex-1 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-semibold transition-colors disabled:opacity-60">
                ยกเลิก
              </button>
              <button type="button" onClick={handleReset} disabled={!ready}
                className="flex-1 py-2.5 rounded-2xl text-white font-bold text-sm bg-red-600 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
                {busy
                  ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" />กำลังล้างข้อมูล...</span>
                  : 'ล้างข้อมูลทั้งหมด'}
              </button>
            </div>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>
    </>
  );
}
