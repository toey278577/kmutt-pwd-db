// หน้ารายชื่อ: ตัวกรองหลายเงื่อนไข (รุ่น/เพศ/จังหวัด/ประเภทความพิการ/งานล่าสุด) ใช้พร้อมกัน + กับคำค้น
// · ช่องที่เลือกเป็นสีส้ม · ล้างตัวกรอง · จำใน URL (รีเฟรช/กดดูแล้วกลับ ยังอยู่) · มือถือไม่ล้นจอ
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const types = await prisma.disabilityType.findMany({ orderBy: { id: 'asc' } });
  const all = await prisma.person.findMany({ include: { disabilityInfos: true, followUps: { orderBy: [{ followUpDate: 'desc' }, { id: 'desc' }], take: 1 } } });
  const latest = (p) => p.followUps[0]?.employmentStatus ?? 'NONE';
  const count = (fn) => all.filter(fn).length;
  const b = await browser();
  const sel = (label) => `document.querySelector('main select[aria-label="${label}"]')`;
  const pick = async (label, value) => { await b.setValue(sel(label), value); await sleep(700); };
  const rows = () => b.evaluate(`[...document.querySelectorAll('main tbody tr')].filter(r => r.children.length === 9).map(r => r.innerText)`);
  const header = () => b.evaluate(`document.querySelector('main h1').nextElementSibling.textContent.trim()`);
  const q = () => b.evaluate(`Object.fromEntries(new URLSearchParams(location.search))`);
  try {
    await b.login(admin.id);
    await b.nav('/persons');
    await b.waitFor(`document.querySelectorAll('main tbody tr').length > 3`, 'ตาราง');
    eq('มีตัวกรอง 5 ช่อง', await b.evaluate(`['รุ่น','เพศ','จังหวัด','ประเภทความพิการ','งานล่าสุด'].map(l => !!document.querySelector('main select[aria-label="' + l + '"]'))`), [true, true, true, true, true]);
    eq('ยังไม่กรอง → ไม่มีปุ่มล้างตัวกรอง', await b.evaluate(`[...document.querySelectorAll('main button')].some(x => x.textContent.includes('ล้างตัวกรอง') && x.offsetParent)`), false);

    await pick('เพศ', 'FEMALE');
    let r = await rows();
    eq('กรองเพศหญิง: จำนวนถูก + ทุกแถวเป็นหญิง', [r.length, r.every((t) => t.includes('หญิง'))], [count((p) => p.gender === 'FEMALE'), true]);
    eq('ช่องที่เลือกอยู่เป็นสีส้ม ช่องอื่นไม่', await b.evaluate(`[${sel('เพศ')}.className.includes('bg-orange-50'), ${sel('จังหวัด')}.className.includes('bg-orange-50')]`), [true, false]);
    eq('หัวหน้า "ค้นพบ" + จำลง URL', [(await header()).startsWith('ค้นพบ'), (await q()).gender], [true, 'FEMALE']);

    await pick('งานล่าสุด', 'UNEMPLOYED');
    r = await rows();
    eq('หญิง + ว่างงาน พร้อมกัน', [r.length, r.every((t) => t.includes('หญิง') && t.includes('ว่างงาน'))], [count((p) => p.gender === 'FEMALE' && latest(p) === 'UNEMPLOYED'), true]);
    eq('ปุ่ม "ล้างตัวกรอง (2)"', await b.evaluate(`[...document.querySelectorAll('main button')].some(x => x.textContent.includes('ล้างตัวกรอง (2)') && x.offsetParent)`), true);
    await b.screenshot(shot('filters-desktop.png'));

    console.log('── จำใน URL');
    await b.nav('/persons?gender=FEMALE&emp=UNEMPLOYED');
    await b.waitFor(`document.querySelectorAll('main tbody tr').length > 0`, 'ตารางหลังรีเฟรช'); await sleep(500);
    eq('รีเฟรชแล้วตัวกรองยังอยู่ + ผลเท่าเดิม', [await b.evaluate(`[${sel('เพศ')}.value, ${sel('งานล่าสุด')}.value]`), (await rows()).length], [['FEMALE', 'UNEMPLOYED'], count((p) => p.gender === 'FEMALE' && latest(p) === 'UNEMPLOYED')]);
    await b.evaluate(`document.querySelector('main tbody tr').click(), true`);
    await b.waitFor(`/^\\/persons\\/\\d+$/.test(location.pathname)`, 'หน้ารายละเอียด'); await sleep(300);
    await b.evaluate(`history.back(), true`);
    await b.waitFor(`location.pathname === '/persons' && document.querySelectorAll('main tbody tr').length > 0`, 'กลับมาหน้ารายชื่อ'); await sleep(500);
    eq('กดดูรายละเอียดแล้วกลับ → ตัวกรองยังอยู่', await b.evaluate(`[${sel('เพศ')}.value, ${sel('งานล่าสุด')}.value]`), ['FEMALE', 'UNEMPLOYED']);

    await b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.includes('ล้างตัวกรอง (2)') && x.offsetParent).click(), true`);
    await sleep(700);
    eq('ล้างตัวกรอง → ครบทุกคน + URL สะอาด', [(await rows()).length, Object.keys(await q()).length], [Math.min(all.length, 10), 0]);

    console.log('── ร่วมกับคำค้น / ประเภท / ยังไม่ติดตาม');
    await b.setValue(`document.querySelector('main input[aria-label="ค้นหาคนพิการ"]')`, 'มาลี'); await sleep(900);
    await pick('เพศ', 'MALE');
    eq('คำค้น "มาลี" + เพศชาย → ไม่เจอ', (await rows()).length, 0);
    await pick('เพศ', 'FEMALE');
    eq('คำค้น "มาลี" + เพศหญิง → 1 คน', (await rows()).length, 1);
    await b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.trim().endsWith('ล้าง') && !x.textContent.includes('ตัวกรอง')).click(), true`); await sleep(300);
    await b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.includes('ล้างตัวกรอง') && x.offsetParent).click(), true`); await sleep(700);
    const shortName = types[0].typeName.replace(/^ความพิการทาง/, '');
    await pick('ประเภทความพิการ', String(types[0].id));
    r = await rows();
    eq(`ประเภท "${shortName}": จำนวนถูก`, r.length, Math.min(10, count((p) => p.disabilityInfos.some((d) => d.disabilityTypeId === types[0].id))));
    eq('ตัวเลือกประเภทใช้ชื่อย่อ (ไม่ยาวล้นช่อง)', await b.evaluate(`[...${sel('ประเภทความพิการ')}.options].some(o => o.textContent === ${JSON.stringify(shortName)})`), true);
    await pick('ประเภทความพิการ', '');
    await pick('งานล่าสุด', 'NONE');
    r = await rows();
    eq('ยังไม่ติดตาม: ทุกแถวขึ้น "ยังไม่ติดตาม"', [r.length, r.every((t) => t.includes('ยังไม่ติดตาม'))], [Math.min(10, count((p) => latest(p) === 'NONE')), true]);

    console.log('── มือถือ');
    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await b.nav('/persons?gender=FEMALE');
    const toggle = `[...document.querySelectorAll('main button')].find(x => x.getAttribute('aria-expanded') !== null && x.offsetParent)`;
    await b.waitFor(toggle, 'ปุ่มตัวกรองมือถือ'); await sleep(800);
    eq('มือถือ: ตัวกรองพับเก็บ เหลือปุ่ม "ตัวกรอง (1)" บอกจำนวนที่เลือก', [await b.evaluate(`${toggle}.textContent.trim()`), await b.evaluate(`!${sel('เพศ')}.offsetParent`)], ['ตัวกรอง (1)', true]);
    eq('มือถือ: ปุ่มล้างตัวกรองอยู่ข้างปุ่มตัวกรอง (ไม่ต้องกางก่อน)', await b.evaluate(`(() => { const c = [...document.querySelectorAll('main button')].find(x => x.textContent.includes('ล้างตัวกรอง') && x.offsetParent); return !!c && Math.abs(c.getBoundingClientRect().top - ${toggle}.getBoundingClientRect().top) < 20; })()`), true);
    await b.screenshot(shot('filters-mobile-closed.png'));
    await b.evaluate(`${toggle}.click(), true`); await sleep(300);
    eq('มือถือ: กดแล้วกางออก ไม่ล้นจอ + เรียง 2 คอลัมน์', await b.evaluate(`(() => { const xs = new Set(['รุ่น','เพศ','จังหวัด','ประเภทความพิการ'].map(l => Math.round(document.querySelector('main select[aria-label="' + l + '"]').getBoundingClientRect().left))); return [!!${sel('เพศ')}.offsetParent, document.documentElement.scrollWidth <= innerWidth, xs.size]; })()`), [true, true, 2]);
    await b.screenshot(shot('filters-mobile.png'));
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-filters.png')); eq('สคริปต์รันจบ', false, true); }
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
