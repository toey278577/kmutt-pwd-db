// หน้าคู่มือในเว็บ: ทุกหัวข้อเปิดได้ไม่พัง + เนื้อหาตรงกับหน้าจอปัจจุบัน (ไม่ค้างของเก่า เช่น "hover ที่รูป")
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const b = await browser();
  const mainText = () => b.evaluate(`document.querySelector('main').innerText`);
  const open = async (label) => { await b.clickText(label, "document.querySelector('main')"); await sleep(300); };
  try {
    await b.login(admin.id);
    await b.nav('/help');
    await b.waitFor(`document.querySelector('main')?.textContent.includes('ภาพรวมระบบ')`, 'หน้าคู่มือ');
    const labels = ['ภาพรวมระบบ', 'การเข้าสู่ระบบ', 'สิทธิ์ผู้ใช้งาน', 'Dashboard', 'จัดการรุ่น', 'ข้อมูลคนพิการ', 'รูปถ่าย 1 นิ้ว', 'การอบรม & ฝึกงาน',
      'ประเมินทักษะ', 'ติดตามผล', 'สถานประกอบการ', 'ออกรายงาน', 'จัดการผู้ใช้ (Admin)', 'ประวัติการใช้งาน (Admin)', 'ประเภทความพิการ (Admin)'];
    const empty = [];
    for (const l of labels) { await open(l); if ((await b.evaluate(`document.querySelectorAll('main h2').length`)) === 0) empty.push(l); }
    eq('ทุกหัวข้อเปิดได้ มีเนื้อหา', empty, []);

    await open('ข้อมูลคนพิการ');
    const persons = await mainText();
    eq('หัวข้อคนพิการ: ค้นหาทันที / ตารางรายชื่อ / ถามก่อนปิดฟอร์ม / นำเข้า Excel',
      ['ขึ้นเองทันที ไม่ต้องกดปุ่ม', 'งานล่าสุด', 'เผลอกดปิดฟอร์ม ข้อมูลไม่หาย', 'นำเข้าหลายคนจาก Excel', 'ตัวกรองรายชื่อ'].map((t) => persons.includes(t)), [true, true, true, true, true]);
    eq('ไม่มีคำสั่งเก่า "กด ค้นหา"', persons.includes('แล้วกด "ค้นหา"'), false);
    await b.screenshot(shot('help-persons.png'));

    await open('รูปถ่าย 1 นิ้ว');
    const photo = await mainText();
    eq('หัวข้อรูป: ใช้ปุ่มเปลี่ยนรูป/ลบรูป ไม่ใช่ hover', [photo.includes('เปลี่ยนรูป'), photo.includes('ลบรูป'), /hover/i.test(photo)], [true, true, false]);
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); eq('สคริปต์รันจบ', false, true); }
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
