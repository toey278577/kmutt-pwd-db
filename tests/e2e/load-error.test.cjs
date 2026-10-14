// ข้อ 11: โหลดไม่สำเร็จต้องขึ้นกล่องแจ้ง + ลองใหม่ได้ (ไม่หมุนค้าง / ไม่หลอกว่าไม่มีข้อมูล)
const path = require('path');
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const org = await prisma.organization.create({ data: { orgName: 'ทดสอบอีทูอี องค์กรโหลด' } });
  const p = await prisma.person.create({ data: { fullName: 'นาย ทดสอบอีทูอี โหลด', gender: 'MALE', thaiId: '9999999930041' } });
  const b = await browser();
  await b.send('Network.enable');
  const block = (patterns) => b.send('Network.setBlockedURLs', { urls: patterns });
  const hasErrorBox = () => b.evaluate(`document.querySelector('main')?.textContent.includes('โหลดข้อมูลไม่สำเร็จ')`);
  const clickRetry = () => b.clickText('ลองใหม่', "document.querySelector('main')");
  try {
    await b.login(admin.id);
    const pages = [
      ['การอบรม', '/training', '*api/data/training-all*', `document.querySelector('main h1')?.textContent.includes('การอบรม')`],
      ['ติดตามผล', '/followup', '*api/data/followup-all*', `document.querySelector('main h1')?.textContent.includes('ติดตามผล')`],
      ['สถานประกอบการ', '/organizations', '*api/organizations*', `document.querySelector('main').textContent.includes('ทดสอบอีทูอี องค์กรโหลด')`],
      ['จัดการผู้ใช้', '/users', '*api/users*', `document.querySelector('main h1')?.textContent.includes('จัดการผู้ใช้งาน')`],
      ['ออกรายงาน', '/report', '*api/persons?withPhotos*', `document.querySelector('main').textContent.includes('รายชื่อคนพิการ')`],
      ['จัดการรุ่น', '/batches', '*api/batches*', `/ยังไม่มีรุ่น|รุ่นที่ /.test(document.querySelector('main').textContent)`],
      ['รายละเอียดคนพิการ', `/persons/${p.id}`, `*api/persons/${p.id}`, `document.querySelector('main').textContent.includes('ทดสอบอีทูอี โหลด')`],
    ];
    for (const [name, url, pattern, okExpr] of pages) {
      await block([pattern]);
      await b.nav(url);
      let shown = false;
      try { await b.waitFor(`document.querySelector('main')?.textContent.includes('โหลดข้อมูลไม่สำเร็จ')`, 'กล่องโหลดไม่สำเร็จ', 40000); shown = true; } catch { /* ไม่ขึ้น */ }
      if (name === 'การอบรม') await b.screenshot(shot('11-load-error.png'));
      await block([]);
      let recovered = false;
      if (shown) { await clickRetry(); try { await b.waitFor(okExpr, 'ข้อมูลขึ้นหลังลองใหม่', 15000); recovered = !(await hasErrorBox()); } catch { /* ไม่ขึ้น */ } }
      eq(`${name}: โหลดพัง → ขึ้นกล่องแจ้ง · กดลองใหม่ → ข้อมูลขึ้น`, [shown, recovered], [true, true]);
    }
    await b.nav('/persons/999999');
    await b.waitFor(`document.querySelector('main')?.textContent.includes('ไม่พบข้อมูลคนพิการคนนี้')`, 'ข้อความไม่พบ', 15000).catch(() => {});
    eq('เปิดคนที่ถูกลบไปแล้ว → "ไม่พบข้อมูล" + ปุ่มกลับ (เดิมหมุนค้าง)', await b.evaluate(`[document.querySelector('main').textContent.includes('ไม่พบข้อมูลคนพิการคนนี้'), [...document.querySelectorAll('main button')].some(x => x.textContent.includes('กลับ')), [...document.querySelectorAll('main button')].some(x => x.textContent.includes('ลองใหม่'))]`), [true, true, false]);
  } catch (e) {
    console.log('FAIL  ทดสอบสะดุด:', e.message); await b.screenshot(shot('crash-11.png'));
    eq('ไม่สะดุด', e.message, '');
  } finally {
    await block([]).catch(() => {});
    await b.close();
    await prisma.person.delete({ where: { id: p.id } });
    await prisma.organization.delete({ where: { id: org.id } });
    const f = summary();
    await prisma.$disconnect();
    process.exit(f ? 1 : 0);
  }
})().catch((e) => { console.error(e); process.exit(1); });
