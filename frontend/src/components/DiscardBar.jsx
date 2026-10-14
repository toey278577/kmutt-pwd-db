import { AlertTriangle } from 'lucide-react';

// แถบถามท้ายฟอร์ม ใช้คู่กับ useDiscardGuard (utils/useDiscardGuard.js)
export default function DiscardBar({ guard }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 w-full">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 mr-auto">
        <AlertTriangle size={16} className="flex-shrink-0" /> ยังไม่ได้บันทึก — ปิดตอนนี้ข้อมูลที่แก้จะหาย
      </p>
      <button type="button" onClick={guard.keep}
        className="px-4 py-2 rounded-xl text-sm font-bold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 active:scale-95 transition-all">
        กลับไปแก้ต่อ
      </button>
      <button type="button" onClick={guard.discard}
        className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all">
        ปิดโดยไม่บันทึก
      </button>
    </div>
  );
}
