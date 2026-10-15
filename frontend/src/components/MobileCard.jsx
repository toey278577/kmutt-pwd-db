import { Pencil, Trash2 } from 'lucide-react';

// การ์ดแทนแถวตารางบนมือถือ (จอคอมยังเป็นตาราง) — เดิมตารางหลายคอลัมน์ต้องเลื่อนข้าง ชื่อ/ป้ายแตกหลายบรรทัด
// ใช้: <div className="md:hidden divide-y divide-gray-100"> {rows.map(r => <MobileCard ... />)} </div>
//   avatar   รูป/ไอคอนหน้าชื่อ (ไม่ใส่ก็ได้)   title / subtitle  ชื่อหลัก + บรรทัดรอง
//   chips    ป้ายเล็กๆ (วันที่ สถานะ)        details  [['หัวข้อ', ค่า], ...] โชว์เฉพาะที่มีค่า
//   actions  ปุ่มด้านขวา (MobileEditBtn / MobileDelBtn)   onClick  กดทั้งการ์ด (เช่น ไปหน้ารายละเอียด)
export default function MobileCard({ avatar, title, subtitle, chips, details = [], actions, onClick }) {
  const shown = details.filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== false);
  const clickable = !!onClick;
  return (
    <div
      data-card
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
      className={`p-4 flex items-start gap-3 ${clickable ? 'cursor-pointer active:bg-orange-50/50' : ''}`}>
      {avatar}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-800 text-[15px] leading-snug break-words">{title}</p>
        {subtitle && <p className="text-gray-500 text-xs mt-0.5 break-words">{subtitle}</p>}
        {chips && <div className="flex flex-wrap items-center gap-1.5 mt-1.5">{chips}</div>}
        {shown.length > 0 && (
          <dl className="mt-2 space-y-0.5 text-[13px]">
            {shown.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-gray-500 flex-shrink-0">{k}</dt>
                <dd className="text-gray-800 min-w-0 break-words">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {actions && <div className="flex flex-col gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>{actions}</div>}
    </div>
  );
}


// ปุ่มใหญ่ 40px กดง่ายบนมือถือ (แบบเดียวกับการ์ดหน้ารายชื่อคนพิการ)
export function MobileEditBtn({ onClick }) {
  return (
    <button type="button" title="แก้ไข" onClick={onClick}
      className="w-10 h-10 rounded-xl flex items-center justify-center text-amber-600 bg-amber-50 border border-amber-100 active:scale-95">
      <Pencil size={16} />
    </button>
  );
}
export function MobileDelBtn({ onClick }) {
  return (
    <button type="button" title="ลบ" onClick={onClick}
      className="w-10 h-10 rounded-xl flex items-center justify-center text-red-500 bg-red-50 border border-red-100 active:scale-95">
      <Trash2 size={16} />
    </button>
  );
}
