// จัดการชื่อ-คำนำหน้าภาษาไทย — ใช้ร่วมกันทั้งฟอร์มคนพิการและตัวย่อในวงกลม

export const PREFIXES = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง'];

// เช็คคำนำหน้าที่ยาวกว่าก่อน — เดิมเช็ค "นาง" ก่อน "นางสาว" ทำให้ "นางสาว มาลี" กลายเป็น "นาง" + "สาว มาลี"
// แล้วพอกดบันทึกชื่อก็เพี้ยนเป็น "นาง สาว มาลี"
const PREFIXES_LONGEST_FIRST = [...PREFIXES].sort((a, b) => b.length - a.length);
// ตัวที่ตามหลังเป็นสระ/วรรณยุกต์ = เป็นส่วนหนึ่งของชื่อ ไม่ใช่คำนำหน้า (เช่น "นายิกา" ไม่ใช่ "นาย" + "ิกา")
const THAI_COMBINING = /^[ัิ-ฺ็-๎]/;

export function splitPrefix(fullName = '') {
  const name = String(fullName || '').trim();
  for (const p of PREFIXES_LONGEST_FIRST) {
    if (name.startsWith(p) && !THAI_COMBINING.test(name.slice(p.length))) {
      return { prefix: p, nameOnly: name.slice(p.length).trim() };
    }
  }
  return { prefix: '', nameOnly: name };
}

// ตัวย่อในวงกลม = พยัญชนะตัวแรกของชื่อ + ของนามสกุล (ไม่เอาคำนำหน้า — เดิมขึ้น "นา" เกือบทุกคน)
// ใช้พยัญชนะแบบตัวย่อไทย: "ใจดี" → "จ" (ข้ามสระหน้า), "รักงาน" → "ร" (ไม่เอาไม้หันอากาศติดมา)
const initialOf = (word) => {
  if (!word) return '';
  const thai = word.match(/[ก-ฮ]/);
  return thai ? thai[0] : word[0].toUpperCase();
};

export function nameInitials(fullName = '') {
  const words = splitPrefix(fullName).nameOnly.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return initialOf(words[0]) + initialOf(words[1]);
}

// ตัวย่อชื่อองค์กร — ตัดคำนำหน้า/ท้ายที่ทุกบริษัทมีออก (เดิมขึ้น "บร" จาก "บริษัท" เกือบทุกแห่ง)
const ORG_PREFIX = /^(บริษัท|บจก\.?|บมจ\.?|ห้างหุ้นส่วนจำกัด|ห้างหุ้นส่วน|หจก\.?|ร้าน|มูลนิธิ|สมาคม|โรงเรียน|โรงพยาบาล|สำนักงาน)\s*/;
const ORG_SUFFIX = /^(จำกัด|\(?มหาชน\)?|co\.?|ltd\.?|inc\.?)$/i;
export function orgInitials(orgName = '') {
  const words = String(orgName || '').trim().replace(ORG_PREFIX, '').split(/\s+/).filter((w) => w && !ORG_SUFFIX.test(w.replace(/,+$/, '')));
  if (words.length === 0) return initialOf(String(orgName || '').trim()) || '?';
  return initialOf(words[0]) + initialOf(words[1]);
}
