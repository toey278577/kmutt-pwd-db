// กล่องผู้ใช้มุมซ้ายล่าง แบบ "การ์ดขาว" (พี่เต้ยเลือกจาก 5 แบบ 15 ต.ค. 69)
// ชื่อ + บทบาท (ไม่โชว์ซ้ำถ้าบทบาทตรงกับชื่อ) · ไม่มีวงกลมไล่สี/จุดเขียว · ปุ่มออกจากระบบใช้ได้ · มือถือ (เมนูพับ) · โหมดมืด
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');
const CARD = `document.querySelector('aside [data-user-card]')`;

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const staff = await prisma.user.findFirst({ where: { role: 'STAFF', isActive: true } });
  const b = await browser();
  const open = async () => { await b.nav('/'); await b.waitFor(CARD, 'กล่องผู้ใช้'); await sleep(300); };
  try {
    await b.login(staff.id);
    await open();
    eq('เจ้าหน้าที่: เห็นชื่อ + บทบาท', await b.evaluate(`${CARD}.innerText.split('\\n').map(s => s.trim()).filter(Boolean)`), [staff.name, 'เจ้าหน้าที่']);
    eq('การ์ดพื้นขาว ไม่มีวงกลมไล่สี/จุดเขียว', await b.evaluate(`[getComputedStyle(${CARD}).backgroundColor, [...${CARD}.querySelectorAll('*')].some(e => getComputedStyle(e).backgroundImage.includes('gradient'))]`), ['rgb(255, 255, 255)', false]);
    await b.screenshot(shot('usercard-staff.png'));

    await b.login(admin.id);
    await open();
    eq(`แอดมินชื่อ "${admin.name}" = บทบาท → ไม่โชว์ซ้ำ`, await b.evaluate(`${CARD}.innerText.split('\\n').map(s => s.trim()).filter(Boolean)`), admin.name === 'ผู้ดูแลระบบ' ? [admin.name] : [admin.name, 'ผู้ดูแลระบบ']);

    const lightColor = await b.evaluate(`getComputedStyle(${CARD}.querySelector('p')).color`);
    await b.evaluate(`document.documentElement.classList.add('dark'); true`); await sleep(300);
    eq('โหมดมืด: การ์ดยังอ่านชัด (พื้นขาว ตัวหนังสือเข้ม)', await b.evaluate(`[getComputedStyle(${CARD}).backgroundColor, getComputedStyle(${CARD}.querySelector('p')).color]`), ['rgb(255, 255, 255)', lightColor]);
    await b.evaluate(`document.documentElement.classList.remove('dark'); true`);

    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await b.nav('/'); await sleep(800);
    await b.evaluate(`[...document.querySelectorAll('button')].find(x => x.offsetParent && x.querySelector('svg.lucide-menu'))?.click(), true`); await sleep(500);
    eq('มือถือ: เปิดเมนูแล้วเห็นการ์ดผู้ใช้ ไม่ล้นจอ', await b.evaluate(`[!!${CARD}?.offsetParent || ${CARD}?.getBoundingClientRect().width > 0, ${CARD}.getBoundingClientRect().right <= innerWidth]`), [true, true]);
    await b.screenshot(shot('m-usercard.png'));
    await b.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });

    await open();
    await b.evaluate(`${CARD}.querySelector('button[title="ออกจากระบบ"]').click(), true`);
    await b.waitFor(`location.pathname === '/login'`, 'ไปหน้าเข้าสู่ระบบ');
    eq('กดออกจากระบบ → ไปหน้าเข้าสู่ระบบ + ตั๋วถูกลบ', await b.evaluate(`!sessionStorage.getItem('token')`), true);
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-usercard.png')); eq('สคริปต์รันจบ', false, true); }
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
