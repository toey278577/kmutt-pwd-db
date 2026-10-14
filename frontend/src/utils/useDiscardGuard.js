import { useRef, useState } from 'react';

// กันข้อมูลในฟอร์มหายเพราะกดพลาด (คลิกพื้นที่มืด / กด Esc / กดยกเลิก)
// เดิมฟอร์มคนพิการเกือบ 30 ช่อง ปิดทันทีที่คลิกนอกฟอร์ม พิมพ์มาทั้งหมดหาย
//
// ใช้: const guard = useDiscardGuard(close)
//      เปิดฟอร์ม → guard.arm(ค่าเริ่มต้น)    ปิด → guard.request(ค่าปัจจุบัน)
//      แสดง <DiscardBar guard={guard} /> (components/DiscardBar.jsx) แทนปุ่มท้ายฟอร์มเมื่อ guard.asking
// (ถามในฟอร์มเอง ไม่ใช้ toast.confirm เพราะหน้าต่าง <dialog> อยู่ชั้นบนสุด กล่องยืนยันจะไปอยู่ข้างหลัง)
// เทียบแบบไม่สนช่องว่าง ไม่สนลำดับช่อง และ 12 กับ "12" ถือว่าเท่ากัน — พิมพ์แล้วลบออกจนว่าง ถือว่ายังไม่ได้แก้
const fingerprint = (state) => JSON.stringify(state, (_k, v) => (
  typeof v === 'number' ? String(v)
  : v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '' && x != null).sort(([a], [b]) => (a < b ? -1 : 1)))
    : v
));

export function useDiscardGuard(close) {
  const snapshot = useRef(null);
  const [asking, setAsking] = useState(false);
  const arm = (state) => { snapshot.current = fingerprint(state); setAsking(false); };
  const request = (state) => {
    if (snapshot.current !== null && fingerprint(state) !== snapshot.current) setAsking(true);
    else close();
  };
  return {
    asking,
    arm,
    request,
    keep: () => setAsking(false),
    discard: () => { setAsking(false); close(); },
  };
}
