/**
 * สำรองข้อมูลทุกตารางเป็นไฟล์ JSON (ใช้ย้าย DB หรือกู้คืนได้)
 *
 * วิธีใช้ (Windows PowerShell):
 *   $env:DB_URL="postgresql://user:pass@host/db?sslmode=require"; node scripts/backup-db.cjs
 * ถ้าไม่ใส่ DB_URL จะใช้ DATABASE_URL จาก .env (คือ DB ในเครื่อง)
 *
 * ผลลัพธ์: backend/backups/backup-YYYY-MM-DDTHH-mm.json
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const url = process.env.DB_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('❌ ไม่พบ DB_URL หรือ DATABASE_URL');
  process.exit(1);
}

// เรียงตามลำดับ dependency (ตัวที่ไม่มีตัวแม่มาก่อน) — ใช้ลำดับนี้ตอน restore ด้วย
const MODELS = [
  'disabilityType', 'organization', 'user', 'trainingBatch', 'course',
  'person', 'personPhoto', 'disabilityInfo', 'trainingRecord',
  'workExperience', 'skill', 'followUp', 'personOrganization', 'personAssessment',
];

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

(async () => {
  const host = url.replace(/:[^:@]*@/, ':****@').split('@')[1]?.split('/')[0] || '(unknown)';
  console.log(`📦 กำลังสำรองข้อมูลจาก: ${host}\n`);

  const data = {};
  let total = 0;
  for (const m of MODELS) {
    data[m] = await prisma[m].findMany();
    total += data[m].length;
    console.log(`   ${m.padEnd(20)} ${data[m].length} แถว`);
  }

  const dir = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const file = path.join(dir, `backup-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify({ exportedAt: new Date().toISOString(), source: host, data }, null, 2), 'utf8');

  console.log(`\n✅ สำรองเสร็จ ${total} แถว → ${file}`);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('❌ ผิดพลาด:', e.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
