// เปิดทุกหน้าในระบบ (จอคอม + มือถือ) — ไม่พัง ไม่มี JS error ไม่ขึ้นกล่องโหลดไม่สำเร็จ ไม่ล้นจอมือถือ
// + ล็อกอินจริงผ่านฟอร์ม + ปุ่มสลับโหมดมืด + เจ้าหน้าที่เข้าหน้าเฉพาะแอดมินไม่ได้
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const staff = await prisma.user.findFirst({ where: { role: 'STAFF', isActive: true } });
  const person = await prisma.person.findFirst({ where: { thaiId: '8888888810000' } });
  const b = await browser();
  const PAGES = [
    ['Dashboard', '/'], ['รายชื่อคนพิการ', '/persons'], ['รายละเอียด', `/persons/${person.id}`], ['การอบรม', '/training'],
    ['ติดตามผล', '/followup'], ['สถานประกอบการ', '/organizations'], ['จัดการรุ่น', '/batches'], ['ออกรายงาน', '/report'],
    ['คู่มือ', '/help'], ['จัดการผู้ใช้', '/users'], ['ประวัติการใช้งาน', '/audit'],
  ];
  const state = () => b.evaluate(`(() => {
    const m = document.querySelector('main'); const t = m ? m.innerText : '';
    return { h1: !!document.querySelector('main h1') || t.length > 200, crashed: t.includes('เกิดข้อผิดพลาด') && !!document.querySelector('main button'),
      loadErr: t.includes('โหลดข้อมูลไม่สำเร็จ'), fits: document.documentElement.scrollWidth <= innerWidth };
  })()`);
  try {
    console.log('── ล็อกอินจริงผ่านฟอร์ม');
    await b.nav('/login');
    await b.evaluate(`sessionStorage.clear(); true`);
    await b.nav('/login');
    await b.waitFor(`document.querySelector('input[type=email]')`, 'ฟอร์มล็อกอิน');
    await b.setValue(`document.querySelector('input[type=email]')`, 'ADMIN@kmutt.ac.th');   // ตัวพิมพ์ใหญ่ก็ต้องเข้าได้
    await b.setValue(`document.querySelector('input[type=password]')`, 'admin123');
    await b.evaluate(`document.querySelector('button[type=submit]').click(), true`);
    await b.waitFor(`location.pathname === '/' && document.querySelector('main')`, 'เข้าหน้า Dashboard', 15000); await sleep(800);
    eq('ล็อกอินด้วยอีเมล+รหัสผ่านจริง → เข้า Dashboard', await b.evaluate(`[location.pathname, !!sessionStorage.getItem('token')]`), ['/', true]);

    for (const [mode, w, h, scale, mobile] of [['จอคอม', 1400, 1000, 1, false], ['มือถือ', 390, 844, 2, true]]) {
      console.log(`── ทุกหน้า (${mode})`);
      await b.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile });
      const bad = [];
      for (const [name, url] of PAGES) {
        const before = b.errors.length;
        await b.nav(url);
        try { await b.waitFor(`document.querySelector('main') && !document.querySelector('main .loading, main .animate-spin')`, name, 15000); } catch { /* ดูผลข้างล่าง */ }
        await sleep(900);
        const s = await state();
        const problems = [!s.h1 && 'ไม่มีเนื้อหา', s.crashed && 'หน้าพัง', s.loadErr && 'โหลดไม่สำเร็จ', mobile && !s.fits && 'ล้นจอ', b.errors.length > before && 'JS error'].filter(Boolean);
        if (problems.length) { bad.push(`${name}: ${problems.join(', ')}`); await b.screenshot(shot(`smoke-${mobile ? 'm' : 'd'}-${url.replace(/\W+/g, '_') || 'home'}.png`)); }
      }
      eq(`${mode}: เปิดได้ครบ ${PAGES.length} หน้า ไม่มีปัญหา`, bad, []);
    }

    console.log('── โหมดมืด');
    await b.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
    await b.nav('/');
    await b.waitFor(`document.querySelector('main')`, 'Dashboard');
    const wasDark = await b.evaluate(`document.documentElement.classList.contains('dark')`);
    await b.evaluate(`[...document.querySelectorAll('button')].find(x => /dark|light/i.test(x.parentElement?.innerText || '') && x.offsetParent && x.closest('aside'))?.click(), true`); await sleep(300);
    const nowDark = await b.evaluate(`document.documentElement.classList.contains('dark')`);
    await b.nav('/'); await sleep(600);
    eq('ปุ่มสลับโหมดมืดทำงาน + จำไว้หลังรีเฟรช', [nowDark !== wasDark, await b.evaluate(`document.documentElement.classList.contains('dark')`)], [true, nowDark]);
    await b.evaluate(`localStorage.setItem('theme', 'light'); document.documentElement.classList.remove('dark'); true`);

    console.log('── สิทธิ์หน้าเฉพาะแอดมิน');
    await b.login(staff.id);
    for (const url of ['/users', '/audit']) {
      await b.nav(url); await sleep(800);
      eq(`เจ้าหน้าที่เปิด ${url} → ไม่เห็นหน้านั้น`, await b.evaluate(`location.pathname !== ${JSON.stringify(url)} || !document.querySelector('main')?.innerText.includes(${JSON.stringify(url === '/users' ? 'จัดการผู้ใช้งาน' : 'ใครเพิ่ม แก้ไข ลบข้อมูล')})`), true);
    }
    eq('เมนูของเจ้าหน้าที่ไม่มีเมนูแอดมิน', await b.evaluate(`[...document.querySelectorAll('button')].some(x => ['จัดการผู้ใช้', 'ประวัติการใช้งาน'].includes(x.textContent.trim()))`), false);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-smoke.png')); eq('สคริปต์รันจบ', false, true); }
  if (b.errors.length) console.log('JS errors:', b.errors.slice(0, 5));
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
