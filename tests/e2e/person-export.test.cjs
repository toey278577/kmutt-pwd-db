// หน้ารายชื่อ: ปุ่ม "ส่งออก Excel" ส่งออกตามคำค้น + ตัวกรอง — ครบทุกหน้า (ไม่ใช่แค่ 10 คนที่เห็น)
// เปิดไฟล์จริงมาตรวจ: หัวไฟล์บอกตัวกรอง · จำนวนคนถูก · เลขบัตร/เบอร์เป็นข้อความ (0 นำหน้าไม่หาย) · วันที่ พ.ศ.
const fs = require('fs');
const path = require('path');
const { prisma, browser, eq, summary, sleep, shot, OUT, FE } = require('../lib.cjs');
const XLSX = require(path.join(FE, 'node_modules/xlsx'));
const DIR = path.join(OUT, 'downloads-export');

(async () => {
  fs.rmSync(DIR, { recursive: true, force: true }); fs.mkdirSync(DIR, { recursive: true });
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const viewer = await prisma.user.findFirst({ where: { role: 'VIEWER', isActive: true } });
  // เพิ่มให้เกิน 1 หน้า (หน้าละ 10)
  const extra = await Promise.all([1, 2, 3, 4, 5].map((i) => prisma.person.create({ data: { fullName: `นาย ส่งออก ทดสอบ${i}`, gender: 'MALE', thaiId: `999999997000${i}` } })));
  const all = await prisma.person.findMany({ include: { followUps: { orderBy: [{ followUpDate: 'desc' }, { id: 'desc' }], take: 1 } } });
  const latest = (p) => p.followUps[0]?.employmentStatus ?? 'NONE';
  const b = await browser();
  const btn = `[...document.querySelectorAll('main button')].find(x => x.title.startsWith('ส่งออกรายชื่อ') && x.offsetParent)`;
  const exportFile = async () => {
    for (const f of fs.readdirSync(DIR)) fs.rmSync(path.join(DIR, f), { force: true });   // ล้างไฟล์เก่าก่อน จะได้รู้ว่าไฟล์ไหนเพิ่งได้
    const before = new Set();
    await b.evaluate(`${btn}.click(), true`);
    for (let i = 0; i < 40; i++) {
      await sleep(250);
      const f = fs.readdirSync(DIR).find((x) => !before.has(x) && x.endsWith('.xlsx'));
      if (f) { await sleep(300); const wb = XLSX.readFile(path.join(DIR, f)); return { name: f, ws: wb.Sheets[wb.SheetNames[0]], aoa: XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }) }; }
    }
    throw new Error('ไม่ได้ไฟล์ Excel');
  };
  const dataRows = (aoa) => aoa.slice(4);
  const open = async (url) => { await b.nav(url); await b.waitFor(`${btn} && !${btn}.disabled`, 'ปุ่มส่งออก'); await sleep(500); };
  try {
    await b.login(admin.id);
    await b.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DIR.replace(/\//g, '\\') });

    console.log('── ทั้งหมด (เกิน 1 หน้า)');
    await open('/persons');
    eq('ปุ่มบอกจำนวนคนที่จะส่งออก', await b.evaluate(`${btn}.textContent.trim()`), `ส่งออก Excel (${all.length})`);
    let x = await exportFile();
    eq(`ส่งออกครบทุกหน้า ${all.length} คน (หน้าจอเห็นแค่ 10)`, [dataRows(x.aoa).length, await b.evaluate(`document.querySelectorAll('main tbody tr').length`)], [all.length, 10]);
    eq('หัวไฟล์บอกว่า "ทั้งหมด"', String(x.aoa[0][0]), `รายชื่อคนพิการ — ทั้งหมด (${all.length} คน)`);

    console.log('── ตามตัวกรอง');
    await open('/persons?gender=FEMALE&emp=UNEMPLOYED');
    x = await exportFile();
    const want = all.filter((p) => p.gender === 'FEMALE' && latest(p) === 'UNEMPLOYED');
    eq('ชื่อไฟล์บอกตัวกรอง (ส่งออกหลายกลุ่มไม่ทับกัน)', x.name.startsWith('รายชื่อคนพิการ-หญิง-ว่างงาน-'), true);
    eq('หัวไฟล์บอกตัวกรอง', String(x.aoa[0][0]), `รายชื่อคนพิการ — ตัวกรอง: หญิง · ว่างงาน (${want.length} คน)`);
    eq('คนในไฟล์ = คนที่ตรงตัวกรอง', dataRows(x.aoa).map((r) => r[1]).sort(), want.map((p) => p.fullName).sort());
    const head = x.aoa[3];
    const col = (n) => head.indexOf(n);
    const p1 = await prisma.person.findFirst({ where: { thaiId: '8888888810001' } });
    const r1 = dataRows(x.aoa).find((r) => r[1] === p1.fullName);
    const cellType = (c) => x.ws[XLSX.utils.encode_cell({ r: 3 + 1 + dataRows(x.aoa).indexOf(r1), c })]?.t;
    eq('เลขบัตร + มือถือเก็บเป็นข้อความ (0 นำหน้าไม่หาย ไม่เป็น 8.88E+12)', [r1[col('เลขบัตรประชาชน')], cellType(col('เลขบัตรประชาชน')), r1[col('มือถือ')].startsWith('0'), cellType(col('มือถือ'))], ['8888888810001', 's', true, 's']);
    const by = p1.birthDate.toISOString().slice(0, 10).split('-');
    eq('วันเกิดเป็น พ.ศ. + รุ่น + งานล่าสุด', [r1[col('วันเกิด')], r1[col('รุ่น')], r1[col('งานล่าสุด')]], [`${by[2]}/${by[1]}/${+by[0] + 543}`, 'รุ่นที่ 813/2569', 'ว่างงาน']);

    await open(`/persons?q=${encodeURIComponent('มาลี')}&gender=FEMALE`);
    x = await exportFile();
    eq('คำค้น + ตัวกรอง → หัวไฟล์บอกครบ + 1 คน + ชื่อไฟล์ไม่มีอักขระต้องห้าม', [String(x.aoa[0][0]).includes('ค้นหา "มาลี"'), dataRows(x.aoa).length, x.name.startsWith('รายชื่อคนพิการ-ค้นหา มาลี-หญิง-')], [true, 1, true]);
    await b.nav('/persons?gender=MALE&province=' + encodeURIComponent('นนทบุรี')); await sleep(1200);
    eq('ไม่มีใครตรง → ปุ่มกดไม่ได้', await b.evaluate(`${btn}?.disabled`), true);

    console.log('── มือถือ + ผู้ดูข้อมูล');
    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await open('/persons?emp=NONE');
    eq('มือถือ: ปุ่มอยู่แถวเดียวกับปุ่มตัวกรอง ไม่ล้นจอ', await b.evaluate(`(() => { const t = [...document.querySelectorAll('main button')].find(x => x.getAttribute('aria-expanded') !== null && x.offsetParent); return [Math.abs(${btn}.getBoundingClientRect().top - t.getBoundingClientRect().top) < 20, document.documentElement.scrollWidth <= innerWidth]; })()`), [true, true]);
    eq('มือถือ: ปุ่มในแถวตัวกรองไม่ตกบรรทัด', await b.evaluate(`[...document.querySelectorAll('main button')].filter(x => x.offsetParent && /ตัวกรอง|Excel/.test(x.textContent) && x.getBoundingClientRect().top < 700).every(x => x.getBoundingClientRect().height < 46)`), true);
    await b.screenshot(shot('m-export.png'));
    await b.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
    await b.login(viewer.id);
    await open('/persons');
    x = await exportFile();
    eq('ผู้ดูข้อมูลส่งออกได้ (อ่านอย่างเดียว ไม่ได้แก้ข้อมูล)', dataRows(x.aoa).length, all.length);
    await b.screenshot(shot('export-desktop.png'));
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-export.png')); eq('สคริปต์รันจบ', false, true); }
  await prisma.person.deleteMany({ where: { id: { in: extra.map((p) => p.id) } } });
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
