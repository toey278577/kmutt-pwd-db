/**
 * ตรวจ/ซ่อมชื่อที่เพี้ยนจากบั๊กฟอร์มแก้ไขคนพิการ (แก้บั๊กแล้ว 14 ต.ค. 69)
 *   บั๊ก 1: "นางสาว มาลี" กดแก้ไข-บันทึก → "นาง สาว มาลี"
 *   บั๊ก 2: ชื่อที่ไม่มีคำนำหน้า (เช่นนำเข้าจาก Excel) กดแก้ไข-บันทึก → ถูกเติม "นาย" ให้เอง
 *
 *   node scripts/fix-name-prefix.cjs                     # ดูอย่างเดียว ไม่แก้
 *   node scripts/fix-name-prefix.cjs --apply             # ซ่อม "นาง สาว" → "นางสาว"
 *   node scripts/fix-name-prefix.cjs --apply --gender    # ซ่อมด้วย + ตัดคำนำหน้าที่ขัดกับเพศออก (เช่นผู้หญิงที่มี "นาย")
 *
 * บั๊ก 2 แยกจากคนที่ตั้งใจกรอก "นาย" ไม่ได้ 100% → ไม่แก้ให้เองจนกว่าจะสั่ง --gender (ดูรายชื่อก่อน)
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const url = process.env.DB_URL || process.env.DATABASE_URL;
if (!url) { console.error('ไม่พบ DB_URL หรือ DATABASE_URL'); process.exit(1); }
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const APPLY = process.argv.includes('--apply');
const FIX_GENDER = process.argv.includes('--gender');

// "นาง สาว..." ที่ตามด้วยสระ/วรรณยุกต์ = ชื่อจริงขึ้นต้นด้วย "สาว" เช่น "นาง สาวิตรี" → ไม่ใช่ของเสีย
const BROKEN_NANGSAO = /^นาง\s+สาว(?![ัิ-ฺ็-๎])\s*/;
const MALE_PREFIX = /^(นาย|เด็กชาย)(?![ัิ-ฺ็-๎])\s*/;
const FEMALE_PREFIX = /^(นางสาว|นาง|เด็กหญิง)(?![ัิ-ฺ็-๎])\s*/;

(async () => {
  const persons = await prisma.person.findMany({
    select: { id: true, fullName: true, gender: true },
    orderBy: { id: 'asc' },
  });

  // บั๊ก 1 — แก้ได้ชัวร์
  const broken = persons
    .filter((p) => BROKEN_NANGSAO.test(p.fullName))
    .map((p) => ({ ...p, fixed: p.fullName.replace(BROKEN_NANGSAO, 'นางสาว ') }));

  // บั๊ก 2 — คำนำหน้าขัดกับเพศ (ต้องให้คนดู)
  const mismatch = persons
    .filter((p) => !BROKEN_NANGSAO.test(p.fullName))
    .filter((p) => (p.gender === 'FEMALE' && MALE_PREFIX.test(p.fullName)) || (p.gender === 'MALE' && FEMALE_PREFIX.test(p.fullName)))
    .map((p) => ({ ...p, fixed: p.fullName.replace(p.gender === 'FEMALE' ? MALE_PREFIX : FEMALE_PREFIX, '').trim() }));

  console.log(`ตรวจ ${persons.length} คน\n`);

  console.log(`[1] ชื่อเพี้ยนเป็น "นาง สาว" — ${broken.length} คน`);
  for (const p of broken) console.log(`  #${p.id}  ${p.fullName}  ->  ${p.fixed}`);

  console.log(`\n[2] คำนำหน้าขัดกับเพศที่บันทึกไว้ (อาจโดนเติม "นาย" ให้เอง) — ${mismatch.length} คน`);
  for (const p of mismatch) console.log(`  #${p.id}  ${p.fullName}  (เพศ: ${p.gender === 'FEMALE' ? 'หญิง' : 'ชาย'})  ->  ${p.fixed}`);

  if (!APPLY) {
    console.log('\nยังไม่ได้แก้อะไร — ดูรายชื่อให้แน่ใจก่อน แล้วสั่ง --apply (และ --gender ถ้าจะแก้ข้อ [2] ด้วย)');
    return;
  }

  const todo = [...broken, ...(FIX_GENDER ? mismatch : [])];
  for (const p of todo) await prisma.person.update({ where: { id: p.id }, data: { fullName: p.fixed } });
  console.log(`\nแก้แล้ว ${todo.length} คน${!FIX_GENDER && mismatch.length ? ` (ข้อ [2] ยังไม่แก้ ${mismatch.length} คน — ต้องสั่ง --gender)` : ''}`);
})()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
