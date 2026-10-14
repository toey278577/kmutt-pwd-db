// นำเข้า Excel ผ่านหน้าเว็บจริง: เทมเพลต v3 / ไฟล์ที่ผิดต้องนำเข้าไม่ได้ / ไฟล์ที่ถูกต้องเข้าครบ (รุ่น+หลักสูตร+ความพิการ)
const fs = require('fs');
const path = require('path');
const XLSX = require(require('path').join(require('../lib.cjs').FE, 'node_modules/xlsx'));
const { prisma, browser, eq, summary, sleep, API, SECRET, jwt, shot } = require('../lib.cjs');
const DIR = path.join(require('../lib.cjs').OUT, 'import');
fs.rmSync(DIR, { recursive: true, force: true });
fs.mkdirSync(DIR, { recursive: true });

const HEAD = ['ชื่อ-นามสกุล', 'ชื่อเล่น', 'เลขบัตรประชาชน', 'เพศ', 'วันเกิด', 'เบอร์โทร', 'โทรศัพท์บ้าน', 'อีเมล', 'เลขที่', 'หมู่ที่', 'อาคาร/หมู่บ้าน', 'ชั้นที่', 'ซอย', 'ถนน', 'แขวง/ตำบล', 'เขต/อำเภอ', 'จังหวัด', 'รหัสไปรษณีย์', 'สถานที่ใกล้เคียง', 'ระดับการศึกษา', 'รุ่นที่', 'ปี', 'หลักสูตร', 'ประเภทความพิการ'];
const row = (o) => HEAD.map((h) => o[h] ?? '');
const writeX = (name, rows, head = HEAD) => { const ws = XLSX.utils.aoa_to_sheet([head, ...rows]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'x'); const p = path.join(DIR, name); XLSX.writeFile(wb, p); return p; };

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const batch = await prisma.trainingBatch.create({ data: { batchNumber: 970, year: 2569, courseName: 'โครงการทดสอบนำเข้า', endDate: new Date('2026-08-31'), status: 'COMPLETED' } });
  const cA = await prisma.course.create({ data: { batchId: batch.id, name: 'ธุรการสำนักงาน' } });
  await prisma.course.create({ data: { batchId: batch.id, name: 'Data Entry' } });
  const types = await prisma.disabilityType.findMany({ orderBy: { id: 'asc' } });
  const base = { 'วันเกิด': '15/05/2540', 'จังหวัด': 'กรุงเทพมหานคร', 'ระดับการศึกษา': 'ปริญญาตรี' };

  const badFile = writeX('bad.xlsx', [
    row({ ...base, 'ชื่อ-นามสกุล': 'นาย ทดสอบนำเข้า ผิดรุ่น', 'เลขบัตรประชาชน': '9999999950001', 'รุ่นที่': '99', 'ปี': '2569', 'ประเภทความพิการ': 'มองเห็น' }),
    row({ ...base, 'ชื่อ-นามสกุล': 'นาย ทดสอบนำเข้า ผิดหลักสูตร', 'เลขบัตรประชาชน': '9999999950002', 'รุ่นที่': '970', 'ปี': '2569', 'หลักสูตร': 'บาริสต้า' }),
    row({ ...base, 'ชื่อ-นามสกุล': 'นาย ทดสอบนำเข้า ผิดความพิการ', 'เลขบัตรประชาชน': '9999999950003', 'รุ่นที่': '970', 'ปี': '2569', 'ประเภทความพิการ': 'หูหนวก' }),
    row({ ...base, 'ชื่อ-นามสกุล': 'นาย ทดสอบนำเข้า ถูกทุกช่อง', 'เลขบัตรประชาชน': '9999999950004', 'รุ่นที่': '970', 'ปี': '2569' }),
  ]);
  const goodFile = writeX('good.xlsx', [
    row({ ...base, 'ชื่อ-นามสกุล': 'นางสาว ทดสอบนำเข้า ครบ', 'เลขบัตรประชาชน': '9999999950011', 'เพศ': 'หญิง', 'รุ่นที่': '970', 'ปี': '2569', 'หลักสูตร': 'ธุรการสำนักงาน', 'ประเภทความพิการ': 'ความพิการทางการมองเห็น' }),
    row({ ...base, 'ชื่อ-นามสกุล': 'นาย ทดสอบนำเข้า ย่อ', 'เลขบัตรประชาชน': '9999999950012', 'รุ่นที่': 970, 'ปี': 2569, 'หลักสูตร': 'data entry', 'ประเภทความพิการ': 'การได้ยิน, สติปัญญา' }),
    row({ ...base, 'ชื่อ-นามสกุล': 'นาย ทดสอบนำเข้า ไม่มีรุ่น', 'เลขบัตรประชาชน': '9999999950013' }),
  ]);
  // ไฟล์รูปแบบเก่า v2 (ไม่มี 2 คอลัมน์ใหม่) ต้องยังนำเข้าได้
  const v2Head = HEAD.slice(0, 22);
  const oldFile = writeX('old-v2.xlsx', [v2Head.map((h) => ({ ...base, 'ชื่อ-นามสกุล': 'นาย ทดสอบนำเข้า ไฟล์เก่า', 'เลขบัตรประชาชน': '9999999950021', 'รุ่นที่': '970', 'ปี': '2569' })[h] ?? '')], v2Head);

  const b = await browser();
  const chooseFile = async (file) => {
    const { result: { root } } = await b.send('DOM.getDocument', { depth: -1 });
    const { result: { nodeId } } = await b.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type=file][accept=".xlsx,.xls"]' });
    await b.send('DOM.setFileInputFiles', { nodeId, files: [file] });
    await sleep(1200);
  };
  const modalText = () => b.evaluate(`[...document.querySelectorAll('div')].find(d => d.textContent.includes('เลือกไฟล์ Excel ที่กรอกแล้ว') && d.querySelector('button'))?.closest('.fixed, [class*=fixed]')?.textContent || document.body.textContent`);
  const importBtn = `[...document.querySelectorAll('button')].find(x => /นำเข้า \\d+ รายการ|แก้ไฟล์ก่อน|กำลังนำเข้า/.test(x.textContent))`;
  try {
    await b.login(admin.id);
    await b.nav('/persons');
    await b.waitFor(`[...document.querySelectorAll('button')].some(x => x.textContent.includes('นำเข้า Excel'))`, 'ปุ่มนำเข้า');
    await sleep(800);   // รอโหลดรายชื่อรุ่น/ประเภทความพิการ
    await b.clickText('นำเข้า Excel'); await sleep(400);

    console.log('── เทมเพลต v3');
    await b.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DIR.replace(/\//g, '\\') });
    await b.evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.includes('ดาวน์โหลดเทมเพลต')).click()`);
    let tpl;
    for (let i = 0; i < 30 && !tpl; i++) { await sleep(300); tpl = fs.readdirSync(DIR).find((f) => f.includes('v3') && f.endsWith('.xlsx')); }
    eq('ดาวน์โหลดได้ไฟล์ "เทมเพลตนำเข้าคนพิการ-v3.xlsx"', tpl, 'เทมเพลตนำเข้าคนพิการ-v3.xlsx');
    if (tpl) {
      const wb = XLSX.readFile(path.join(DIR, tpl));
      eq('มี 4 ชีต: นำเข้า / จังหวัด / รุ่นและหลักสูตร / ประเภทความพิการ', wb.SheetNames, ['นำเข้าคนพิการ', 'รายชื่อจังหวัด', 'รุ่นและหลักสูตร', 'ประเภทความพิการ']);
      const head = XLSX.utils.sheet_to_json(wb.Sheets['นำเข้าคนพิการ'], { header: 1 })[0];
      eq('หัวคอลัมน์ 24 ช่อง ปิดท้ายด้วย หลักสูตร + ประเภทความพิการ', [head.length, head.slice(-2)], [24, ['หลักสูตร', 'ประเภทความพิการ']]);
      const br = XLSX.utils.sheet_to_json(wb.Sheets['รุ่นและหลักสูตร'], { header: 1 });
      eq('ชีตรุ่นมีรุ่น 970/2569 + 2 หลักสูตร', br.filter((r) => r[0] === 970 && r[1] === 2569).map((r) => r[2]).sort(), ['Data Entry', 'ธุรการสำนักงาน']);
      const dr = XLSX.utils.sheet_to_json(wb.Sheets['ประเภทความพิการ'], { header: 1 }).slice(1).map((r) => r[0]);
      eq('ชีตประเภทความพิการครบ 7 ประเภท', dr, types.map((t) => t.typeName));
    }

    console.log('── ไฟล์ที่ผิด → นำเข้าไม่ได้ทั้งไฟล์');
    await chooseFile(badFile);
    const t1 = await modalText();
    eq('กล่องแดง: "3 แถวที่ข้อมูลไม่ตรงกับในระบบ"', t1.includes('มี 3 แถวที่ข้อมูลไม่ตรงกับในระบบ'), true);
    eq('บอกเหตุผลครบ 3 แบบ', [t1.includes('ไม่มีรุ่นที่ 99/2569 ในระบบ'), t1.includes('รุ่นนี้ไม่มีหลักสูตรนี้ — ที่มี: ธุรการสำนักงาน, Data Entry'), t1.includes('ไม่รู้จัก "หูหนวก"')], [true, true, true]);
    eq('ปุ่มเป็น "แก้ไฟล์ก่อน (3 แถว)" และกดไม่ได้', await b.evaluate(`[${importBtn}.textContent.trim(), ${importBtn}.disabled]`), ['แก้ไฟล์ก่อน (3 แถว)', true]);
    await b.screenshot(shot('import-bad.png'));
    eq('ยังไม่มีใครถูกนำเข้า (แม้แถวที่ถูก)', await prisma.person.count({ where: { fullName: { contains: 'ทดสอบนำเข้า' } } }), 0);

    console.log('── หลังบ้านกันซ้ำ (ยิง API ตรงด้วย id มั่ว)');
    const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: admin.id }, SECRET) };
    const api = await fetch(`${API}/persons/import`, { method: 'POST', headers: H, body: JSON.stringify({ persons: [
      { __row: 2, fullName: 'ทดสอบนำเข้า api1', batchId: '999999' },
      { __row: 3, fullName: 'ทดสอบนำเข้า api2', batchId: String(batch.id), courseId: '999999' },
      { __row: 4, fullName: 'ทดสอบนำเข้า api3', disabilityTypeIds: ['999999'] },
    ] }) });
    const aj = await api.json();
    eq('API: 400 + บอก 3 จุด + ไม่นำเข้า', [api.status, aj.badRefs?.map((x) => x.field), await prisma.person.count({ where: { fullName: { contains: 'ทดสอบนำเข้า api' } } })], [400, ['รุ่น', 'หลักสูตร', 'ประเภทความพิการ'], 0]);

    console.log('── ไฟล์ที่ถูกต้อง → นำเข้าครบ');
    await chooseFile(goodFile);
    const t2 = await modalText();
    eq('ไม่มีกล่องแดง ปุ่ม "นำเข้า 3 รายการ"', [t2.includes('นำเข้าไม่ได้ — มี'), await b.evaluate(`${importBtn}.textContent.trim()`)], [false, 'นำเข้า 3 รายการ']);
    eq('กล่องเหลือง: จับคู่ความพิการให้อัตโนมัติ + ไม่ได้ใส่รุ่น 1 แถว', [t2.includes('จับคู่ประเภทความพิการให้อัตโนมัติ 1 แถว'), t2.includes('ไม่ได้ใส่รุ่น 1 แถว')], [true, true]);
    eq('ตารางตัวอย่างโชว์ รุ่น 970/2569 + หลักสูตร + ความพิการแบบสั้น', [t2.includes('970/2569'), t2.includes('Data Entry'), t2.includes('การได้ยิน, สติปัญญา')], [true, true, true]);
    await b.screenshot(shot('import-good.png'));
    await b.evaluate(`${importBtn}.click()`);
    await b.waitFor(`![...document.querySelectorAll('button')].some(x => /นำเข้า \\d+ รายการ|กำลังนำเข้า/.test(x.textContent))`, 'นำเข้าเสร็จ', 20000);
    await sleep(500);
    const got = await prisma.person.findMany({ where: { fullName: { contains: 'ทดสอบนำเข้า' } }, include: { disabilityInfos: true }, orderBy: { thaiId: 'asc' } });
    eq('เข้าครบ 3 คน', got.length, 3);
    const [p1, p2, p3] = got;
    eq('คนที่ 1: รุ่น + หลักสูตรธุรการ + มองเห็น + เพศหญิง', [p1.batchId, p1.courseId, p1.disabilityInfos.map((d) => d.disabilityTypeId), p1.gender], [batch.id, cA.id, [types[0].id], 'FEMALE']);
    eq('คนที่ 2: หลักสูตร "data entry" จับคู่ได้ + ความพิการ 2 ประเภท', [p2.courseId !== null, p2.disabilityInfos.map((d) => d.disabilityTypeId).sort((x, y) => x - y)], [true, [types[1].id, types[3].id]]);
    eq('คนที่ 3: ไม่มีรุ่น ไม่มีความพิการ', [p3.batchId, p3.disabilityInfos.length], [null, 0]);

    console.log('── ไฟล์รูปแบบเก่า v2 ยังใช้ได้');
    await b.nav('/persons'); await sleep(900);
    await b.clickText('นำเข้า Excel'); await sleep(400);
    await chooseFile(oldFile);
    eq('ไฟล์ v2: ไม่มีกล่องแดง ปุ่ม "นำเข้า 1 รายการ"', [(await modalText()).includes('นำเข้าไม่ได้ — มี'), await b.evaluate(`${importBtn}.textContent.trim()`)], [false, 'นำเข้า 1 รายการ']);
    eq('ไม่มี error ในหน้าเว็บ', b.errors, []);
  } catch (e) {
    console.log('FAIL  ทดสอบสะดุด:', e.message); await b.screenshot(shot('crash-import.png'));
    eq('ไม่สะดุด', e.message, '');
  } finally {
    await b.close();
    await prisma.person.deleteMany({ where: { fullName: { contains: 'ทดสอบนำเข้า' } } });
    await prisma.trainingBatch.delete({ where: { id: batch.id } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ label: { contains: 'นำเข้า' } }, { label: { contains: 'ทดสอบนำเข้า' } }], createdAt: { gte: new Date(Date.now() - 3600_000) } } });
    const f = summary(); await prisma.$disconnect(); process.exit(f ? 1 : 0);
  }
})().catch((e) => { console.error(e); process.exit(1); });
