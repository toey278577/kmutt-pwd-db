// ข้อ 12: ตัวย่อในวงกลมทุกหน้า (ไม่ขึ้น "นา" / "บร" / "ผู" แล้ว)
const path = require('path');
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');
(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const ps = await Promise.all([
    prisma.person.create({ data: { fullName: 'นางสาว มาลี ทดสอบอีทูอี', gender: 'FEMALE', thaiId: '9999999930051' } }),
    prisma.person.create({ data: { fullName: 'นาย สมชาย ทดสอบอีทูอี', gender: 'MALE', thaiId: '9999999930052' } }),
  ]);
  const org = await prisma.organization.create({ data: { orgName: 'บริษัท ไทยรุ่งเรือง ทดสอบอีทูอี จำกัด' } });
  await prisma.followUp.create({ data: { personId: ps[0].id, followUpDate: new Date('2026-08-01'), employmentStatus: 'EMPLOYED' } });
  await prisma.trainingRecord.create({ data: { personId: ps[1].id, courseName: 'ทดสอบอีทูอี คอร์ส' } });
  const b = await browser();
  const avatarsOf = (rowText) => b.evaluate(`[...document.querySelectorAll('tbody tr')].filter(r => r.textContent.includes(${JSON.stringify(rowText)})).map(r => r.querySelector('td div div, td button div, td > div > div')?.textContent.trim())`);
  try {
    await b.login(admin.id);
    await b.nav('/persons?q=' + encodeURIComponent('ทดสอบอีทูอี'));
    await b.waitFor(`document.querySelectorAll('tbody tr').length >= 2`, 'รายชื่อ');
    eq('หน้ารายชื่อ: มาลี→"มท", สมชาย→"สท"', (await avatarsOf('ทดสอบอีทูอี')).sort(), ['มท', 'สท'].sort());
    await b.screenshot(shot('12-person-list.png'));
    await b.nav(`/persons/${ps[0].id}`);
    await b.waitFor(`document.querySelector('main').textContent.includes('มาลี ทดสอบอีทูอี')`, 'หน้ารายละเอียด');
    eq('หน้ารายละเอียด: วงกลมหัวโปรไฟล์ = "มท"', await b.evaluate(`document.querySelector('main .w-16.h-20')?.textContent.trim()`), 'มท');
    await b.nav('/followup');
    await b.waitFor(`document.querySelector('main').textContent.includes('มาลี ทดสอบอีทูอี')`, 'หน้าติดตามผล');
    eq('หน้าติดตามผล: "มท"', await b.evaluate(`[...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes('มาลี ทดสอบอีทูอี')).querySelector('button div').textContent.trim()`), 'มท');
    await b.nav('/training');
    // มีคนอยู่ในรุ่น หน้าจะเปิดแท็บ 'ตามรุ่นอบรม' ก่อน — คนทดสอบไม่มีรุ่น อยู่แท็บรายคน
    await b.waitFor(`[...document.querySelectorAll('main button')].some(x => x.textContent.includes('ประวัติอบรมรายคน'))`, 'แท็บรายคน');
    await b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.includes('ประวัติอบรมรายคน')).click(), true`);
    await b.waitFor(`document.querySelector('main').textContent.includes('สมชาย ทดสอบอีทูอี')`, 'หน้าอบรม');
    eq('หน้าการอบรม: "สท"', await b.evaluate(`[...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes('สมชาย ทดสอบอีทูอี')).querySelector('button div').textContent.trim()`), 'สท');
    await b.nav('/organizations');
    await b.waitFor(`document.querySelector('main').textContent.includes('ไทยรุ่งเรือง')`, 'หน้าองค์กร');
    eq('หน้าสถานประกอบการ: "ท" ไม่ใช่ "บร"', await b.evaluate(`(() => { const r = [...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes('ไทยรุ่งเรือง')); return r.querySelector('td div div').textContent.trim(); })()`), 'ทท');
    await b.nav('/users');
    await b.waitFor(`document.querySelectorAll('tbody tr').length > 0`, 'หน้าผู้ใช้');
    eq('หน้าผู้ใช้: "ผู้ดูแลระบบ" → "ผ" (เดิม "ผู")', await b.evaluate(`[...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes(${JSON.stringify(admin.email)})).querySelector('td div div').textContent.trim()`), 'ผ');
    eq('ไม่มี error ในหน้าเว็บ', b.errors, []);
  } catch (e) { console.log('FAIL  สะดุด:', e.message); await b.screenshot(shot('crash-12.png')); eq('ไม่สะดุด', e.message, ''); }
  finally {
    await b.close();
    await prisma.person.deleteMany({ where: { id: { in: ps.map((p) => p.id) } } });
    await prisma.organization.delete({ where: { id: org.id } });
    const f = summary(); await prisma.$disconnect(); process.exit(f ? 1 : 0);
  }
})();
