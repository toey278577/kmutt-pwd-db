import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, CheckCircle2, XCircle, Mail, Lock, Users, BarChart3, FileText } from 'lucide-react';
import { login, getHealth } from '../api';
import { useAuth } from '../context/AuthContext';

/* ── Toast ── */
function Toast({ type, message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, []);

  const ok = type === 'success';
  return (
    <div className={`fixed top-6 left-1/2 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-md
      animate-[toastIn_.3s_ease-out]
      ${ok ? 'bg-emerald-600/95 border-emerald-400/30 text-white' : 'bg-red-600/95 border-red-400/30 text-white'}`}
      style={{ transform: 'translateX(-50%)', minWidth: '300px' }}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ok ? 'bg-white/20' : 'bg-white/20'}`}>
        {ok ? <CheckCircle2 size={20} className="text-white" /> : <XCircle size={20} className="text-white" />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold">{ok ? 'เข้าสู่ระบบสำเร็จ' : 'เข้าสู่ระบบไม่สำเร็จ'}</p>
        <p className="text-xs opacity-70 mt-0.5">{message}</p>
      </div>
      <button onClick={onClose} className="opacity-50 hover:opacity-90 transition-opacity text-lg leading-none ml-1">✕</button>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { loginSuccess } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [serverReady, setServerReady] = useState(false);

  // Pre-warm Render.com backend ทันทีที่ page load
  useEffect(() => {
    getHealth()
      .then(() => setServerReady(true))
      .catch(() => setServerReady(true)); // ถ้า error ก็ถือว่าพยายามแล้ว
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);
    try {
      const res = await login(form);
      setToast({ type: 'success', message: `ยินดีต้อนรับ ${res.data.user?.name || ''}` });
      // ถ้า server ยังไม่ ready → รอให้ health check เสร็จก่อน (max 8s) แล้วค่อย navigate
      const waitReady = serverReady
        ? Promise.resolve()
        : getHealth().catch(() => {}).then(() => new Promise(r => setTimeout(r, 300)));
      waitReady.then(() => { loginSuccess(res.data); navigate('/', { replace: true }); });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-orange-50/40 overflow-hidden">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* ════════ LEFT — BRAND PANEL (desktop) ════════ */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden p-12"
        style={{ background: 'linear-gradient(140deg,#7c2d12 0%,#c2410c 48%,#ea580c 100%)' }}>

        {/* animated floating blobs */}
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none animate-[float1_14s_ease-in-out_infinite]"
          style={{ background: 'radial-gradient(circle,#fbbf24,transparent 70%)' }} />
        <div className="absolute bottom-0 -right-16 w-[28rem] h-[28rem] rounded-full opacity-25 blur-3xl pointer-events-none animate-[float2_18s_ease-in-out_infinite]"
          style={{ background: 'radial-gradient(circle,#fb923c,transparent 70%)' }} />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none animate-[float1_20s_ease-in-out_infinite_reverse]"
          style={{ background: 'radial-gradient(circle,#fdba74,transparent 70%)' }} />
        {/* dot grid */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '34px 34px' }} />

        {/* Logo + Title */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-14">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-2xl ring-4 ring-white/20">
              <img src="/logo-kmutt-round.jpg" alt="KMUTT" className="h-12 w-12 object-contain rounded-full"
                onError={e => { e.target.style.display='none'; }} />
            </div>
            <div>
              <p className="text-white text-sm font-black tracking-[0.2em] uppercase">KMUTT</p>
              <p className="text-orange-100/70 text-xs">มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี</p>
            </div>
          </div>

          <h1 className="text-[2.7rem] font-black text-white leading-[1.1] mb-5 drop-shadow-sm">
            ระบบฐานข้อมูล<br />
            <span style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundImage: 'linear-gradient(90deg,#fff7ed,#fde68a)' }}>
              คนพิการ มจธ.
            </span>
          </h1>
          <p className="text-white/70 text-sm leading-relaxed max-w-md">
            โครงการฝึกอบรม-ฝึกงานคนพิการ เพื่อเตรียมความพร้อม
            เข้าสู่สถานประกอบการอย่างมีคุณภาพและยั่งยืน
          </p>
        </div>

        {/* Feature chips */}
        <div className="relative z-10 space-y-3.5">
          {[
            { icon: Users, text: 'จัดการข้อมูลคนพิการครบวงจร แยกตามรุ่น' },
            { icon: BarChart3, text: 'Dashboard สถิติแบบ real-time พร้อมประเมินทักษะ' },
            { icon: FileText, text: 'ออกรายงาน & ใบ Certificate พิมพ์/PDF ได้ทันที' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3.5 group">
              <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:bg-white/25 transition-colors">
                <Icon size={18} className="text-white" />
              </div>
              <p className="text-white/85 text-sm font-medium">{text}</p>
            </div>
          ))}
          {/* ป้ายเวอร์ชัน — LIVE + แสงวิ่งผ่าน */}
          <div className="flex items-center gap-3 pt-5 flex-wrap">
            <span className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full
              bg-white/10 border border-white/25 backdrop-blur-md overflow-hidden animate-glow-pulse">
              {/* แสงวิ่งผ่าน */}
              <span className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine pointer-events-none" />
              {/* จุดเขียวเต้น */}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"
                  style={{ boxShadow: '0 0 8px 2px rgba(52,211,153,0.8)' }} />
              </span>
              <span className="relative text-emerald-200 text-[10px] font-black tracking-[0.2em]">LIVE</span>
              <span className="relative w-px h-3.5 bg-white/25" />
              <span className="relative text-white text-xs font-black tracking-wider">v{__APP_VERSION__}</span>
            </span>
            <p className="text-white/40 text-xs">Developed by Suthat Srisawat · 2026</p>
          </div>
        </div>
      </div>

      {/* ════════ RIGHT — FORM PANEL ════════ */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* soft accent glows */}
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle,#fed7aa,transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle,#fdba74,transparent 70%)' }} />

        <div className="w-full max-w-sm relative z-10 animate-[cardIn_.5s_ease-out]">
          {/* Card */}
          <div className="relative">
            {/* static gradient ring (ขอบไล่สีคม สะอาด) */}
            <div className="absolute -inset-[1.5px] rounded-[2rem] pointer-events-none"
              style={{ background: 'linear-gradient(135deg,#fdba74,#f97316,#ea580c,#fb923c)' }} />

            <div className="relative rounded-[1.9rem] bg-white/95 backdrop-blur-xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(234,88,12,0.35)]">
              {/* top sheen line */}
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/70 to-transparent" />

              {/* Header */}
              <div className="px-8 pt-9 pb-6 text-center">
                <div className="relative mx-auto mb-5 w-[4.75rem] h-[4.75rem]">
                  {/* pulsing glow behind logo */}
                  <div className="absolute inset-0 rounded-[1.4rem] blur-xl opacity-70 animate-[pulseGlow_3.2s_ease-in-out_infinite]"
                    style={{ background: 'radial-gradient(circle,#fb923c,transparent 70%)' }} />
                  {/* floating logo */}
                  <div className="relative w-[4.75rem] h-[4.75rem] rounded-[1.4rem] flex items-center justify-center shadow-xl ring-1 ring-orange-100 animate-[floaty_5s_ease-in-out_infinite]"
                    style={{ background: 'linear-gradient(135deg,#ffffff,#fff7ed)' }}>
                    <img src="/logo-kmutt-round.jpg" alt="KMUTT" className="h-14 w-14 object-contain rounded-full"
                      onError={e => { e.target.style.display='none'; }} />
                  </div>
                </div>
                <h2 className="font-black text-[1.7rem] leading-tight mb-1.5"
                  style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundImage: 'linear-gradient(120deg,#9a3412,#ea580c 55%,#f97316)' }}>
                  ยินดีต้อนรับ 👋
                </h2>
                <p className="text-gray-400 text-sm">เข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">อีเมล</label>
                  <div className="group relative">
                    <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300 group-focus-within:text-orange-500 group-focus-within:scale-110 transition-all pointer-events-none z-10" />
                    <input
                      type="email"
                      placeholder="example@kmutt.ac.th"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                      autoComplete="email"
                      className="w-full rounded-2xl border border-gray-200 pl-11 pr-4 py-3.5 text-sm text-gray-800 placeholder:text-gray-300 bg-gray-50/80 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-400/20 focus:border-orange-400 focus:shadow-[0_6px_22px_-8px_rgba(234,88,12,0.5)] transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">รหัสผ่าน</label>
                  <div className="group relative">
                    <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300 group-focus-within:text-orange-500 group-focus-within:scale-110 transition-all pointer-events-none z-10" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      required
                      autoComplete="current-password"
                      className="w-full rounded-2xl border border-gray-200 pl-11 pr-11 py-3.5 text-sm text-gray-800 placeholder:text-gray-300 bg-gray-50/80 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-400/20 focus:border-orange-400 focus:shadow-[0_6px_22px_-8px_rgba(234,88,12,0.5)] transition-all"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-orange-500 transition-colors z-10">
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Submit — shine sweep */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full overflow-hidden py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_34px_-6px_rgba(234,88,12,0.6)] active:scale-[0.98] disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none !mt-6"
                  style={{
                    background: loading ? '#9a3412' : 'linear-gradient(135deg,#fb923c,#ea580c 55%,#c2410c)',
                    boxShadow: loading ? 'none' : '0 6px 22px -4px rgba(234,88,12,0.55)',
                  }}>
                  {/* periodic light sweep */}
                  {!loading && (
                    <span className="pointer-events-none absolute top-0 -left-1/3 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-[btnShine_3.5s_ease-in-out_infinite]" />
                  )}
                  <span className="relative flex items-center justify-center gap-2.5">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />กำลังเข้าสู่ระบบ...</>
                      : <><LogIn size={16} className="group-hover:translate-x-0.5 transition-transform" />เข้าสู่ระบบ</>
                    }
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-400 mt-5 leading-relaxed">
            ระบบสำหรับเจ้าหน้าที่เท่านั้น · กรุณาติดต่อผู้ดูแลระบบหากลืมรหัสผ่าน
          </p>

          {/* Server warm-up indicator */}
          {!serverReady && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              <p className="text-xs text-gray-400">กำลังเชื่อมต่อเซิร์ฟเวอร์...</p>
            </div>
          )}

          {/* Mobile credit + เวอร์ชัน */}
          <p className="lg:hidden text-center text-xs text-gray-300 mt-2">
            Developed by Suthat Srisawat · 2026
          </p>
          <p className="lg:hidden text-center text-[11px] text-gray-400 font-bold tracking-wider mt-1">
            v{__APP_VERSION__}
          </p>
        </div>
      </div>

      {/* animations */}
      <style>{`
        @keyframes float1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-20px) scale(1.08); } }
        @keyframes float2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-25px,20px) scale(1.1); } }
        @keyframes cardIn { from { opacity: 0; transform: translateY(16px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%,-12px); } to { opacity: 1; transform: translate(-50%,0); } }
        @keyframes spinSlow { to { transform: rotate(360deg); } }
        @keyframes pulseGlow { 0%,100% { opacity: .5; transform: scale(.92); } 50% { opacity: .85; transform: scale(1.06); } }
        @keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes btnShine { 0% { left: -33%; } 55%,100% { left: 130%; } }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[spinSlow_7s_linear_infinite\\],
          .animate-\\[pulseGlow_3\\.2s_ease-in-out_infinite\\],
          .animate-\\[floaty_5s_ease-in-out_infinite\\],
          .animate-\\[btnShine_3\\.5s_ease-in-out_infinite\\] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
