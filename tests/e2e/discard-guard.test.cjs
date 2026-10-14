// UX ข้อ 2: ฟอร์มที่แก้แล้วยังไม่บันทึก กดพื้นที่มืด / Esc / ยกเลิก / ✕ → ถามก่อนปิด · ไม่ได้แก้ → ปิดทันที
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');
const DLG = "document.querySelector('dialog[open]')";

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const person = await prisma.person.findFirst({ where: { thaiId: { startsWith: '88888888' }, trainingRecords: { some: {} } } });
  const b = await browser();
  const bar = (scope = DLG) => b.evaluate(`!!${scope} && ${scope}.textContent.includes('ยังไม่ได้บันทึก')`);
  const isOpen = () => b.evaluate(`!!${DLG}`);
  const backdrop = () => b.evaluate(`${DLG}.querySelector('.modal-backdrop button').click(), true`);
  const esc = async () => {
    await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(250);
  };
  // พิมพ์ผ่านคีย์บอร์ดจริง — Chrome ยอมให้กัน Esc ได้ก็ต่อเมื่อผู้ใช้กดแป้น/คลิกจริงมาก่อน (ใส่ค่าด้วย JS ไม่นับ)
  const typeReal = async (selectorExpr, text) => {
    await b.evaluate(`(${selectorExpr}).focus(), true`);
    for (const ch of text) {
      await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch });
      await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
    }
    await sleep(150);
  };
  const input = (label) => `[...${DLG}.querySelectorAll('label')].find(l => l.textContent.trim().startsWith(${JSON.stringify(label)})).parentElement.querySelector('input,textarea')`;
  try {
    await b.login(admin.id);

    console.log('── ฟอร์มคนพิการ (เพิ่ม)');
    await b.nav('/persons');
    await b.waitFor(`[...document.querySelectorAll('button')].some(x => x.textContent.includes('เพิ่มคนพิการ'))`, 'ปุ่มเพิ่ม');
    const openAdd = async () => {
      await b.evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.includes('เพิ่มคนพิการ') && x.offsetParent).click(), true`);
      await b.waitFor(DLG, 'ฟอร์มเปิด'); await sleep(200);
    };
    await openAdd();
    await b.clickText('ยกเลิก', DLG); await sleep(250);
    eq('ไม่ได้แก้อะไร กดยกเลิก → ปิดทันที', await isOpen(), false);

    await openAdd();
    await backdrop(); await sleep(250);
    eq('ไม่ได้แก้อะไร กดพื้นที่มืด → ปิดทันที', await isOpen(), false);

    await openAdd();
    await b.setValue(input('ชื่อ-นามสกุล'), 'ทดสอบ กันหาย'); await sleep(150);
    await backdrop(); await sleep(250);
    eq('พิมพ์ชื่อแล้วกดพื้นที่มืด → ไม่ปิด + ขึ้นแถบถาม', [await isOpen(), await bar()], [true, true]);
    await b.screenshot(shot('ux2-person-bar.png'));
    await b.clickText('กลับไปแก้ต่อ', DLG); await sleep(200);
    eq('กดกลับไปแก้ต่อ → แถบหาย ชื่อยังอยู่', [await bar(), await b.evaluate(`${input('ชื่อ-นามสกุล')}.value`)], [false, 'ทดสอบ กันหาย']);
    await typeReal(input('ชื่อ-นามสกุล'), 'x');
    await esc();
    eq('กด Esc → ไม่ปิด + ขึ้นแถบถาม', [await isOpen(), await bar()], [true, true]);
    await b.clickText('กลับไปแก้ต่อ', DLG); await sleep(150);
    await b.clickText('ยกเลิก', DLG); await sleep(250);
    eq('กดยกเลิก → ขึ้นแถบถาม', await bar(), true);
    await b.clickText('ปิดโดยไม่บันทึก', DLG); await sleep(250);
    eq('กดปิดโดยไม่บันทึก → ปิด', await isOpen(), false);
    await openAdd();
    eq('เปิดใหม่ → ฟอร์มว่าง ไม่มีแถบค้าง', [await b.evaluate(`${input('ชื่อ-นามสกุล')}.value`), await bar()], ['', false]);
    await b.setValue(input('ชื่อ-นามสกุล'), 'abc'); await sleep(100);
    await b.setValue(input('ชื่อ-นามสกุล'), ''); await sleep(100);
    await backdrop(); await sleep(250);
    eq('พิมพ์แล้วลบออกจนว่าง → ถือว่าไม่ได้แก้ ปิดทันที', await isOpen(), false);
    await openAdd();
    await b.evaluate(`[...${DLG}.querySelectorAll('button')].find(x => x.textContent.trim() === 'หญิง' || x.textContent.trim() === 'นาง')?.click(), true`);
    await b.setValue(`[...${DLG}.querySelectorAll('select')].find(s => [...s.options].some(o => o.textContent === 'นางสาว'))`, 'นางสาว'); await sleep(100);
    await backdrop(); await sleep(250);
    eq('เปลี่ยนคำนำหน้าอย่างเดียว → ถามด้วย', await bar(), true);
    await b.clickText('ปิดโดยไม่บันทึก', DLG); await sleep(250);

    console.log('── ฟอร์มคนพิการ (แก้ไข คนที่มีข้อมูลครบ)');
    await b.nav('/persons?q=' + encodeURIComponent(person.fullName.split(' ')[1]));
    await b.waitFor(`[...document.querySelectorAll('tbody tr')].some(r => r.textContent.includes(${JSON.stringify(person.fullName.split(' ')[1])}))`, 'แถว');
    const openEdit = async () => {
      await b.evaluate(`[...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes(${JSON.stringify(person.fullName.split(' ')[1])})).querySelectorAll('td:last-child button')[1].click(), true`);
      await b.waitFor(`${DLG} && ${input('ชื่อ-นามสกุล')}.value`, 'ฟอร์มแก้ไข'); await sleep(800);   // รอรูปโหลดด้วย
    };
    await openEdit();
    await b.clickText('ยกเลิก', DLG); await sleep(250);
    eq('เปิดแก้ไขแล้วไม่แตะ กดยกเลิก → ปิดทันที (ไม่ถามมั่ว)', await isOpen(), false);
    await openEdit();
    await esc();
    eq('เปิดแก้ไขแล้วไม่แตะ กด Esc → ปิดทันที', await isOpen(), false);
    await openEdit();
    await typeReal(input('ชื่อเล่น'), 'abc');
    await esc();
    eq('แก้ชื่อเล่น กด Esc → ถาม', [await isOpen(), await bar()], [true, true]);
    await b.clickText('ปิดโดยไม่บันทึก', DLG); await sleep(300);
    eq('ปิดโดยไม่บันทึก → ฐานข้อมูลไม่เปลี่ยน', (await prisma.person.findUnique({ where: { id: person.id } })).nickname, person.nickname);
    const dis = await prisma.disabilityInfo.findFirst({ where: { personId: person.id }, include: { disabilityType: true } });
    await openEdit();
    await b.evaluate(`[...${DLG}.querySelectorAll('span')].find(x => x.textContent === ${JSON.stringify(dis.disabilityType.typeName)}).parentElement.querySelector('button').click(), true`); await sleep(150);
    await b.clickText('ยกเลิก', DLG); await sleep(250);
    eq('กดถังขยะประเภทความพิการอย่างเดียว กดยกเลิก → ถาม', await bar(), true);
    await b.clickText('ปิดโดยไม่บันทึก', DLG); await sleep(250);
    eq('ปิดโดยไม่บันทึก → ความพิการยังอยู่', !!(await prisma.disabilityInfo.findUnique({ where: { id: dis.id } })), true);

    console.log('── ฟอร์มย่อยในหน้ารายละเอียด');
    await b.nav('/persons/' + person.id);
    await b.waitFor(`[...document.querySelectorAll('[role=tab]')].some(x => x.textContent.trim() === 'การอบรม')`, 'หน้ารายละเอียด');
    await b.evaluate(`[...document.querySelectorAll('[role=tab]')].find(x => x.textContent.trim() === 'การอบรม').click(), true`); await sleep(400);
    const editBtn = `[...document.querySelectorAll('main button[title]')].find(x => x.title.includes('แก้ไข'))`;
    await b.waitFor(editBtn, 'ปุ่มแก้ไขรายการอบรม');
    await b.evaluate(`${editBtn}.click(), true`); await b.waitFor(DLG, 'หน้าต่างแก้ไข'); await sleep(200);
    await b.clickText('ยกเลิก', DLG); await sleep(250);
    eq('แก้ไขรายการอบรมไม่แตะ กดยกเลิก → ปิดทันที', await isOpen(), false);
    await b.evaluate(`${editBtn}.click(), true`); await b.waitFor(DLG, 'หน้าต่างแก้ไข'); await sleep(200);
    await b.setValue(`${DLG}.querySelector('input')`, 'ชื่อหลักสูตรแก้'); await sleep(100);
    await backdrop(); await sleep(250);
    eq('แก้แล้วกดพื้นที่มืด → ถาม', [await isOpen(), await bar()], [true, true]);
    await b.clickText('ปิดโดยไม่บันทึก', DLG); await sleep(250);
    eq('ปิดโดยไม่บันทึก → ปิด', await isOpen(), false);
    await b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.trim().startsWith('+') || x.textContent.trim() === 'เพิ่ม' || x.textContent.includes('เพิ่ม') && x.closest('div')?.textContent.includes('ประวัติการอบรม') && x.offsetParent).click(), true`); await b.waitFor(DLG, 'หน้าต่างเพิ่ม'); await sleep(200);
    await b.setValue(`${DLG}.querySelector('input')`, 'x'); await sleep(80);
    await b.setValue(`${DLG}.querySelector('input')`, ''); await sleep(80);
    await b.clickText('ยกเลิก', DLG); await sleep(250);
    eq('เพิ่มใหม่ พิมพ์แล้วลบจนว่าง กดยกเลิก → ปิดทันที', await isOpen(), false);

    console.log('── สถานประกอบการ');
    await b.nav('/organizations');
    await b.waitFor(`document.querySelector('tbody td:last-child button')`, 'ตาราง');
    await b.evaluate(`document.querySelector('tbody td:last-child button').click(), true`); await b.waitFor(DLG, 'ฟอร์ม'); await sleep(200);
    await backdrop(); await sleep(250);
    eq('แก้ไของค์กรไม่แตะ กดพื้นที่มืด → ปิดทันที', await isOpen(), false);
    await b.evaluate(`document.querySelector('tbody td:last-child button').click(), true`); await b.waitFor(DLG, 'ฟอร์ม'); await sleep(200);
    await b.setValue(input('ผู้ติดต่อ'), 'คนใหม่'); await sleep(100);
    await backdrop(); await sleep(250);
    eq('แก้ผู้ติดต่อ กดพื้นที่มืด → ถาม', [await isOpen(), await bar()], [true, true]);
    await b.clickText('ปิดโดยไม่บันทึก', DLG); await sleep(250);

    console.log('── จัดการผู้ใช้');
    await b.nav('/users');
    await b.waitFor(`[...document.querySelectorAll('main button')].some(x => x.querySelector('svg') && x.title !== undefined && x.offsetParent && x.className.includes('amber'))`, 'ปุ่มแก้ไขผู้ใช้').catch(() => {});
    await b.waitFor(`[...document.querySelectorAll('button')].some(x => x.textContent.includes('เพิ่มผู้ใช้'))`, 'ปุ่มเพิ่มผู้ใช้');
    await b.evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.includes('เพิ่มผู้ใช้') && x.offsetParent).click(), true`); await b.waitFor(DLG, 'ฟอร์ม'); await sleep(200);
    await b.clickText('✕', DLG); await sleep(250);
    eq('เพิ่มผู้ใช้ไม่แตะ กด ✕ → ปิดทันที', await isOpen(), false);
    await b.evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.includes('เพิ่มผู้ใช้') && x.offsetParent).click(), true`); await b.waitFor(DLG, 'ฟอร์ม'); await sleep(200);
    await b.setValue(`${DLG}.querySelector('input[type=email]')`, 'new@x.com'); await sleep(100);
    await b.clickText('✕', DLG); await sleep(250);
    eq('พิมพ์อีเมล กด ✕ → ถาม', [await isOpen(), await bar()], [true, true]);
    await b.clickText('กลับไปแก้ต่อ', DLG); await sleep(150);
    await b.clickText('ยกเลิก', DLG); await sleep(250);
    eq('กดยกเลิก → ถาม', await bar(), true);
    await b.clickText('ปิดโดยไม่บันทึก', DLG); await sleep(250);
    eq('ปิดโดยไม่บันทึก → ปิด', await isOpen(), false);

    console.log('── รุ่นอบรม');
    await b.nav('/batches');
    const editBatch = `[...document.querySelectorAll('main button')].find(x => x.querySelector('svg.lucide-pencil') && x.offsetParent)`;
    await b.waitFor(editBatch, 'ปุ่มแก้ไขรุ่น');
    const MODAL = `[...document.querySelectorAll('div.fixed.inset-0')].find(d => d.textContent.includes('แก้ไขรุ่น') || d.textContent.includes('เพิ่มรุ่นใหม่'))`;
    await b.evaluate(`${editBatch}.click(), true`); await b.waitFor(MODAL, 'ฟอร์มรุ่น'); await sleep(200);
    await b.clickText('ยกเลิก', MODAL); await sleep(250);
    eq('แก้ไขรุ่นไม่แตะ กดยกเลิก → ปิดทันที (เลข 813 กับ "813" ไม่นับว่าแก้)', await b.evaluate(`!!${MODAL}`), false);
    await b.evaluate(`${editBatch}.click(), true`); await b.waitFor(MODAL, 'ฟอร์มรุ่น'); await sleep(200);
    await b.setValue(`${MODAL}.querySelector('input[type=number]')`, '814'); await sleep(80);
    await b.setValue(`${MODAL}.querySelector('input[type=number]')`, '813'); await sleep(80);
    await b.clickText('ยกเลิก', MODAL); await sleep(250);
    eq('พิมพ์เลขรุ่นแล้วแก้กลับเป็นเดิม → ปิดทันที', await b.evaluate(`!!${MODAL}`), false);
    await b.evaluate(`${editBatch}.click(), true`); await b.waitFor(MODAL, 'ฟอร์มรุ่น'); await sleep(200);
    await b.setValue(`${MODAL}.querySelector('input:not([type=number])')`, 'ชื่อใหม่'); await sleep(100);
    await b.evaluate(`${MODAL}.querySelector('button').click(), true`); await sleep(250);
    eq('แก้ชื่อโครงการ กด X → ถาม', await bar(MODAL), true);
    await b.clickText('ปิดโดยไม่บันทึก', MODAL); await sleep(250);
    eq('ปิดโดยไม่บันทึก → ปิด', await b.evaluate(`!!${MODAL}`), false);

    console.log('── มือถือ');
    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await b.nav('/persons');
    await b.waitFor(`[...document.querySelectorAll('button')].some(x => x.textContent.includes('เพิ่มคนพิการ') && x.offsetParent)`, 'ปุ่มเพิ่ม');
    await openAdd();
    await b.setValue(input('ชื่อ-นามสกุล'), 'ทดสอบ มือถือ'); await sleep(100);
    await b.clickText('ยกเลิก', DLG); await sleep(300);
    eq('มือถือ: ขึ้นแถบถาม', await bar(), true);
    await b.evaluate(`${DLG}.querySelector('.modal-box').scrollTop = 99999, true`); await sleep(200);
    await b.screenshot(shot('ux2-mobile-bar.png'));
    await b.clickText('ปิดโดยไม่บันทึก', DLG); await sleep(200);

    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); eq('สคริปต์รันจบ', false, true); }
  await b.close();
  process.exit(summary() ? 1 : 0);
})();
