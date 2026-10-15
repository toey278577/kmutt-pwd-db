// กล่องผู้ใช้มุมซ้ายล่าง แบบ "การ์ดใส ตัวหนังสือเรืองแสง" (พี่เต้ย 15 ต.ค. 69 — การ์ดขาวไม่สวย)
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
    eq('การ์ดใส (พื้นโปร่ง + เบลอหลัง) ไม่มีวงกลมไล่สี/จุดเขียวข้างใน', await b.evaluate(`(() => { const cs = getComputedStyle(${CARD});
      return [cs.backgroundColor, cs.backgroundImage.includes('rgba(255, 255, 255, 0.24)'), cs.backdropFilter.includes('blur'),
              [...${CARD}.querySelectorAll('*')].some(e => getComputedStyle(e).backgroundImage.includes('gradient'))]; })()`), ['rgba(0, 0, 0, 0)', true, true, false]);
    eq('ชื่อตัวขาวเรืองแสง + ไม่ตัดขอบ (แสงไม่เป็นกล่องเหลี่ยม วรรณยุกต์ไม่หาย)', await b.evaluate(`(() => { const cs = getComputedStyle(${CARD}.querySelector('p')); return [cs.color, cs.textShadow.includes('rgba(255, 214, 170, 0.6)'), cs.overflow]; })()`), ['rgb(255, 255, 255)', true, 'visible']);
    await b.screenshot(shot('usercard-staff.png'));

    await b.login(admin.id);
    await open();
    eq(`แอดมินชื่อ "${admin.name}" = บทบาท → ไม่โชว์ซ้ำ`, await b.evaluate(`${CARD}.innerText.split('\\n').map(s => s.trim()).filter(Boolean)`), admin.name === 'ผู้ดูแลระบบ' ? [admin.name] : [admin.name, 'ผู้ดูแลระบบ']);

    const lightColor = await b.evaluate(`getComputedStyle(${CARD}.querySelector('p')).color`);
    await b.evaluate(`document.documentElement.classList.add('dark'); true`); await sleep(300);
    eq('โหมดมืด: การ์ดเหมือนโหมดสว่าง (แถบเมนูสีส้มเหมือนเดิม)', await b.evaluate(`[getComputedStyle(${CARD}).backgroundColor, getComputedStyle(${CARD}.querySelector('p')).color]`), ['rgba(0, 0, 0, 0)', lightColor]);
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
