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
      style={{ filter: 'drop-shadow(0 0 20px rgba(234,88,12,0.8)) drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }}>
      <div className="flex items-center gap-3 px-6 py-4 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg,#ea580c 0%,#f97316 50%,#fb923c 100%)',
          boxShadow: '0 0 0 2px rgba(255,255,255,0.25), 0 12px 40px rgba(234,88,12,0.5)',
        }}>
        {/* spinner ขาวบน background ส้ม */}
        <div className="w-5 h-5 rounded-full border-[3px] border-white/30 border-t-white animate-spin flex-shrink-0" />
        <div>
          <p className="text-white font-black text-sm leading-tight tracking-wide drop-shadow-sm">
            กำลังเชื่อมต่อเซิร์ฟเวอร์...
          </p>
          <p className="text-white/80 text-xs font-semibold mt-0.5">รอสักครู่ ระบบกำลังตื่น</p>
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
