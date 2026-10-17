import { WifiOff, RotateCw } from 'lucide-react';

// กล่องแจ้ง "โหลดไม่สำเร็จ" + ปุ่มลองใหม่ — ใช้ทุกหน้า
// เดิมหลายหน้าโหลดพังแล้วหมุนค้างตลอด หรือโชว์ว่า "ไม่มีข้อมูล" ทั้งที่จริงคือโหลดไม่ขึ้น
export default function LoadError({ onRetry, message = 'โหลดข้อมูลไม่สำเร็จ', hint = 'ตรวจสอบอินเทอร์เน็ต แล้วกดลองใหม่' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center">
        <WifiOff size={24} className="text-orange-400" />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-700">{message}</p>
        {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      </div>
      {onRetry && (
        <button onClick={onRetry}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg,#e74111,#c9370c)' }}>
          <RotateCw size={14} /> ลองใหม่
        </button>
      )}
    </div>
  );
}
