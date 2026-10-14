/**
 * ตรวจ/ลบประเภทความพิการที่ซ้ำกันในคนเดียว (ค้างจากบั๊กฟอร์มแก้ไขที่เลือกซ้ำได้ — แก้แล้ว 14 ต.ค. 69)
 * รายการซ้ำทำให้กราฟ "ประเภทความพิการ" นับคนเดียวหลายครั้ง
 *
 *   node scripts/fix-duplicate-disability.cjs           # ดูอย่างเดียว ไม่ลบ
 *   node scripts/fix-duplicate-disability.cjs --apply   # ลบรายการซ้ำ
 *
 * เก็บรายการที่กรอกรายละเอียดไว้มากที่สุด (ระดับ/อุปกรณ์/ข้อจำกัด/สิ่งที่ต้องการ) ถ้าเท่ากันเก็บอันเก่าสุด
 * รายการที่จะลบต้องไม่มีรายละเอียดที่อันที่เก็บไว้ไม่มี — ไม่งั้นข้ามไว้ให้คนดูเอง ข้อมูลจะได้ไม่หาย
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const url = process.env.DB_URL || process.env.DATABASE_URL;
if (!url) { console.error('ไม่พบ DB_URL หรือ DATABASE_URL'); process.exit(1); }
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const APPLY = process.argv.includes('--apply');
const DETAIL = ['disabilityLevel', 'assistiveDevice', 'workLimitation', 'accommodationNeed'];
const filled = (r) => DETAIL.filter((k) => r[k] && String(r[k]).trim()).length;

(async () => {
  const infos = await prisma.disabilityInfo.findMany({
    include: { person: { select: { fullName: true } }, disabilityType: { select: { typeName: true } } },
    orderBy: { id: 'asc' },
  });
  const groups = new Map();
  for (const r of infos) {
    const k = `${r.personId}:${r.disabilityTypeId}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }

  const toDelete = [];
  const manual = [];
  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    const keep = [...rows].sort((a, b) => filled(b) - filled(a) || a.id - b.id)[0];
    for (const r of rows) {
      if (r.id === keep.id) continue;
      // รายละเอียดที่อันนี้มีแต่อันที่เก็บไม่มี/ไม่เหมือน → ลบไปข้อมูลจะหาย ให้คนดูเอง
      const conflict = DETAIL.some((k) => r[k] && String(r[k]).trim() && String(r[k]).trim() !== String(keep[k] || '').trim());
      (conflict ? manual : toDelete).push({ r, keep });
    }
  }

  console.log(`ตรวจ ${infos.length} รายการ · ซ้ำที่ลบได้ ${toDelete.length} · ซ้ำแต่รายละเอียดต่างกัน (ต้องดูเอง) ${manual.length}\n`);
  for (const { r, keep } of toDelete) console.log(`  ลบ #${r.id}  ${r.person.fullName} — ${r.disabilityType.typeName}  (เก็บ #${keep.id})`);
  for (const { r, keep } of manual) console.log(`  ดูเอง #${r.id} กับ #${keep.id}  ${r.person.fullName} — ${r.disabilityType.typeName}`);

  if (!APPLY) {
    if (toDelete.length) console.log('\nยังไม่ได้ลบ — สั่ง --apply เพื่อลบจริง');
    return;
  }
  await prisma.disabilityInfo.deleteMany({ where: { id: { in: toDelete.map((x) => x.r.id) } } });
  console.log(`\nลบแล้ว ${toDelete.length} รายการ`);
})()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
