/**
 * กู้คืน / ย้ายข้อมูลจากไฟล์ JSON เข้า DB ปลายทาง (คงเลข id เดิม)
 *
 * ⚠️ DB ปลายทางต้องรัน migration ก่อน:  npx prisma migrate deploy
 *
 * วิธีใช้ (Windows PowerShell):
 *   $env:DB_URL="postgresql://ปลายทาง..."; node scripts/restore-db.cjs backups/backup-xxxx.json
 *
 * ใส่ --wipe ถ้าต้องการล้างข้อมูลเดิมในปลายทางก่อน (ระวัง! ลบจริง)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const file = process.argv[2];
const wipe = process.argv.includes('--wipe');
if (!file) {
  console.error('❌ ระบุไฟล์ backup ด้วย เช่น: node scripts/restore-db.cjs backups/backup-xxx.json');
  process.exit(1);
}
const url = process.env.DB_URL || process.env.DATABASE_URL;
if (!url) { console.error('❌ ไม่พบ DB_URL หรือ DATABASE_URL'); process.exit(1); }

// model → ชื่อตารางจริง (ใช้รีเซ็ต sequence)
const TABLE = {
  disabilityType: 'disability_types', organization: 'organizations', user: 'users',
  trainingBatch: 'training_batches', course: 'courses', person: 'persons',
  personPhoto: 'person_photos', disabilityInfo: 'disability_infos',
  trainingRecord: 'training_records', workExperience: 'work_experiences',
  skill: 'skills', followUp: 'follow_ups', personOrganization: 'person_organizations',
  personAssessment: 'person_assessments',
};
const ORDER = Object.keys(TABLE);

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

(async () => {
  const raw = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  const data = raw.data || raw;
  const host = url.replace(/:[^:@]*@/, ':****@').split('@')[1]?.split('/')[0] || '(unknown)';
  console.log(`📥 กู้คืนเข้า: ${host}`);
  console.log(`   จากไฟล์: ${file} (สำรองเมื่อ ${raw.exportedAt || 'ไม่ระบุ'})\n`);

  if (wipe) {
    console.log('🗑️  ล้างข้อมูลเดิมก่อน...');
    for (const m of [...ORDER].reverse()) await prisma[m].deleteMany({});
  }

  let total = 0;
  for (const m of ORDER) {
    const rows = data[m] || [];
    if (rows.length === 0) { console.log(`   ${m.padEnd(20)} 0 แถว (ข้าม)`); continue; }
    // แปลง field วันที่ (string → Date) ให้ Prisma รับได้
    const clean = rows.map(r => {
      const o = { ...r };
      for (const k of Object.keys(o)) {
        if (typeof o[k] === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(o[k])) o[k] = new Date(o[k]);
      }
      return o;
    });
    await prisma[m].createMany({ data: clean, skipDuplicates: true });
    // รีเซ็ต sequence ให้ id ถัดไปไม่ชนของเดิม
    const t = TABLE[m];
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${t}"','id'), COALESCE((SELECT MAX(id) FROM "${t}"), 1))`
    );
    total += clean.length;
    console.log(`   ${m.padEnd(20)} ${clean.length} แถว ✓`);
  }

  console.log(`\n✅ กู้คืนเสร็จ ${total} แถว`);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('❌ ผิดพลาด:', e.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
