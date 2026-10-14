/**
 * ลบไฟล์รูปถ่ายที่ไม่มีเจ้าของแล้ว (ค้างจากบั๊กเดิม: ลบคนพิการแล้วไฟล์รูปไม่ถูกลบ — แก้แล้ว 14 ต.ค. 69)
 * รูปเป็นข้อมูลส่วนบุคคล ไม่ควรค้างอยู่บนเซิร์ฟเวอร์หลังลบคนไปแล้ว
 *
 *   node scripts/cleanup-orphan-photos.cjs           # ดูอย่างเดียว ไม่ลบ
 *   node scripts/cleanup-orphan-photos.cjs --apply   # ลบจริง
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const url = process.env.DB_URL || process.env.DATABASE_URL;
if (!url) { console.error('ไม่พบ DB_URL หรือ DATABASE_URL'); process.exit(1); }
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const APPLY = process.argv.includes('--apply');
const DIR = path.join(__dirname, '..', 'uploads', 'photos');

(async () => {
  if (!fs.existsSync(DIR)) { console.log('ยังไม่มีโฟลเดอร์รูป — ไม่มีอะไรต้องลบ'); return; }

  const photos = await prisma.personPhoto.findMany({ select: { filePath: true } });
  const used = new Set(photos.map((p) => path.basename(p.filePath || '')));
  const files = fs.readdirSync(DIR).filter((f) => fs.statSync(path.join(DIR, f)).isFile());
  const orphans = files.filter((f) => !used.has(f));

  const kb = (f) => Math.round(fs.statSync(path.join(DIR, f)).size / 1024);
  console.log(`ไฟล์รูปทั้งหมด ${files.length} ไฟล์ · มีเจ้าของ ${files.length - orphans.length} · ไม่มีเจ้าของ ${orphans.length}`);
  for (const f of orphans) console.log(`  ${f}  (${kb(f)} KB)`);

  if (!APPLY) {
    if (orphans.length) console.log('\nยังไม่ได้ลบ — สั่ง --apply เพื่อลบจริง');
    return;
  }
  for (const f of orphans) fs.unlinkSync(path.join(DIR, f));
  console.log(`\nลบแล้ว ${orphans.length} ไฟล์`);
})()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
