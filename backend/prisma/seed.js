require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const types = ['ความพิการทางการมองเห็น', 'ความพิการทางการได้ยิน', 'ความพิการทางร่างกายหรือการเคลื่อนไหว', 'ความพิการทางสติปัญญา', 'ความพิการทางจิตใจหรือพฤติกรรม', 'ความพิการทางการเรียนรู้', 'ความพิการทางการออทิสติก'];

  for (const typeName of types) {
    await prisma.disabilityType.upsert({
      where: { id: types.indexOf(typeName) + 1 },
      update: {},
      create: { typeName },
    });
  }

  console.log('Seed data inserted: DisabilityType');

  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@kmutt.ac.th' },
    update: {},
    create: { name: 'ผู้ดูแลระบบ', email: 'admin@kmutt.ac.th', password: adminHash, role: 'ADMIN' },
  });
  console.log('Seed data inserted: Admin user (admin@kmutt.ac.th / admin123)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
