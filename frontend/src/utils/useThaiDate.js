import { useState } from 'react';
import { formatDigits, isoToDisplay, parseThaiDigits } from './thaiDate';

// state ของช่องวันที่ พ.ศ. — ใช้ทุกช่องวันที่ในระบบ
// คืน display (สิ่งที่โชว์ในช่อง), onInput (ผูกกับ onChange ของ input), msg ({ type: 'error'|'hint', text } | null)
//
// ส่งค่าออก (onChange) เฉพาะวันที่ถูกต้องเท่านั้น — พิมพ์ไม่ครบหรือผิด ส่ง '' ออกไป
// (เดิมพิมพ์ทับวันเดิมไม่ครบ แล้วกดบันทึก ค่าเก่ายังถูกบันทึกทั้งที่ช่องโชว์อย่างอื่น)
export function useThaiDate(value, onChange, opts) {
  const [display, setDisplay] = useState(() => isoToDisplay(value));
  const [msg, setMsg] = useState(null);
  const [seen, setSeen] = useState(value);        // ค่าล่าสุดจาก props ที่เห็นแล้ว
  const [emitted, setEmitted] = useState(value);  // ค่าล่าสุดที่ช่องนี้ส่งออกไปเอง

  // ค่าเปลี่ยนจากข้างนอก (เช่นเปิดฟอร์มแก้ไขคนใหม่) → โชว์ค่าใหม่
  // แต่ถ้าเป็นค่าที่ช่องนี้เพิ่งส่งออกไปเอง (เช่น '' ตอนพิมพ์ยังไม่ครบ) ห้ามล้างสิ่งที่กำลังพิมพ์
  if (value !== seen) {
    setSeen(value);
    if (value !== emitted) {
      setDisplay(isoToDisplay(value));
      setMsg(null);
    }
  }

  const onInput = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    setDisplay(formatDigits(raw));
    const r = parseThaiDigits(raw, opts);
    setMsg(r.error ? { type: 'error', text: r.error } : r.incomplete ? { type: 'hint', text: 'กรอกให้ครบ วว/ดด/ปปปป' } : null);
    const iso = r.iso || '';
    setEmitted(iso);
    if (iso !== (value || '')) onChange(iso);
  };

  return { display, onInput, msg };
}
