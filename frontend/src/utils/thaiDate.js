// ตรวจ/แปลงวันที่ที่ผู้ใช้พิมพ์เป็น วว/ดด/ปปปป (พ.ศ.) — ใช้ร่วมกันทุกช่องวันที่ในระบบ
// เดิมแต่ละหน้ามีตัวแปลงของตัวเอง ไม่ตรวจอะไรเลย: พิมพ์ 31/02 ก็รับ, เผลอพิมพ์ปี ค.ศ. 2026 → กลายเป็นปี 1483

const pad = (n) => String(n).padStart(2, '0');

// ตัวเลขล้วน (สูงสุด 8 หลัก) → "วว/ดด/ปปปป" ตามที่พิมพ์ไปถึง
export function formatDigits(raw) {
  if (raw.length <= 2) return raw;
  if (raw.length <= 4) return `${raw.slice(0, 2)}/${raw.slice(2)}`;
  return `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
}

// "YYYY-MM-DD" (ค.ศ.) → "วว/ดด/ปปปป" (พ.ศ.)
export function isoToDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${parseInt(y, 10) + 543}`;
}

// ตัวเลขที่พิมพ์ → { iso } ถ้าถูก, { error } ถ้าผิด, { incomplete } ถ้ายังพิมพ์ไม่ครบ 8 หลัก
// pastOnly: ต้องเป็นวันที่ผ่านมาแล้ว (วันเกิด)
export function parseThaiDigits(raw, { pastOnly = false, today = new Date() } = {}) {
  if (!raw) return { iso: '' };
  if (raw.length < 8) return { iso: '', incomplete: true };

  const d = parseInt(raw.slice(0, 2), 10);
  const m = parseInt(raw.slice(2, 4), 10);
  const yBE = parseInt(raw.slice(4, 8), 10);
  const todayBE = today.getFullYear() + 543;

  if (yBE < 2400) {
    return { iso: '', error: yBE >= 1900 ? `ปีต้องเป็น พ.ศ. เช่น ${todayBE} (ไม่ใช่ ค.ศ.)` : 'ปีไม่ถูกต้อง' };
  }
  if (yBE > todayBE + 10) return { iso: '', error: 'ปีไม่ถูกต้อง' };
  if (m < 1 || m > 12) return { iso: '', error: 'เดือนต้องอยู่ระหว่าง 01–12' };

  const yAD = yBE - 543;
  const date = new Date(Date.UTC(yAD, m - 1, d));
  if (d < 1 || date.getUTCMonth() !== m - 1) {
    return { iso: '', error: 'วันที่ไม่ถูกต้อง — เดือนนี้ไม่มีวันที่นี้' };
  }
  if (pastOnly) {
    const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    if (date.getTime() >= todayUTC) return { iso: '', error: 'ต้องเป็นวันที่ผ่านมาแล้ว' };
  }
  return { iso: `${yAD}-${pad(m)}-${pad(d)}` };
}

// วันสิ้นสุดก่อนวันเริ่ม? (ค่าว่างฝั่งใดฝั่งหนึ่ง = ไม่ตรวจ)
export const endBeforeStart = (start, end) => Boolean(start && end && end.slice(0, 10) < start.slice(0, 10));
