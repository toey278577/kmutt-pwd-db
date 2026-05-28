require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash('admin1234', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@kmutt.ac.th' },
    update: { password: hash, isActive: true },
    create: { name: 'ผู้ดูแลระบบ', email: 'admin@kmutt.ac.th', password: hash, role: 'ADMIN', isActive: true },
  });
  console.log('✅ Reset admin password สำเร็จ:', user.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
