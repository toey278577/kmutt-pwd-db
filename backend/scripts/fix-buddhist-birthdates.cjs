/**
 * แก้วันเกิดที่นำเข้าจาก Excel แล้วปีเพี้ยน (เก็บปี พ.ศ. ไว้ในช่อง ค.ศ.)
 *
 *   node scripts/fix-buddhist-birthdates.cjs           # ดูอย่างเดียว ไม่แก้
 *   node scripts/fix-buddhist-birthdates.cjs --apply   # แก้จริง
 *
 * เงื่อนไข: แก้เฉพาะคนที่ปีเกิดมากกว่าปีปัจจุบัน (เกิดในอนาคต = ผิดแน่นอน) โดยลบ 543
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const url = process.env.DB_URL || process.env.DATABASE_URL;
if (!url) { console.error('ไม่พบ DB_URL หรือ DATABASE_URL'); process.exit(1); }
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const APPLY = process.argv.includes('--apply');
const THIS_YEAR = new Date().getFullYear();

const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

(async () => {
  const persons = await prisma.person.findMany({
    where: { birthDate: { not: null } },
    select: { id: true, fullName: true, thaiId: true, birthDate: true },
    orderBy: { id: 'asc' },
  });

  const bad = persons.filter(p => p.birthDate.getUTCFullYear() > THIS_YEAR);

  if (bad.length === 0) {
    console.log(`ตรวจ ${persons.length} คน — ไม่พบวันเกิดที่ปีเพี้ยน`);
    return;
  }

  console.log(`พบ ${bad.length} คน จากทั้งหมด ${persons.length} คน ที่ปีเกิดเพี้ยน:\n`);
  const updates = [];
  for (const p of bad) {
    const d = p.birthDate;
    const fixed = new Date(Date.UTC(d.getUTCFullYear() - 543, d.getUTCMonth(), d.getUTCDate()));
    updates.push({ id: p.id, fixed });
    console.log(`  #${p.id} ${p.fullName.padEnd(28)} ${fmt(d)} -> ${fmt(fixed)}  (อายุ ${THIS_YEAR - fixed.getUTCFullYear()} ปี)`);
  }

  if (!APPLY) {
    console.log(`\nยังไม่ได้แก้ — สั่ง "node scripts/fix-buddhist-birthdates.cjs --apply" เพื่อแก้จริง`);
    return;
  }

  for (const u of updates) {
    await prisma.person.update({ where: { id: u.id }, data: { birthDate: u.fixed } });
  }
  console.log(`\nแก้แล้ว ${updates.length} คน`);
})()
  .catch(e => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
