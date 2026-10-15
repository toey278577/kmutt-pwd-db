// วงกลมตัวย่อสีรุ้งหน้าชื่อ ถูกเอาออกจากทุกหน้ารายการ (พี่เต้ยเลือก 15 ต.ค. 69 จากภาพเทียบ 4 แบบ: "ดูไม่สวย")
// → ทุกหน้า (จอคอม + มือถือ) ต้องไม่มีวงกลมสีโผล่กลับมา · ชื่อยังกดไปหน้ารายละเอียดได้
// · กรอบรูปในหน้ารายละเอียด (คนที่ยังไม่มีรูป) ยังโชว์ตัวย่อ และต้องเป็นตัวย่อที่ถูก (ไม่ขึ้น "นา" จาก "นางสาว")
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');
// วงกลมตัวย่อ = กล่องที่มีแต่ตัวอักษร 1-3 ตัว และพื้นเป็นสีไล่ระดับ
const AVATARS = `[...document.querySelectorAll('main div')].filter(d => d.offsetParent && d.children.length === 0 && /^[ก-๙A-Za-z]{1,3}$/.test(d.textContent.trim()) && getComputedStyle(d).backgroundImage.includes('gradient'))`;

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const malee = await prisma.person.create({ data: { fullName: 'นางสาว มาลี ทดสอบอีทูอี', gender: 'FEMALE', thaiId: '9999999930051' } });
  await prisma.trainingRecord.create({ data: { personId: malee.id, courseName: 'ทดสอบอีทูอี คอร์ส' } });
  const b = await browser();
  const PAGES = [
    ['รายชื่อคนพิการ', '/persons', `document.querySelectorAll('main tbody tr, main [data-card], main .divide-y > div').length > 3`],
    ['ติดตามผล', '/followup', `document.querySelector('main').innerText.includes('ธุรการ')`],
    ['การอบรม (ตามรุ่น)', '/training', `document.querySelector('main').innerText.includes('รุ่น')`],
    ['สถานประกอบการ', '/organizations', `document.querySelector('main').innerText.includes('ตัวอย่างยูไอ')`],
    ['ผู้ใช้', '/users', `document.querySelector('main').innerText.includes('admin@kmutt.ac.th')`],
  ];
  try {
    await b.login(admin.id);
    for (const [mode, w, h, scale, mobile] of [['จอคอม', 1400, 1000, 1, false], ['มือถือ', 390, 844, 2, true]]) {
      await b.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile });
      const found = [];
      for (const [name, url, ready] of PAGES) {
        await b.nav(url);
        await b.waitFor(ready, name); await sleep(500);
        const n = await b.evaluate(`${AVATARS}.length`);
        if (n) found.push(`${name}: ${n}`);
      }
      eq(`${mode}: ไม่มีวงกลมตัวย่อสีในหน้ารายการไหนเลย`, found, []);
    }
    await b.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
    await b.nav('/persons?q=' + encodeURIComponent('ทดสอบอีทูอี'));
    await b.waitFor(`document.querySelector('main tbody tr')?.innerText.includes('มาลี')`, 'แถวมาลี');
    await b.screenshot(shot('no-avatars.png'));
    await b.evaluate(`document.querySelector('main tbody tr').click(), true`);
    await b.waitFor(`location.pathname === '/persons/${malee.id}'`, 'ไปหน้ารายละเอียด');
    await b.waitFor(`document.querySelector('main .w-16.h-20')`, 'กรอบรูป');
    eq('กดแถวยังไปหน้ารายละเอียดได้ + กรอบรูป (ยังไม่มีรูป) โชว์ตัวย่อ "มท"', await b.evaluate(`document.querySelector('main .w-16.h-20').textContent.trim()`), 'มท');
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-initials.png')); eq('สคริปต์รันจบ', false, true); }
  await prisma.person.deleteMany({ where: { id: malee.id } });
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
