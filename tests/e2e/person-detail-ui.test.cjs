// UX ข้อ 4: หน้ารายละเอียด — ปุ่มเพิ่ม/เปลี่ยน/ลบรูป, ป้ายเสียชีวิต, แท็บแถวเดียวบนมือถือ, ปุ่ม "+ เพิ่ม", dark mode
const path = require('path');
const { prisma, browser, eq, summary, sleep, fixturePng } = require('../lib.cjs');
const OUT = require('../lib.cjs').OUT + '/shots';

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const viewer = await prisma.user.findFirst({ where: { role: 'VIEWER', isActive: true } });
  const demo = await prisma.person.findMany({ where: { thaiId: { startsWith: '88888888' } }, orderBy: { id: 'asc' } });
  const alive = demo[0], dead = demo.find((p) => p.lifeStatus === 'DECEASED');
  await prisma.personPhoto.deleteMany({ where: { personId: alive.id } });
  const b = await browser();
  const header = `document.querySelector('main .rounded-2xl')`;
  const btn = (t) => `[...document.querySelectorAll('main button')].find(x => x.textContent.trim() === ${JSON.stringify(t)} && x.offsetParent)`;
  const open = async (id) => { await b.nav('/persons/' + id); await b.waitFor(`document.querySelector('main [role=tablist]')`, 'หน้ารายละเอียด'); await sleep(500); };
  try {
    await b.login(admin.id);
    await open(alive.id);
    eq('ไม่มีคำว่า hover ที่รูป', await b.evaluate(`document.body.textContent.includes('hover ที่รูป')`), false);
    eq('คนที่มีชีวิต ไม่มีป้าย "มีชีวิต" รกหัว', await b.evaluate(`${header}.textContent.includes('มีชีวิต')`), false);
    eq('มีชื่อเล่นต่อท้ายชื่อ', await b.evaluate(`${header}.querySelector('h1').textContent`), `${alive.fullName} (${alive.nickname})`);
    eq('ยังไม่มีรูป → ปุ่ม "เพิ่มรูป" ไม่มีปุ่มลบรูป', [await b.evaluate(`!!${btn('เพิ่มรูป')}`), await b.evaluate(`!!${btn('ลบรูป')}`)], [true, false]);
    await b.screenshot(path.join(OUT, 'ux4-d-nophoto.png'));

    // เลือกรูปผ่าน input (แบบที่ปุ่ม "เพิ่มรูป" เปิดให้)
    eq('ปุ่ม "เพิ่มรูป" สั่งเปิดช่องเลือกไฟล์', await b.evaluate(`(() => { const i = document.querySelector('main input[type=file]'); let hit = false; i.addEventListener('click', (e) => { hit = true; e.preventDefault(); }, { once: true }); ${btn('เพิ่มรูป')}.click(); return hit; })()`), true);
    const { result: { root } } = await b.send('DOM.getDocument', { depth: -1 });
    const { result: { nodeId } } = await b.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'main input[type=file]' });
    await b.send('DOM.setFileInputFiles', { nodeId, files: [fixturePng()] });
    await b.waitFor(btn('ลบรูป'), 'ปุ่มลบรูปหลังอัปโหลด', 15000); await sleep(400);
    eq('อัปโหลดแล้ว → ปุ่มเป็น "เปลี่ยนรูป" + "ลบรูป" และรูปขึ้น', [await b.evaluate(`!!${btn('เปลี่ยนรูป')}`), await b.evaluate(`!!${header}.querySelector('img')`)], [true, true]);
    eq('ฐานข้อมูลมีรูป 1 รูป', await prisma.personPhoto.count({ where: { personId: alive.id } }), 1);
    await b.screenshot(path.join(OUT, 'ux4-d-photo.png'));
    await b.evaluate(`${btn('ลบรูป')}.click(), true`);
    await b.waitFor(`[...document.querySelectorAll('button')].some(x => x.textContent.trim() === 'ยืนยัน')`, 'กล่องยืนยัน');
    await b.evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'ยืนยัน').click(), true`);
    await b.waitFor(btn('เพิ่มรูป'), 'กลับเป็นเพิ่มรูป'); await sleep(300);
    eq('ลบรูป → กลับเป็น "เพิ่มรูป" + ฐานข้อมูลไม่มีรูป', [await b.evaluate(`!!${btn('ลบรูป')}`), await prisma.personPhoto.count({ where: { personId: alive.id } })], [false, 0]);

    eq('แท็บที่เลือกมีขีดส้มด้านล่าง', await b.evaluate(`getComputedStyle([...document.querySelectorAll('[role=tab]')].find(t => t.getAttribute('aria-selected') === 'true')).borderBottomColor !== getComputedStyle([...document.querySelectorAll('[role=tab]')].find(t => t.getAttribute('aria-selected') === 'false')).borderBottomColor`), true);
    eq('ปุ่ม "+ เพิ่ม" ไม่ใช่ปุ่ม DaisyUI แบบเดิม', await b.evaluate(`!document.querySelector('main .btn-outline')`), true);

    await open(dead.id);
    eq('คนที่เสียชีวิต มีป้าย "เสียชีวิต"', await b.evaluate(`${header}.textContent.includes('เสียชีวิต')`), true);

    console.log('── มือถือ');
    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await open(alive.id);
    const tabs = `[...document.querySelectorAll('[role=tab]')]`;
    eq('แท็บทั้ง 7 อยู่แถวเดียว', await b.evaluate(`new Set(${tabs}.map(t => Math.round(t.getBoundingClientRect().top))).size`), 1);
    eq('แถบแท็บปัดได้ ไม่ล้นจอ', await b.evaluate(`(() => { const l = document.querySelector('[role=tablist]'); return [l.scrollWidth > l.clientWidth, document.documentElement.scrollWidth <= innerWidth]; })()`), [true, true]);
    await b.screenshot(path.join(OUT, 'ux4-m-top.png'));
    await b.evaluate(`${tabs}[6].click(), true`); await sleep(700);
    eq('กดแท็บสุดท้าย → เลื่อนมาให้เห็น', await b.evaluate(`(() => { const r = ${tabs}[6].getBoundingClientRect(); return r.right <= innerWidth + 1 && document.querySelector('[role=tablist]').scrollLeft > 0; })()`), true);
    await b.screenshot(path.join(OUT, 'ux4-m-lasttab.png'));
    await b.evaluate(`${tabs}[1].click(), true`); await sleep(500);
    await b.screenshot(path.join(OUT, 'ux4-m-training.png'));

    console.log('── dark mode');
    await b.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
    await open(alive.id);
    await b.evaluate(`document.documentElement.classList.add('dark'), true`); await sleep(400);
    await b.screenshot(path.join(OUT, 'ux4-dark.png'));
    await b.evaluate(`document.documentElement.classList.remove('dark'), true`);

    console.log('── ผู้ดูข้อมูล');
    await b.login(viewer.id);
    await open(alive.id);
    eq('VIEWER ไม่เห็นปุ่มรูป / ปุ่มเพิ่ม', await b.evaluate(`[!!${btn('เพิ่มรูป')}, [...document.querySelectorAll('main button')].some(x => x.textContent.trim() === 'เพิ่ม')]`), [false, false]);
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); eq('สคริปต์รันจบ', false, true); }
  await b.close();
  process.exit(summary() ? 1 : 0);
})();
