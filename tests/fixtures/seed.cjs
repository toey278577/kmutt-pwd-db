// ข้อมูลตั้งต้นของชุดทดสอบ (ต่อจาก backend/prisma/seed.js ที่ใส่ประเภทความพิการ + แอดมิน)
// ผู้ใช้ครบ 3 สิทธิ์ + ตัวอย่าง: รุ่น 813/2569 (จบแล้ว) 1 หลักสูตร, องค์กร 1 แห่ง, คนพิการ 8 คน (เลขบัตร 88888888xxxxx)
// เทสต์หลายชุดอ้างข้อมูลชุดนี้ — แก้แล้วต้องรัน npm test ให้ผ่านทั้งหมด
const path = require('path');
const B = path.resolve(__dirname, '../../backend');
if (!new URL(process.env.DATABASE_URL).pathname.endsWith('_test')) { console.error('ไม่ใช่ฐานข้อมูล *_test — ไม่ใส่ข้อมูล'); process.exit(2); }
const prisma = require(path.join(B, 'src/prismaClient'));
const bcrypt = require(path.join(B, 'node_modules/bcryptjs'));

(async () => {
  const pw = await bcrypt.hash('test1234', 10);
  await prisma.user.create({ data: { name: 'เจ้าหน้าที่ ทดสอบ', email: 'staff@test.local', password: pw, role: 'STAFF' } });
  await prisma.user.create({ data: { name: 'ผู้ดูข้อมูล ทดสอบ', email: 'viewer@test.local', password: pw, role: 'VIEWER' } });

  const types = await prisma.disabilityType.findMany({ orderBy: { id: 'asc' } });
  const batch = await prisma.trainingBatch.create({ data: { batchNumber: 813, year: 2569, courseName: 'การฝึกอบรม-ฝึกงานคนพิการ เพื่อเตรียมความพร้อมเข้าทำงาน', startDate: new Date('2026-05-01'), endDate: new Date('2026-07-15'), status: 'COMPLETED' } });
  const course = await prisma.course.create({ data: { batchId: batch.id, name: 'ธุรการสำนักงาน' } });
  const org = await prisma.organization.create({ data: { orgName: 'บริษัท ตัวอย่างยูไอ จำกัด', businessType: 'ค้าปลีก', contactName: 'คุณสมใจ', phone: '021234567' } });
  const names = ['นาย สมชาย ใจดี', 'นางสาว มาลี รักงาน', 'นาง สมศรี มีสุข', 'นาย วิชัย ขยันยิ่ง', 'นางสาว ปิยะนุช สายสุข', 'นาย ธนากร ทองดี', 'นางสาว กมลวรรณ ศรีสุข', 'นาย อนุชา บุญมา'];
  const provs = ['กรุงเทพมหานคร', 'นนทบุรี', 'เชียงใหม่', 'ขอนแก่น', 'ชลบุรี', 'สงขลา', 'กรุงเทพมหานคร', 'ปทุมธานี'];
  const ids = [];
  for (const [i, n] of names.entries()) {
    const p = await prisma.person.create({ data: {
      fullName: n, nickname: ['ชาย', 'ลี', 'ศรี', 'ชัย', 'นุช', 'ต้น', 'แก้ว', 'ชา'][i], gender: n.startsWith('นาย') ? 'MALE' : 'FEMALE',
      thaiId: '88888888' + String(10000 + i), birthDate: new Date(1990 + i, i % 12, 5 + i), province: provs[i],
      mobile: '08' + String(12345678 + i * 1111111).slice(0, 8), educationLevel: ['ปริญญาตรี', 'มัธยมศึกษาตอนปลายหรือเทียบเท่า', 'อนุปริญญา / ปวส.'][i % 3],
      batchId: i < 6 ? batch.id : null, courseId: i < 6 ? course.id : null, houseNo: `${10 + i}/3`, subDistrict: 'บางมด', district: 'ทุ่งครุ', postalCode: '10140',
      lifeStatus: i === 7 ? 'DECEASED' : 'ALIVE',
    } });
    ids.push(p.id);
    await prisma.disabilityInfo.create({ data: { personId: p.id, disabilityTypeId: types[i % 4].id, disabilityLevel: 'ระดับ 2' } });
    if (i < 5) await prisma.followUp.create({ data: { personId: p.id, followUpDate: new Date('2026-09-20'), employmentStatus: ['EMPLOYED', 'UNEMPLOYED', 'STUDYING'][i % 3], jobType: 'ธุรการ' } });
  }
  await prisma.trainingRecord.create({ data: { personId: ids[0], courseName: 'Excel พื้นฐาน', organizer: 'มจธ.', startDate: new Date('2026-02-01'), endDate: new Date('2026-02-20'), trainingType: 'TRAIN' } });
  await prisma.personOrganization.create({ data: { personId: ids[0], orgId: org.id, roleType: 'INTERNSHIP', amount: 9000, startDate: new Date('2026-08-01') } });
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
