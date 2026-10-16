// หน้า "ข้อมูลยังไม่ครบ" (/data-check) — เห็นใครขาดอะไร · กรองตามช่อง · กดแถว → เปิดฟอร์มแก้ไขคนนั้นทันที เติมแล้วหายจากรายการ
// มือถือเป็นการ์ด · ผู้ดูข้อมูลกดแล้วไปหน้ารายละเอียด (แก้ไม่ได้)
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');
const { missingFields } = require('../../backend/src/utils/incomplete');
const ROWS = `[...document.querySelectorAll('main tbody tr.row-link')]`;
const DLG = `document.querySelector('dialog[open]')`;

(async () => {
  const staff = await prisma.user.findFirst({ where: { role: 'STAFF', isActive: true } });
  const viewer = await prisma.user.findFirst({ where: { role: 'VIEWER', isActive: true } });
  const batch = await prisma.trainingBatch.findFirst();
  const type = await prisma.disabilityType.findFirst();
  const made = [];
  const b = await browser();
  const rowNames = () => b.evaluate(`${ROWS}.map(r => r.querySelector('.row-link-name').textContent.trim())`);
  const open = async () => { await b.nav('/data-check'); await b.waitFor(`document.querySelector('main h1')?.textContent.includes('ข้อมูลยังไม่ครบ') && !document.querySelector('main .animate-spin')`, 'หน้าข้อมูลยังไม่ครบ'); await sleep(300); };
  const filter = (text) => b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.trim().startsWith(${JSON.stringify(text)})).click(), true`);
  try {
    await b.login(staff.id);
    await open();
    const all = await prisma.person.findMany({ include: { _count: { select: { disabilityInfos: true } } } });
    const expect = all.filter((p) => missingFields({ ...p, disabilityCount: p._count.disabilityInfos }).length > 0).length;
    eq('หัวหน้าบอกจำนวนคนที่ขาด ตรงกับฐานข้อมูล', await b.evaluate(`document.querySelector('main h1').parentElement.innerText.includes('${expect} คน จากทั้งหมด ${all.length} คน')`), true);

    const fix = await prisma.person.create({ data: { fullName: 'ทดสอบเติม จังหวัดหาย', gender: 'MALE', thaiId: '7777777700011', birthDate: new Date('1992-03-04'),
      educationLevel: 'ปริญญาตรี', mobile: '0811111111', batchId: batch.id } });
    await prisma.disabilityInfo.create({ data: { personId: fix.id, disabilityTypeId: type.id } });
    const many = await prisma.person.create({ data: { fullName: 'ทดสอบเติม ขาดเยอะ', gender: 'FEMALE' } });
    made.push(fix.id, many.id);
    await open();
    const names = await rowNames();
    eq('คนที่ขาดขึ้นในรายการ · ขาดเยอะขึ้นก่อน', [names.includes('ทดสอบเติม จังหวัดหาย'), names.indexOf('ทดสอบเติม ขาดเยอะ') < names.indexOf('ทดสอบเติม จังหวัดหาย')], [true, true]);
    eq('ป้ายบอกช่องที่ขาด', await b.evaluate(`${ROWS}.find(r => r.innerText.includes('จังหวัดหาย')).children[2].innerText.trim()`), 'จังหวัด');
    await filter('ไม่มีเลขบัตรประชาชน'); await sleep(200);
    const f1 = await rowNames();
    eq('กด "ไม่มีเลขบัตรประชาชน" → เหลือเฉพาะคนที่ไม่มีเลขบัตร', [f1.includes('ทดสอบเติม ขาดเยอะ'), f1.includes('ทดสอบเติม จังหวัดหาย')], [true, false]);
    await filter('ไม่มีจังหวัด'); await sleep(200);
    const f2 = await rowNames();
    eq('กด "ไม่มีจังหวัด" → เห็นทั้งสองคน', [f2.includes('ทดสอบเติม ขาดเยอะ'), f2.includes('ทดสอบเติม จังหวัดหาย')], [true, true]);
    await filter('ทั้งหมด'); await sleep(200);
    await b.screenshot(shot('data-check.png'));

    await b.evaluate(`${ROWS}.find(r => r.innerText.includes('จังหวัดหาย')).children[1].click(), true`);
    await b.waitFor(`location.pathname === '/persons' && ${DLG} && [...${DLG}.querySelectorAll('input')].some(i => i.value.includes('จังหวัดหาย'))`, 'ฟอร์มแก้ไขคนนั้น', 15000);
    eq('กดแถว → เปิดฟอร์มแก้ไขคนนั้นทันที (เอา ?edit ออกจาก URL แล้ว)', await b.evaluate(`location.search.includes('edit')`), false);
    await b.setValue(`[...${DLG}.querySelectorAll('label')].find(l => l.textContent.trim().startsWith('จังหวัด')).parentElement.querySelector('select')`, 'นนทบุรี');
    await b.clickText('บันทึกข้อมูล', DLG);
    await b.waitFor(`!${DLG}`, 'ฟอร์มปิดหลังบันทึก', 15000); await sleep(400);
    eq('เติมจังหวัดแล้วบันทึกได้', (await prisma.person.findUnique({ where: { id: fix.id } })).province, 'นนทบุรี');
    await open();
    eq('เติมครบแล้ว → หายจากรายการ', (await rowNames()).includes('ทดสอบเติม จังหวัดหาย'), false);

    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await open();
    eq('มือถือ: เป็นการ์ด + ป้ายช่องที่ขาด + ไม่ล้นจอ', await b.evaluate(`[[...document.querySelectorAll('main [data-card]')].some(c => c.offsetParent && c.innerText.includes('ขาดเยอะ') && c.innerText.includes('ประเภทความพิการ')), document.documentElement.scrollWidth <= innerWidth]`), [true, true]);
    await b.screenshot(shot('m-data-check.png'));
    await b.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });

    await b.login(viewer.id);
    await open();
    eq('ผู้ดูข้อมูล: ไม่มีปุ่มเติมข้อมูล', await b.evaluate(`document.querySelector('main').innerText.includes('เติมข้อมูล')`), false);
    await b.evaluate(`${ROWS}.find(r => r.innerText.includes('ขาดเยอะ')).children[1].click(), true`);
    await b.waitFor(`location.pathname === '/persons/${many.id}'`, 'หน้ารายละเอียด');
    eq('ผู้ดูข้อมูล: กดแถว → หน้ารายละเอียด (ไม่เปิดฟอร์มแก้ไข)', await b.evaluate(`!!${DLG}`), false);
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-data-check.png')); eq('สคริปต์รันจบ', false, true); }
  await prisma.disabilityInfo.deleteMany({ where: { personId: { in: made } } });
  await prisma.person.deleteMany({ where: { id: { in: made } } });
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
