import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, CheckCircle2, XCircle, Shield } from 'lucide-react';
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
    <div className={`fixed top-6 left-1/2 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-sm
      transition-all duration-300
      ${ok ? 'bg-emerald-900/90 border-emerald-500/30 text-white' : 'bg-red-900/90 border-red-500/30 text-white'}`}
      style={{ transform: 'translateX(-50%)', minWidth: '300px' }}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ok ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
        {ok ? <CheckCircle2 size={20} className="text-emerald-400" /> : <XCircle size={20} className="text-red-400" />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold">{ok ? 'เข้าสู่ระบบสำเร็จ' : 'เข้าสู่ระบบไม่สำเร็จ'}</p>
        <p className="text-xs opacity-60 mt-0.5">{message}</p>
      </div>
      <button onClick={onClose} className="opacity-40 hover:opacity-80 transition-opacity text-lg leading-none ml-1">✕</button>
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
      setTimeout(() => { loginSuccess(res.data); navigate('/', { replace: true }); }, 1200);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg,#0c0400 0%,#1c0a00 40%,#431407 100%)' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* ── Left Hero (desktop only) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] relative overflow-hidden p-12">
        {/* Glow blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle,#ea580c,transparent)' }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle,#fb923c,transparent)' }} />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {/* Logo + Title */}
        <div className="relative">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
              <img src="/logo-icon.png" alt="KMUTT" className="h-10 w-10 object-contain" onError={e => { e.target.style.display='none'; }} />
            </div>
            <div>
              <p className="text-orange-400 text-xs font-bold tracking-[0.2em] uppercase">KMUTT</p>
              <p className="text-white/60 text-xs">มจธ.</p>
            </div>
          </div>

          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            ระบบฐานข้อมูล<br />
            <span style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundImage: 'linear-gradient(90deg,#fb923c,#fbbf24)' }}>
              คนพิการ
            </span>
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm">
            โครงการฝึกอบรม-ฝึกงานคนพิการ เพื่อเตรียมความพร้อม<br />
            เข้าสู่สถานประกอบการ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี
          </p>
        </div>

        {/* Feature chips */}
        <div className="relative space-y-3">
          {[
            { icon: '👥', text: 'จัดการข้อมูลคนพิการครบวงจร' },
            { icon: '📊', text: 'Dashboard สถิติ 6 มิติ แบบ real-time' },
            { icon: '📄', text: 'ออกรายงาน 4 ประเภท พิมพ์/PDF ได้ทันที' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base flex-shrink-0">
                {icon}
              </div>
              <p className="text-white/60 text-sm">{text}</p>
            </div>
          ))}

          <p className="text-white/20 text-xs pt-4">Developed by Suthat Srisawat · 2026</p>
        </div>
      </div>

      {/* ── Right Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Right glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle,#ea580c,transparent)' }} />

        <div className="w-full max-w-sm relative">
          {/* Card */}
          <div className="rounded-3xl overflow-hidden border border-white/10 backdrop-blur-xl shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.04)' }}>

            {/* Card header */}
            <div className="px-8 pt-8 pb-6 text-center border-b border-white/5">
              {/* Mobile logo */}
              <div className="lg:hidden mb-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-3">
                  <img src="/logo-icon.png" alt="KMUTT" className="h-12 w-12 object-contain"
                    onError={e => { e.target.style.display='none'; }} />
                </div>
                <p className="text-orange-400 text-xs font-bold tracking-widest uppercase mb-1">KMUTT · มจธ.</p>
              </div>

              <div className="hidden lg:flex w-14 h-14 rounded-2xl items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)', boxShadow: '0 8px 32px rgba(234,88,12,0.4)' }}>
                <Shield size={24} color="white" />
              </div>

              <h2 className="text-white font-black text-xl leading-tight mb-1">เข้าสู่ระบบ</h2>
              <p className="text-white/40 text-xs">กรุณากรอกข้อมูลเพื่อเข้าใช้งาน</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-white/40 mb-2 uppercase tracking-widest">อีเมล</label>
                <input
                  type="email"
                  placeholder="example@kmutt.ac.th"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 bg-white/5 hover:bg-white/8 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/50 transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-white/40 mb-2 uppercase tracking-widest">รหัสผ่าน</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                    className="w-full rounded-2xl border border-white/10 px-4 py-3 pr-11 text-sm text-white placeholder:text-white/20 bg-white/5 hover:bg-white/8 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/50 transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60 mt-1"
                style={{
                  background: loading ? '#9a3412' : 'linear-gradient(135deg,#ea580c,#c2410c)',
                  boxShadow: loading ? 'none' : '0 4px 24px rgba(234,88,12,0.45)',
                }}>
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />กำลังเข้าสู่ระบบ...</>
                  : <><LogIn size={16} />เข้าสู่ระบบ</>
                }
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-white/20 mt-5 leading-relaxed">
            ระบบสำหรับเจ้าหน้าที่เท่านั้น<br />
            กรุณาติดต่อผู้ดูแลระบบหากลืมรหัสผ่าน
          </p>

          {/* Server warm-up indicator */}
          {!serverReady && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400/60 animate-pulse" />
              <p className="text-xs text-white/20">กำลังเชื่อมต่อเซิร์ฟเวอร์...</p>
            </div>
          )}

          {/* Mobile credit */}
          <p className="lg:hidden text-center text-xs text-white/10 mt-2">
            Developed by Suthat Srisawat · 2026
          </p>
        </div>
      </div>
    </div>
  );
}
