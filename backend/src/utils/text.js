// ทำความสะอาดข้อความภาษาไทยที่ copy มาจาก Excel / เว็บ / Word
// ข้อความที่ตาเห็นเหมือนกันเป๊ะ อาจมีตัวอักษรล่องหนหรือสระที่พิมพ์คนละแบบติดมา
// ทำให้ระบบนับเป็นคนละค่า (เช่น "ปริญญาตรี" ขึ้นซ้ำ 2 แถวในกราฟ Dashboard)

// zero-width space/joiner, word joiner, BOM, soft hyphen — มองไม่เห็นแต่ทำให้ข้อความไม่เท่ากัน
const INVISIBLE = /[​-‍⁠﻿­]/g;

function cleanText(v) {
  if (v == null) return '';
  return String(v)
    .normalize('NFC')
    .replace(INVISIBLE, '')
    .replace(/ํา/g, 'ำ')   // นิคหิต + สระอา ("ํา") → สระอำ ("ำ")
    .replace(/\s+/g, ' ')                 // ช่องว่างซ้อน / NBSP / tab → ช่องว่างเดียว
    .trim();
}

// key สำหรับจัดกลุ่ม — ไม่สนช่องว่างเลย ("ปริญญา ตรี" = "ปริญญาตรี")
const groupKey = (v) => cleanText(v).replace(/ /g, '');

module.exports = { cleanText, groupKey };
