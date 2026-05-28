import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, CheckCircle2, XCircle } from 'lucide-react';
import { login } from '../api';
import { useAuth } from '../context/AuthContext';

function Toast({ type, message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, []);

  const isSuccess = type === 'success';
  return (
    <div className={`fixed top-6 left-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border
      transition-all duration-300 animate-bounce-in
      ${isSuccess
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : 'bg-red-50 border-red-200 text-red-800'
      }`}
      style={{
        transform: 'translateX(-50%)',
        minWidth: '280px',
        backdropFilter: 'blur(8px)',
      }}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
        ${isSuccess ? 'bg-emerald-100' : 'bg-red-100'}`}>
        {isSuccess
          ? <CheckCircle2 size={20} className="text-emerald-600" />
          : <XCircle size={20} className="text-red-500" />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold">
          {isSuccess ? 'เข้าสู่ระบบสำเร็จ' : 'เข้าสู่ระบบไม่สำเร็จ'}
        </p>
        <p className="text-xs opacity-70 mt-0.5">{message}</p>
      </div>
      <button onClick={onClose} className="opacity-40 hover:opacity-70 transition-opacity text-lg leading-none ml-1">✕</button>
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

  const showToast = (type, message) => setToast({ type, message });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);
    try {
      const res = await login(form);
      showToast('success', `ยินดีต้อนรับ ${res.data.user?.name || ''}`);
      setTimeout(() => {
        loginSuccess(res.data);
        navigate('/', { replace: true });
      }, 1200);
    } catch (err) {
      showToast('error', err.response?.data?.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 px-4">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-orange-100">
          <div className="px-8 pt-8 pb-6 text-center" style={{ background: 'linear-gradient(135deg,#431407,#9a3412)' }}>
            <img src="/logo.jpg" alt="KMUTT" className="h-14 mx-auto mb-3 object-contain rounded-xl bg-white/10 p-1" />
            <h1 className="text-white font-black text-lg leading-tight">ระบบฐานข้อมูลคนพิการ</h1>
            <p className="text-orange-200 text-xs mt-0.5">มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">อีเมล</label>
              <input
                type="email"
                placeholder="กรอกอีเมล"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">รหัสผ่าน</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="กรอกรหัสผ่าน"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 pr-10 text-sm text-gray-800 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? <span className="loading loading-spinner loading-sm" /> : <LogIn size={16} />}
              เข้าสู่ระบบ
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          ระบบสำหรับเจ้าหน้าที่เท่านั้น — กรุณาติดต่อผู้ดูแลระบบหากลืมรหัสผ่าน
        </p>
        <p className="text-center text-xs text-gray-300 mt-2">
          Developed by Suthat Srisawat 2026
        </p>
      </div>
    </div>
  );
}
