// หน้า "ประเภทความพิการ" (แอดมิน): เพิ่ม → แก้ชื่อในที่ → ลบ (ประเภทที่มีคนใช้ปุ่มลบกดไม่ได้)
// ประเภทใหม่โผล่ในตัวกรอง/ฟอร์มทันที · เจ้าหน้าที่ไม่เห็นเมนู เข้าตรงๆ ไม่ได้ · มือถือไม่ล้นจอ
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const staff = await prisma.user.findFirst({ where: { role: 'STAFF', isActive: true } });
  const b = await browser();
  const rows = `[...document.querySelectorAll('main [data-type-row]')]`;
  const row = (name) => `${rows}.find(r => r.innerText.includes(${JSON.stringify(name)}))`;
  const NEW = 'ความพิการทางการพูด ทดสอบ';
  try {
    await b.login(admin.id);
    await b.nav('/');
    await b.waitFor(`[...document.querySelectorAll('button')].some(x => x.textContent.trim() === 'ประเภทความพิการ')`, 'เมนูแอดมิน');
    await b.clickText('ประเภทความพิการ');
    await b.waitFor(`${rows}.length > 0`, 'รายการประเภท'); await sleep(300);
    const types = await prisma.disabilityType.findMany({ orderBy: { id: 'asc' }, include: { _count: { select: { disabilityInfos: true } } } });
    eq('เปิดจากเมนูได้ + เห็นครบทุกประเภท', [await b.evaluate('location.pathname'), await b.evaluate(`${rows}.length`)], ['/disability-types', types.length]);
    eq('บอกจำนวนคนที่ใช้ถูก', await b.evaluate(`${row(types[0].typeName)}.innerText.includes('ใช้อยู่ ${types[0]._count.disabilityInfos} คน')`), true);
    eq('ประเภทที่มีคนใช้ → ปุ่มลบกดไม่ได้ + บอกเหตุผล', await b.evaluate(`(() => { const d = ${row(types[0].typeName)}.querySelector('button[title^="ลบไม่ได้"]'); return [!!d, d?.disabled]; })()`), [true, true]);

    console.log('── เพิ่ม / แก้ / ลบ');
    await b.setValue(`document.querySelector('main input[aria-label="ชื่อประเภทความพิการใหม่"]')`, NEW);
    await b.clickText('เพิ่มประเภท', "document.querySelector('main')"); await sleep(800);
    eq('เพิ่มแล้วขึ้นในรายการ + ช่องว่างพร้อมพิมพ์ต่อ', [await b.evaluate(`!!${row(NEW)}`), await b.evaluate(`document.querySelector('main input[aria-label="ชื่อประเภทความพิการใหม่"]').value`), await prisma.disabilityType.count({ where: { typeName: NEW } })], [true, '', 1]);
    await b.setValue(`document.querySelector('main input[aria-label="ชื่อประเภทความพิการใหม่"]')`, types[1].typeName);
    await b.clickText('เพิ่มประเภท', "document.querySelector('main')"); await sleep(600);
    eq('เพิ่มชื่อซ้ำ → แจ้งเตือน ไม่เพิ่ม', [await b.evaluate("document.body.innerText.includes('มีประเภทความพิการชื่อนี้อยู่แล้ว')"), await prisma.disabilityType.count({ where: { typeName: types[1].typeName } })], [true, 1]);

    await b.evaluate(`${row(NEW)}.querySelector('button[title="แก้ชื่อ"]').click(), true`); await sleep(200);
    await b.setValue(`document.querySelector('main input[aria-label="แก้ชื่อประเภทความพิการ"]')`, 'ทิ้ง');
    await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(300);
    eq('Esc ยกเลิกการแก้ ชื่อเดิมอยู่', [await b.evaluate(`!!${row(NEW)}`), await prisma.disabilityType.count({ where: { typeName: NEW } })], [true, 1]);
    await b.evaluate(`${row(NEW)}.querySelector('button[title="แก้ชื่อ"]').click(), true`); await sleep(200);
    await b.setValue(`document.querySelector('main input[aria-label="แก้ชื่อประเภทความพิการ"]')`, NEW + ' (แก้)');
    await b.evaluate(`document.querySelector('main button[title="บันทึก"]').click(), true`); await sleep(800);
    eq('แก้ชื่อในที่ → บันทึกจริง', [await b.evaluate(`!!${row(NEW + ' (แก้)')}`), await prisma.disabilityType.count({ where: { typeName: NEW + ' (แก้)' } })], [true, 1]);
    await b.screenshot(shot('disability-types.png'));

    await b.nav('/persons'); await b.waitFor(`document.querySelector('main select[aria-label="ประเภทความพิการ"]')`, 'ตัวกรอง'); await sleep(500);
    eq('ประเภทใหม่โผล่ในตัวกรองหน้ารายชื่อทันที (ไม่ติด cache)', await b.evaluate(`[...document.querySelector('main select[aria-label="ประเภทความพิการ"]').options].some(o => o.textContent.includes('การพูด ทดสอบ (แก้)'))`), true);
    await b.nav('/disability-types'); await b.waitFor(row(NEW + ' (แก้)'), 'รายการ');
    await b.evaluate(`${row(NEW + ' (แก้)')}.querySelector('button[title="ลบ"]').click(), true`);
    await b.waitFor(`[...document.querySelectorAll('button')].some(x => x.textContent.trim() === 'ยืนยัน')`, 'กล่องยืนยัน');
    await b.evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'ยืนยัน').click(), true`); await sleep(800);
    eq('ลบประเภทที่ไม่มีคนใช้ → หาย', [await b.evaluate(`!!${row(NEW)}`), await prisma.disabilityType.count({ where: { typeName: { startsWith: NEW } } })], [false, 0]);

    console.log('── มือถือ + สิทธิ์');
    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await b.nav('/disability-types'); await b.waitFor(`${rows}.length > 0`, 'รายการมือถือ'); await sleep(300);
    eq('มือถือ: ไม่ล้นจอ', await b.evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    await b.screenshot(shot('m-disability-types.png'));
    await b.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
    await b.login(staff.id);
    await b.nav('/disability-types'); await sleep(900);
    eq('เจ้าหน้าที่: ไม่มีเมนู + เข้าตรงๆ ไม่เห็นหน้า', [await b.evaluate(`[...document.querySelectorAll('button')].some(x => x.textContent.trim() === 'ประเภทความพิการ')`), await b.evaluate(`!!document.querySelector('main [data-type-row]')`)], [false, false]);
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-distypes.png')); eq('สคริปต์รันจบ', false, true); }
  await prisma.disabilityType.deleteMany({ where: { typeName: { startsWith: NEW } } });
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
