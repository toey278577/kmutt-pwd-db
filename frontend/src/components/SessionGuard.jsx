import { useEffect, useRef, useState } from 'react';
import { Lock, Clock } from 'lucide-react';
import { login, refreshSession } from '../api';
import { useAuth } from '../context/AuthContext';
import { tokenExpiry, reloginDone, reloginCancel } from '../utils/session';

const WARN_MS = 10 * 60 * 1000;   // เตือนก่อนหมดเวลา 10 นาที

// เวลาเข้าระบบ 8 ชม. (พี่เต้ย 16 ต.ค. 69: เปิดค้างทั้งวันแล้วกดบันทึกตอนหมดเวลา เด้งออก ข้อมูลที่กรอกหาย)
// · ใกล้หมด → แถบเตือน [ใช้งานต่อ] ต่อเวลาอีก 8 ชม. ด้วยคลิกเดียว
// · หมดระหว่างใช้งาน → กล่องใส่รหัสผ่านในหน้าเดิม แล้วระบบส่งคำขอที่ค้าง (เช่น กดบันทึก) ต่อให้เอง
export default function SessionGuard() {
  const { user, token, loginSuccess, logout } = useAuth();
  const dlgRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const onExpired = () => { setPassword(''); setError(''); setOpen(true); };
    window.addEventListener('session:expired', onExpired);
    const tick = setInterval(() => setNow(Date.now()), 20000);   // ทุก 20 วิ — คอมหลับแล้วตื่นก็ยังจับได้
    return () => { window.removeEventListener('session:expired', onExpired); clearInterval(tick); };
  }, []);

  // showModal → ขึ้นบนสุดเหนือฟอร์มที่เปิดค้าง (ฟอร์มก็เป็น dialog แบบ showModal)
  useEffect(() => {
    const d = dlgRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!password) { setError('กรุณาใส่รหัสผ่าน'); return; }
    setBusy(true); setError('');
    try {
      const { data } = await login({ email: user?.email, password });
      loginSuccess(data);
      setOpen(false); setPassword('');
      reloginDone(data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally { setBusy(false); }
  };

  const leave = () => { setOpen(false); reloginCancel(); logout(); };

  const extend = async () => {
    try {
      const { data } = await refreshSession();
      loginSuccess(data); setNow(Date.now());
    } catch { /* หมดไปแล้ว → api เปิดกล่องขอรหัสผ่านให้เอง */ }
  };

  const exp = token ? tokenExpiry(token) : null;
  const left = exp != null ? exp - now : null;
  const showWarn = !!user && left != null && left < WARN_MS && !open;

  return (<>
    {showWarn && (
      <div role="status" data-session-warn
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[9997] w-[calc(100%-2rem)] max-w-md animate-pop-in">
        <div className="flex items-center gap-3 rounded-2xl bg-white border border-orange-200 shadow-xl px-4 py-3">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Clock size={17} className="text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800">
              {left > 0 ? `อีก ${Math.ceil(left / 60000)} นาทีจะหมดเวลาเข้าระบบ` : 'หมดเวลาเข้าระบบแล้ว'}
            </p>
            <p className="text-xs text-gray-500">กดใช้งานต่อได้เลย ข้อมูลที่กรอกค้างไม่หาย</p>
          </div>
          <button onClick={extend}
            className="flex-shrink-0 px-3.5 py-2 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 active:scale-95 transition-all whitespace-nowrap">
            ใช้งานต่อ
          </button>
        </div>
      </div>
    )}

    {/* Esc ปิดไม่ได้ — ต้องใส่รหัสหรือกดออกจากระบบ (ไม่งั้นคำขอที่ค้างไม่รู้จะไปทางไหน กดบันทึกซ้ำก็ไม่ขึ้นกล่องอีก)
        Chrome ไม่ยอมให้กัน Esc ถ้าผู้ใช้ยังไม่ได้คลิก/พิมพ์อะไรหลังกล่องเปิด → โดนปิดแล้วเปิดกลับทันที */}
    <dialog ref={dlgRef} data-session-dialog className="modal" onCancel={(e) => e.preventDefault()}
      onClose={() => { if (open) dlgRef.current?.showModal(); }}>
      {/* ใส่ช่องรหัสผ่านเฉพาะตอนเปิด — ปิดอยู่ก็มีในหน้า (รวมหน้าเข้าสู่ระบบ) ตัวกรอกรหัสอัตโนมัติของเบราว์เซอร์อาจไปกรอกช่องนี้แทนฟอร์มจริง */}
      {open && (
      <form onSubmit={submit} className="modal-box max-w-sm p-0 overflow-hidden bg-white shadow-2xl rounded-3xl">
        <div className="relative px-6 py-5 flex items-center gap-4 overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#1c0a00 0%,#7c2d12 60%,#ea580c 100%)' }}>
          <div className="relative w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
            <Lock size={18} color="#fff" />
          </div>
          <div className="relative">
            <h3 className="text-white font-black text-base leading-tight">หมดเวลาเข้าระบบ</h3>
            <p className="text-orange-100 text-xs mt-0.5">ใช้งานต่อเนื่องได้ครั้งละ 8 ชั่วโมง</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-600 leading-relaxed">
            ใส่รหัสผ่านเพื่อใช้งานต่อ — <span className="font-bold text-gray-800">ข้อมูลที่กรอกค้างไว้ยังอยู่ครบ</span> เข้าระบบแล้วระบบบันทึกต่อให้เอง
          </p>
          <div className="rounded-2xl bg-orange-50 border border-orange-100 px-3.5 py-2.5">
            <p className="text-sm font-bold text-gray-800 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <div>
            <label htmlFor="session-password" className="block text-xs font-bold text-gray-500 mb-1.5">รหัสผ่าน</label>
            <input id="session-password" type="password" autoComplete="current-password" value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className={`w-full rounded-2xl border px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${error ? 'border-red-400 focus:ring-red-300/40' : 'border-gray-200 focus:ring-orange-400/30 focus:border-orange-400'}`} />
            {error && <p className="text-xs text-red-600 font-semibold mt-1.5">{error}</p>}
          </div>
        </div>
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
          <button type="button" onClick={leave}
            className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-gray-500 hover:bg-gray-200 transition-all">ออกจากระบบ</button>
          <button type="submit" disabled={busy}
            className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white active:scale-95 transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)', boxShadow: '0 4px 15px rgba(234,88,12,0.3)' }}>
            {busy ? 'กำลังเข้าระบบ...' : 'ใช้งานต่อ'}
          </button>
        </div>
      </form>
      )}
    </dialog>
  </>);
}
