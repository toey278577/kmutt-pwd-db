// มือถือ: ตารางเลื่อนข้าง → การ์ด ในหน้าติดตามผล / การอบรม 2 แท็บ / สถานประกอบการ / ผู้ใช้ / ตารางย่อย 4 แท็บในหน้ารายละเอียด
// ทุกหน้า: ไม่ล้นจอ · ไม่มีตารางโผล่ · การ์ดครบตามข้อมูล · ไม่มีตัวหนังสือล้นการ์ด · ปุ่มในการ์ดใช้ได้ · จอคอมยังเป็นตาราง
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const viewer = await prisma.user.findFirst({ where: { role: 'VIEWER', isActive: true } });
  const person = await prisma.person.findFirst({ where: { thaiId: '8888888810000' } });
  const we = await prisma.workExperience.create({ data: { personId: person.id, organizationName: 'ร้านกาแฟทดสอบมือถือ', jobType: 'บาริสต้า', workMode: 'EMPLOYMENT', income: 12000, startDate: new Date('2026-08-01') } });
  const counts = { followups: await prisma.followUp.count(), orgs: await prisma.organization.count(), users: await prisma.user.count() };
  const b = await browser();
  const cards = `[...document.querySelectorAll('main [data-card]')].filter(c => c.offsetParent)`;
  const nCards = () => b.evaluate(`${cards}.length`);
  // หน้าไม่ล้นแนวนอน + ตารางซ่อน + ไม่มีอะไรล้นการ์ด
  const layoutOk = (label) => b.evaluate(`(() => {
    const pageFits = document.documentElement.scrollWidth <= innerWidth;
    const noTable = [...document.querySelectorAll('main table')].every(t => !t.offsetParent);
    const fit = ${cards}.every(c => c.scrollWidth <= c.clientWidth + 1);
    return [pageFits, noTable, fit];
  })()`).then((r) => eq(`${label}: ไม่ล้นจอ / ไม่มีตารางโผล่ / ไม่มีอะไรล้นการ์ด`, r, [true, true, true]));
  const tab = async (t) => { await b.evaluate(`[...document.querySelectorAll('[role=tab]')].find(x => x.textContent.trim() === ${JSON.stringify(t)}).click(), true`); await sleep(500); };
  try {
    await b.login(admin.id);
    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

    console.log('── ติดตามผล');
    await b.nav('/followup'); await b.waitFor(`${cards}.length > 0`, 'การ์ดติดตามผล'); await sleep(300);
    eq('การ์ดครบทุกรายการ', await nCards(), counts.followups);
    eq('การ์ดมีสถานะ + ประเภทงาน', await b.evaluate(`[${cards}.every(c => /มีงานทำ|ว่างงาน|ศึกษาต่อ/.test(c.innerText)), ${cards}.some(c => c.innerText.includes('ประเภทงาน'))]`), [true, true]);
    await layoutOk('ติดตามผล');
    await b.screenshot(shot('m-followup.png'));
    await b.evaluate(`${cards}[0].click(), true`); await sleep(600);
    eq('กดการ์ด → ไปหน้ารายละเอียด', await b.evaluate(`/^\\/persons\\/\\d+$/.test(location.pathname)`), true);

    console.log('── การอบรม');
    await b.nav('/training'); await b.waitFor(`${cards}.length > 0`, 'การ์ดตามรุ่น'); await sleep(300);
    eq('แท็บตามรุ่น: การ์ด 6 คน (คนในรุ่น 813)', await nCards(), 6);
    eq('การ์ดมีรุ่น + สถานะรุ่น', await b.evaluate(`(() => { const t = ${cards}[0].innerText; return [t.includes('รุ่น 813/2569'), t.includes('จบแล้ว')]; })()`), [true, true]);
    await layoutOk('ตามรุ่น');
    await b.screenshot(shot('m-training-batch.png'));
    await b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.includes('ประวัติอบรมรายคน')).click(), true`); await sleep(400);
    eq('แท็บรายคน: การ์ด 1 รายการ + รูปแบบเป็นภาษาไทย', await b.evaluate(`[${cards}.length, ${cards}[0]?.innerText.includes('Excel พื้นฐาน'), ${cards}[0]?.innerText.includes('อบรม')]`), [1, true, true]);
    await layoutOk('รายคน');

    console.log('── สถานประกอบการ');
    await b.nav('/organizations'); await b.waitFor(`${cards}.length > 0`, 'การ์ดองค์กร'); await sleep(300);
    eq('การ์ดครบ + มีผู้ติดต่อ/เบอร์', [await nCards(), await b.evaluate(`${cards}[0].innerText.includes('คุณสมใจ') && ${cards}[0].innerText.includes('021234567')`)], [counts.orgs, true]);
    await layoutOk('สถานประกอบการ');
    await b.screenshot(shot('m-orgs.png'));
    await b.evaluate(`${cards}[0].querySelector('button[title="แก้ไข"]').click(), true`);
    await b.waitFor(`document.querySelector('dialog[open]')`, 'ฟอร์มแก้ไของค์กร'); await sleep(200);
    eq('ปุ่มแก้ไขในการ์ด → ฟอร์มขึ้นพร้อมข้อมูล', await b.evaluate(`document.querySelector('dialog[open] input').value`), 'บริษัท ตัวอย่างยูไอ จำกัด');
    await b.clickText('ยกเลิก', "document.querySelector('dialog[open]')"); await sleep(250);

    console.log('── ผู้ใช้');
    await b.nav('/users'); await b.waitFor(`${cards}.length > 0`, 'การ์ดผู้ใช้'); await sleep(300);
    eq('การ์ดครบทุกบัญชี', await nCards(), counts.users);
    eq('การ์ดของตัวเอง: มีป้าย "คุณ" ไม่มีปุ่มลบ', await b.evaluate(`(() => { const c = ${cards}.find(c => c.innerText.includes(${JSON.stringify(admin.email)})); return [c.innerText.includes('คุณ'), !!c.querySelector('button[title="ลบ"]')]; })()`), [true, false]);
    eq('การ์ดคนอื่นมีปุ่มลบ', await b.evaluate(`${cards}.filter(c => !c.innerText.includes(${JSON.stringify(admin.email)})).every(c => !!c.querySelector('button[title="ลบ"]'))`), true);
    eq('วันที่สร้างเป็นแบบไทย วว/ดด/พ.ศ.', await b.evaluate(`/สร้างเมื่อ\\s*\\d{2}\\/\\d{2}\\/25\\d{2}/.test(${cards}[0].innerText)`), true);
    await layoutOk('ผู้ใช้');
    await b.screenshot(shot('m-users.png'));

    console.log('── หน้ารายละเอียด (ตารางย่อย)');
    await b.nav('/persons/' + person.id); await b.waitFor(`document.querySelector('[role=tablist]')`, 'หน้ารายละเอียด'); await sleep(300);
    for (const [t, want, label] of [['การอบรม', 'Excel พื้นฐาน', 'อบรม'], ['ประสบการณ์งาน', 'ร้านกาแฟทดสอบมือถือ', 'จ้างงาน'], ['ติดตามผล', 'ติดตามวันที่', 'มีงานทำ'], ['สถานประกอบการ', 'บริษัท ตัวอย่างยูไอ จำกัด', 'ฝึกงาน']]) {
      await tab(t);
      eq(`แท็บ${t}: การ์ด 1 ใบ ข้อมูลถูก + ปุ่มแก้/ลบ`, await b.evaluate(`[${cards}.length, ${cards}[0]?.innerText.includes(${JSON.stringify(want)}), ${cards}[0]?.innerText.includes(${JSON.stringify(label)}), !!${cards}[0]?.querySelector('button[title="แก้ไข"]'), !!${cards}[0]?.querySelector('button[title="ลบ"]')]`), [1, true, true, true, true]);
      await layoutOk('แท็บ' + t);
      if (t === 'ประสบการณ์งาน') await b.screenshot(shot('m-detail-work.png'));
    }
    await tab('การอบรม');
    await b.evaluate(`${cards}[0].querySelector('button[title="แก้ไข"]').click(), true`);
    await b.waitFor(`document.querySelector('dialog[open]')`, 'หน้าต่างแก้ไขอบรม'); await sleep(200);
    eq('ปุ่มแก้ไขในการ์ด → หน้าต่างแก้ไขการอบรม', await b.evaluate(`document.querySelector('dialog[open] h3').textContent`), 'แก้ไขการอบรม');
    await b.clickText('ยกเลิก', "document.querySelector('dialog[open]')"); await sleep(250);
    await tab('ประสบการณ์งาน');
    await b.evaluate(`${cards}[0].querySelector('button[title="ลบ"]').click(), true`);
    await b.waitFor(`[...document.querySelectorAll('button')].some(x => x.textContent.trim() === 'ยืนยัน')`, 'กล่องยืนยันลบ');
    await b.evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'ยืนยัน').click(), true`); await sleep(800);
    eq('ปุ่มลบในการ์ด → ลบจริง + การ์ดหาย', [await prisma.workExperience.count({ where: { id: we.id } }), await nCards()], [0, 0]);

    await b.nav('/followup'); await b.waitFor(`${cards}.length > 0`, 'การ์ด'); await b.evaluate("document.documentElement.classList.add('dark'), true"); await sleep(400);
    await b.screenshot(shot('m-followup-dark.png'));
    eq('dark: เส้นคั่นการ์ดไม่ใช่เส้นสว่าง', await b.evaluate(`(() => { const c = ${cards}[0]; const m = getComputedStyle(c).borderBottomColor.match(/\\d+/g).map(Number); return m[0] < 90 && m[1] < 90 && m[2] < 90; })()`), true);
    await b.evaluate("document.documentElement.classList.remove('dark'), true");

    console.log('── ผู้ดูข้อมูล + จอคอม');
    await b.login(viewer.id);
    await b.nav('/organizations'); await b.waitFor(`${cards}.length > 0`, 'การ์ดองค์กร'); await sleep(300);
    eq('VIEWER: การ์ดไม่มีปุ่มแก้/ลบ', await b.evaluate(`${cards}.every(c => !c.querySelector('button[title]'))`), true);
    await b.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
    await b.login(admin.id);
    await b.nav('/followup'); await b.waitFor(`document.querySelector('main table')?.offsetParent`, 'ตารางจอคอม'); await sleep(300);
    eq('จอคอม: เป็นตาราง ไม่มีการ์ด', [await b.evaluate(`document.querySelectorAll('main tbody tr').length`), await nCards()], [counts.followups, 0]);
    await b.nav('/persons/' + person.id); await b.waitFor(`document.querySelector('[role=tablist]')`, 'หน้ารายละเอียด'); await tab('การอบรม');
    eq('จอคอม: ป้ายรูปแบบอบรมเป็น "อบรม" ไม่ใช่ TRAIN', await b.evaluate(`[document.querySelector('main tbody').innerText.includes('อบรม'), document.querySelector('main tbody').innerText.includes('TRAIN')]`), [true, false]);
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-mobile-cards.png')); eq('สคริปต์รันจบ', false, true); }
  await prisma.workExperience.deleteMany({ where: { id: we.id } });
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
