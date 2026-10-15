// หน้าประวัติการใช้งาน: ช่องวันที่เป็น พ.ศ. (เดิมปฏิทินเบราว์เซอร์ mm/dd/yyyy ค.ศ.) — กรองช่วงวันที่ได้ถูก
// · นับรวมทั้งวันสุดท้าย · พิมพ์ปี ค.ศ. เตือนและไม่กรอง · ถึง < ตั้งแต่ เตือน · ล้างตัวกรองแล้วช่องว่างจริง
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');
const LABEL = 'ทดสอบช่วงวันที่ประวัติ';

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  // เวลาไทย: 10 มี.ค. 09:00 · 15 มี.ค. 23:30 (ต้องนับรวมเมื่อ "ถึง 15") · 1 เม.ย. 08:00
  await prisma.auditLog.createMany({ data: [
    ['2026-03-10T02:00:00Z'], ['2026-03-15T16:30:00Z'], ['2026-04-01T01:00:00Z'],
  ].map(([t]) => ({ userId: admin.id, userName: admin.name, action: 'UPDATE', entity: 'person', label: LABEL, createdAt: new Date(t) })) });
  const b = await browser();
  const rows = () => b.evaluate(`[...document.querySelectorAll('main tbody tr')].filter(r => r.innerText.includes(${JSON.stringify(LABEL)})).length`);
  const date = (label) => `document.querySelector('main input[aria-label="${label}วันที่ (พ.ศ.)"]')`;
  try {
    await b.login(admin.id);
    await b.nav('/audit');
    await b.waitFor(`document.querySelector('main input[placeholder^="ค้นหา"]')`, 'หน้าประวัติ');
    eq('ไม่มีช่องวันที่แบบปฏิทินฝรั่งแล้ว', await b.evaluate(`[document.querySelectorAll('main input[type=date]').length, !!${date('ตั้งแต่')}, ${date('ตั้งแต่')}.placeholder]`), [0, true, 'วว/ดด/ปปปป']);
    await b.setValue(`document.querySelector('main input[placeholder^="ค้นหา"]')`, LABEL); await sleep(900);
    eq('ค้นชื่อ → เห็น 3 รายการ', await rows(), 3);

    await b.setValue(date('ตั้งแต่'), '10032569'); await sleep(800);
    eq('พิมพ์ตัวเลข → ใส่ / ให้เอง + ยังเห็นครบ 3 (นับวันที่ 10 ด้วย)', [await b.evaluate(`${date('ตั้งแต่')}.value`), await rows()], ['10/03/2569', 3]);
    await b.setValue(date('ถึง'), '15032569'); await sleep(800);
    eq('ตั้งแต่ 10/03/2569 ถึง 15/03/2569 → 2 รายการ (นับรวม 23:30 ของวันที่ 15)', await rows(), 2);

    await b.setValue(date('ถึง'), '15032026'); await sleep(800);
    eq('เผลอพิมพ์ปี ค.ศ. → มีคำเตือนใต้ช่อง + ไม่เอาไปกรอง', [await b.evaluate(`!!${date('ถึง')}.closest('div').querySelector('span.text-red-500')`), await rows()], [true, 3]);
    await b.setValue(date('ถึง'), '01032569'); await sleep(800);
    eq('"ถึง" ก่อน "ตั้งแต่" → เตือนว่าทำไมไม่เจอ', [await b.evaluate(`document.querySelector('main').innerText.includes('อยู่ก่อน "ตั้งแต่วันที่"')`), await rows()], [true, 0]);
    await b.screenshot(shot('audit-date.png'));

    await b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.includes('ล้างตัวกรอง')).click(), true`); await sleep(800);
    eq('ล้างตัวกรอง → ช่องวันที่ว่างจริง', await b.evaluate(`[${date('ตั้งแต่')}.value, ${date('ถึง')}.value]`), ['', '']);

    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await b.nav('/audit'); await b.waitFor(date('ตั้งแต่'), 'ช่องวันที่มือถือ'); await sleep(400);
    eq('มือถือ: ไม่ล้นจอ', await b.evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    await b.screenshot(shot('m-audit-date.png'));
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-audit-date.png')); eq('สคริปต์รันจบ', false, true); }
  await prisma.auditLog.deleteMany({ where: { label: LABEL } });
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
