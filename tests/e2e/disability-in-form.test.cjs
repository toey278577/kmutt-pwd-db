// ข้อ 6: ประเภทความพิการในฟอร์มแก้ไข (ลบเมื่อบันทึก / ยกเลิกได้ / เลือกซ้ำไม่ได้) + หลังบ้านกันซ้ำ + สคริปต์ล้างรายการซ้ำ
const path = require('path');
const { execFileSync } = require('child_process');
const { prisma, browser, eq, summary, sleep, API, SECRET, jwt, B, shot } = require('../lib.cjs');

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const types = await prisma.disabilityType.findMany({ orderBy: { id: 'asc' } });
  const [A, Bt, C] = types;
  const batch = await prisma.trainingBatch.create({ data: { batchNumber: 981, year: 2569, courseName: 'ทดสอบอีทูอี' } });
  const p = await prisma.person.create({ data: { fullName: 'นาย ทดสอบอีทูอี พิการ', gender: 'MALE', thaiId: '9999999930011', birthDate: new Date('1990-01-01'), province: 'กรุงเทพมหานคร', mobile: '0800000000', educationLevel: 'ปริญญาตรี', batchId: batch.id } });
  await prisma.disabilityInfo.createMany({ data: [{ personId: p.id, disabilityTypeId: A.id }, { personId: p.id, disabilityTypeId: Bt.id }] });
  const typesOf = async () => (await prisma.disabilityInfo.findMany({ where: { personId: p.id }, orderBy: { disabilityTypeId: 'asc' } })).map((d) => d.disabilityTypeId);

  const b = await browser();
  try {
    await b.login(admin.id);
    const openEdit = async () => {
      await b.nav('/persons?q=' + encodeURIComponent('ทดสอบอีทูอี พิการ'));
      await b.waitFor(`[...document.querySelectorAll('tbody tr')].some(r => r.textContent.includes('ทดสอบอีทูอี พิการ'))`, 'แถว');
      await b.evaluate(`[...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes('ทดสอบอีทูอี พิการ')).querySelectorAll('td:last-child button')[1].click()`);
      await b.waitFor(`document.querySelector('dialog[open]') && [...document.querySelectorAll('dialog[open] span')].some(s => s.textContent === ${JSON.stringify(A.typeName)})`, 'ป้ายประเภทความพิการ');
    };
    // dropdown ประเภทความพิการ = select ตัวที่มี option "— เพิ่มประเภทความพิการ —"
    const disSelect = `[...document.querySelectorAll('dialog[open] select')].find(s => s.options[0]?.textContent.includes('ประเภทความพิการ'))`;
    const options = () => b.evaluate(`[...${disSelect}.options].slice(1).map(o => o.textContent)`);
    const chip = (name) => `[...document.querySelectorAll('dialog[open] span')].find(s => s.textContent === ${JSON.stringify(name)}).parentElement`;

    await openEdit();
    const opts = await options();
    eq('ตัวเลือกไม่มีประเภทที่มีอยู่แล้ว (A, B)', [opts.includes(A.typeName), opts.includes(Bt.typeName), opts.includes(C.typeName)], [false, false, true]);

    await b.evaluate(`${chip(A.typeName)}.querySelector('button').click()`); await sleep(200);
    eq('กดถังขยะ A → ขีดฆ่า + มีปุ่ม "คืน"', await b.evaluate(`[${chip(A.typeName)}.querySelector('span').className.includes('line-through'), ${chip(A.typeName)}.textContent.includes('คืน')]`), [true, true]);
    eq('ยังไม่ลบจริงในฐานข้อมูล', await typesOf(), [A.id, Bt.id]);
    eq('ตัวเลือกกลับมามี A ให้เลือกได้', (await options()).includes(A.typeName), true);
    await b.evaluate(`${chip(A.typeName)}.querySelector('button').click()`); await sleep(200);
    eq('กด "คืน" → กลับเป็นปกติ', await b.evaluate(`${chip(A.typeName)}.querySelector('span').className.includes('line-through')`), false);

    await b.evaluate(`${chip(A.typeName)}.querySelector('button').click()`); await sleep(100);
    await b.clickText('ยกเลิก', "document.querySelector('dialog[open]')"); await sleep(400);
    eq('ขีดฆ่าแล้วกดยกเลิกฟอร์ม → ข้อมูลครบเหมือนเดิม', await typesOf(), [A.id, Bt.id]);

    await openEdit();
    eq('เปิดฟอร์มใหม่ ไม่มีขีดฆ่าค้าง', await b.evaluate(`${chip(A.typeName)}.querySelector('span').className.includes('line-through')`), false);
    await b.evaluate(`${chip(A.typeName)}.querySelector('button').click()`); await sleep(100);
    await b.setValue(disSelect, String(C.id)); await sleep(100);
    await b.clickText('บันทึกข้อมูล', "document.querySelector('dialog[open]')");
    await b.waitFor(`!document.querySelector('dialog[open]')`, 'ฟอร์มปิด', 15000); await sleep(500);
    eq('ลบ A + เพิ่ม C แล้วบันทึก → เหลือ B, C', await typesOf(), [Bt.id, C.id].sort((x, y) => x - y));

    const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: admin.id }, SECRET) };
    const dup = await fetch(`${API}/persons/${p.id}/disability`, { method: 'POST', headers: H, body: JSON.stringify({ disabilityTypeId: C.id }) });
    eq('หลังบ้านกันเพิ่มซ้ำ (ยิง API ตรง)', [dup.status, (await dup.json()).error], [400, 'คนนี้มีประเภทความพิการนี้อยู่แล้ว']);

    console.log('── สคริปต์ล้างรายการซ้ำ');
    await prisma.disabilityInfo.create({ data: { personId: p.id, disabilityTypeId: C.id } });                                  // ซ้ำเปล่าๆ → ลบได้
    await prisma.disabilityInfo.create({ data: { personId: p.id, disabilityTypeId: Bt.id, disabilityLevel: 'ระดับ 3' } });      // ซ้ำแต่มีรายละเอียด → ต้องเก็บอันนี้ ลบอันเปล่า
    const run = (...a) => execFileSync('node', ['scripts/fix-duplicate-disability.cjs', ...a], { cwd: B, encoding: 'utf8' });
    const dry = run();
    eq('ดูอย่างเดียว: เจอซ้ำที่ลบได้ 2 รายการ', /ซ้ำที่ลบได้ 2/.test(dry), true);
    eq('ดูอย่างเดียว: ยังไม่ลบ', (await typesOf()).length, 4);
    run('--apply');
    const after = await prisma.disabilityInfo.findMany({ where: { personId: p.id } });
    eq('--apply: เหลือ B กับ C อย่างละ 1', after.map((d) => d.disabilityTypeId).sort((x, y) => x - y), [Bt.id, C.id].sort((x, y) => x - y));
    eq('--apply: B ที่เหลือคืออันที่มีรายละเอียด', after.find((d) => d.disabilityTypeId === Bt.id).disabilityLevel, 'ระดับ 3');
    eq('ไม่มี error ในหน้าเว็บ', b.errors, []);
  } catch (e) {
    console.log('FAIL  ทดสอบสะดุด:', e.message); await b.screenshot(shot('crash-6.png'));
    eq('ไม่สะดุด', e.message, '');
  } finally {
    await b.close();
    await prisma.person.delete({ where: { id: p.id } });
    await prisma.trainingBatch.delete({ where: { id: batch.id } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ label: { contains: 'ทดสอบอีทูอี' } }, { personId: p.id }] } });
    const f = summary();
    await prisma.$disconnect();
    process.exit(f ? 1 : 0);
  }
})().catch((e) => { console.error(e); process.exit(1); });
