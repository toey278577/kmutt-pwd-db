require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const types = ['ความพิการทางการมองเห็น', 'ความพิการทางการได้ยิน', 'ความพิการทางร่างกายหรือการเคลื่อนไหว', 'ความพิการทางสติปัญญา', 'ความพิการทางจิตใจหรือพฤติกรรม', 'ความพิการทางการเรียนรู้', 'ความพิการทางการออทิสติก'];

  // ใส่ 7 ประเภทมาตรฐานเฉพาะตอนติดตั้งครั้งแรก (ตารางยังว่าง)
  // เดิมสร้างตามเลข id ทุกครั้งที่รัน — แอดมินลบประเภทไปแล้ว รัน seed อีกรอบจะกลับมาเอง
  if ((await prisma.disabilityType.count()) === 0) {
    await prisma.disabilityType.createMany({ data: types.map((typeName) => ({ typeName })) });
    console.log('Seed data inserted: DisabilityType');
  } else {
    console.log('DisabilityType มีอยู่แล้ว — ไม่ใส่ซ้ำ (แก้/เพิ่มที่หน้า "ประเภทความพิการ")');
  }

  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@kmutt.ac.th' },
    update: {},
    create: { name: 'ผู้ดูแลระบบ', email: 'admin@kmutt.ac.th', password: adminHash, role: 'ADMIN' },
  });
  console.log('Seed data inserted: Admin user (admin@kmutt.ac.th / admin123)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
