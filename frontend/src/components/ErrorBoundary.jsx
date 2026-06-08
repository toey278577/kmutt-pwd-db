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
    <div className="fixed top-4 left-1/2 z-[9999] -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-orange-500/30 backdrop-blur-sm"
      style={{ background: 'rgba(28,10,0,0.92)', minWidth: 260 }}>
      <div className="w-5 h-5 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin flex-shrink-0" />
      <div>
        <p className="text-white text-sm font-bold leading-none">กำลังเชื่อมต่อเซิร์ฟเวอร์ใหม่</p>
        <p className="text-orange-300/60 text-xs mt-0.5">รอสักครู่ ระบบกำลังตื่น...</p>
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
