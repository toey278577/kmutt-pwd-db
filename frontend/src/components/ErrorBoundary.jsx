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
    <div className="fixed top-5 left-1/2 z-[9999] -translate-x-1/2 animate-bounce-in"
      style={{ filter: 'drop-shadow(0 0 24px rgba(234,88,12,0.55))' }}>
      <div className="flex items-center gap-3.5 px-5 py-3.5 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg,#1c0a00 0%,#7c2d12 100%)',
          boxShadow: '0 0 0 1px rgba(234,88,12,0.45), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
        {/* spinner ส้มลุก */}
        <div className="relative flex-shrink-0">
          <div className="w-7 h-7 rounded-full border-2 border-orange-900 border-t-orange-400 animate-spin" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-600/40 animate-spin"
            style={{ animationDuration: '0.6s' }} />
        </div>
        <div>
          <p className="text-sm font-black tracking-wide leading-tight"
            style={{ background: 'linear-gradient(90deg,#fb923c,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            กำลังเชื่อมต่อเซิร์ฟเวอร์
          </p>
          <p className="text-orange-300/70 text-xs font-medium mt-0.5 tracking-wide">รอสักครู่ ระบบกำลังตื่น...</p>
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
