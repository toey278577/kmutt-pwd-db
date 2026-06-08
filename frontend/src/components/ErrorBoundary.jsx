import { Component, useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';

/* ── Reconnecting banner (listens to axios interceptor events) ── */
export function ReconnectingBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onReconnecting = () => setShow(true);
    const onReconnected  = () => setShow(false);
    window.addEventListener('api:reconnecting', onReconnecting);
    window.addEventListener('api:reconnected',  onReconnected);
    return () => {
      window.removeEventListener('api:reconnecting', onReconnecting);
      window.removeEventListener('api:reconnected',  onReconnected);
    };
  }, []);

  if (!show) return null;
  return (
    <div className="fixed top-5 left-1/2 z-[9999] -translate-x-1/2 animate-bounce-in">
      {/* glow pulse ด้านหลัง */}
      <div className="absolute inset-0 rounded-2xl animate-pulse"
        style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)', filter: 'blur(12px)', opacity: 0.9 }} />
      <div className="relative flex items-center gap-3 px-6 py-4 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg,#fde68a 0%,#fbbf24 40%,#f97316 100%)',
          boxShadow: '0 0 0 2px #fff, 0 0 32px rgba(251,191,36,0.9), 0 8px 24px rgba(0,0,0,0.25)',
        }}>
        <div className="w-5 h-5 rounded-full border-[3px] border-orange-900/30 border-t-orange-900 animate-spin flex-shrink-0" />
        <div>
          <p className="font-black text-sm leading-tight tracking-wide" style={{ color: '#431407' }}>
            กำลังเชื่อมต่อเซิร์ฟเวอร์...
          </p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: '#7c2d12' }}>รอสักครู่ ระบบกำลังตื่น</p>
        </div>
      </div>
    </div>
  );
}

/* ── ErrorBoundary — catches React rendering errors ── */
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center"
        style={{ background: '#fff7ed' }}>
        <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center">
          <WifiOff size={28} className="text-orange-500" />
        </div>
        <div>
          <p className="text-gray-800 font-bold text-lg">เกิดข้อผิดพลาด</p>
          <p className="text-gray-500 text-sm mt-1">กรุณารีเฟรชหน้าเว็บเพื่อลองใหม่</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold"
          style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>
          <RefreshCw size={15} />
          รีเฟรช
        </button>
      </div>
    );
  }
}
