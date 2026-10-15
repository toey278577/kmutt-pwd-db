// หน้ารายละเอียด: ปุ่มแก้ไข (ดินสอ) ที่การ์ดความพิการ + ป้ายทักษะ → หน้าต่างแก้ไขพร้อมข้อมูลเดิม → บันทึกแล้วเปลี่ยนจริง
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');
const DLG = "document.querySelector('dialog[open]')";

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const viewer = await prisma.user.findFirst({ where: { role: 'VIEWER', isActive: true } });
  const types = await prisma.disabilityType.findMany({ orderBy: { id: 'asc' } });
  const p = await prisma.person.create({ data: { fullName: 'นาย ทดสอบแก้ ในหน้าเว็บ', gender: 'MALE', thaiId: '9999999940011' } });
  const dis = await prisma.disabilityInfo.create({ data: { personId: p.id, disabilityTypeId: types[0].id, disabilityLevel: 'ระดับ 2' } });
  await prisma.disabilityInfo.create({ data: { personId: p.id, disabilityTypeId: types[1].id } });
  const sk = await prisma.skill.create({ data: { personId: p.id, skillName: 'Excel', skillLevel: 'BEGINNER' } });
  const b = await browser();
  const card = (typeName) => `[...document.querySelectorAll('main span')].find(s => s.textContent.trim() === ${JSON.stringify(typeName)}).closest('div.relative')`;
  const field = (label) => `[...${DLG}.querySelectorAll('label')].find(l => l.textContent.trim().startsWith(${JSON.stringify(label)})).parentElement.querySelector('input,select,textarea')`;
  const open = async () => { await b.nav('/persons/' + p.id); await b.waitFor(`document.querySelector('[role=tablist]') && document.querySelector('main').textContent.includes(${JSON.stringify(types[0].typeName)})`, 'หน้ารายละเอียด'); await sleep(300); };
  try {
    await b.login(admin.id);
    await open();
    console.log('── ข้อมูลความพิการ');
    await b.evaluate(`${card(types[0].typeName)}.querySelector('button[title="แก้ไข"]').click(), true`);
    await b.waitFor(DLG, 'หน้าต่างแก้ไข'); await sleep(200);
    eq('หัวข้อ "แก้ไขข้อมูลความพิการ" + ข้อมูลเดิมครบ', [await b.evaluate(`${DLG}.querySelector('h3').textContent`), await b.evaluate(`${field('ประเภทความพิการ')}.value`), await b.evaluate(`${field('ระดับความพิการ')}.value`)], ['แก้ไขข้อมูลความพิการ', String(types[0].id), 'ระดับ 2']);
    const opts = await b.evaluate(`[...${field('ประเภทความพิการ')}.options].map(o => o.textContent)`);
    eq('ตัวเลือก: มีประเภทของตัวเอง แต่ไม่มีอีกประเภทที่คนนี้มีอยู่แล้ว', [opts.includes(types[0].typeName), opts.includes(types[1].typeName), opts.includes(types[2].typeName)], [true, false, true]);
    await b.clickText('ยกเลิก', DLG); await sleep(250);
    eq('ไม่แก้อะไร กดยกเลิก → ปิดทันที', await b.evaluate(`!!${DLG}`), false);
    await b.evaluate(`${card(types[0].typeName)}.querySelector('button[title="แก้ไข"]').click(), true`);
    await b.waitFor(DLG, 'หน้าต่างแก้ไข'); await sleep(200);
    await b.setValue(field('ระดับความพิการ'), 'ระดับ 3');
    await b.setValue(field('อุปกรณ์ช่วยเหลือ'), 'ไม้เท้าขาว');
    await b.clickText('บันทึก', DLG);
    await b.waitFor(`!${DLG}`, 'หน้าต่างปิด', 10000); await sleep(600);
    const d2 = await prisma.disabilityInfo.findUnique({ where: { id: dis.id } });
    eq('บันทึก → ฐานข้อมูลเปลี่ยน (ไม่ได้เพิ่มใหม่)', [d2.disabilityLevel, d2.assistiveDevice, await prisma.disabilityInfo.count({ where: { personId: p.id } })], ['ระดับ 3', 'ไม้เท้าขาว', 2]);
    eq('การ์ดโชว์ค่าใหม่', await b.evaluate(`${card(types[0].typeName)}.innerText.includes('ระดับ 3') && ${card(types[0].typeName)}.innerText.includes('ไม้เท้าขาว')`), true);
    await b.screenshot(shot('edit-disability.png'));

    console.log('── ทักษะ');
    await b.evaluate(`[...document.querySelectorAll('[role=tab]')].find(t => t.textContent.trim() === 'ทักษะ').click(), true`); await sleep(400);
    const chip = `[...document.querySelectorAll('main span')].find(s => s.textContent.trim() === 'Excel')?.parentElement`;
    await b.waitFor(chip, 'ป้ายทักษะ');
    eq('ป้ายทักษะมีปุ่มแก้ + ลบ ขนาดกดง่าย (≥28px)', await b.evaluate(`[...${chip}.querySelectorAll('button')].map(x => [x.title, Math.round(x.getBoundingClientRect().width) >= 28])`), [['แก้ไข', true], ['ลบ', true]]);
    await b.evaluate(`${chip}.querySelector('button[title="แก้ไข"]').click(), true`);
    await b.waitFor(DLG, 'หน้าต่างแก้ไขทักษะ'); await sleep(200);
    eq('หัวข้อ "แก้ไขทักษะ" + ข้อมูลเดิม', [await b.evaluate(`${DLG}.querySelector('h3').textContent`), await b.evaluate(`${field('ชื่อทักษะ')}.value`), await b.evaluate(`${field('ระดับความสามารถ')}.value`)], ['แก้ไขทักษะ', 'Excel', 'BEGINNER']);
    await b.setValue(field('ชื่อทักษะ'), 'Excel ขั้นสูง');
    await b.setValue(field('ระดับความสามารถ'), 'ADVANCED');
    await b.clickText('บันทึก', DLG);
    await b.waitFor(`!${DLG}`, 'หน้าต่างปิด', 10000); await sleep(600);
    eq('บันทึก → ทักษะเดิมเปลี่ยน ไม่ได้เพิ่มใหม่', [(await prisma.skill.findUnique({ where: { id: sk.id } })).skillName, (await prisma.skill.findUnique({ where: { id: sk.id } })).skillLevel, await prisma.skill.count({ where: { personId: p.id } })], ['Excel ขั้นสูง', 'ADVANCED', 1]);
    eq('ป้ายโชว์ค่าใหม่', await b.evaluate(`document.querySelector('main').innerText.includes('Excel ขั้นสูง') && document.querySelector('main').innerText.includes('เชี่ยวชาญ')`), true);
    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await open();
    await b.evaluate(`[...document.querySelectorAll('[role=tab]')].find(t => t.textContent.trim() === 'ทักษะ').click(), true`); await sleep(400);
    await b.screenshot(shot('m-edit-skill.png'));

    console.log('── ผู้ดูข้อมูล');
    await b.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
    await b.login(viewer.id);
    await open();
    eq('VIEWER: การ์ดความพิการไม่มีปุ่มแก้/ลบ', await b.evaluate(`!${card(types[0].typeName)}.querySelector('button')`), true);
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-edit-skill.png')); eq('สคริปต์รันจบ', false, true); }
  await prisma.person.deleteMany({ where: { id: p.id } });
  await prisma.auditLog.deleteMany({ where: { personId: p.id } });
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
