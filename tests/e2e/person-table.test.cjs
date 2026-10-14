// UX ข้อ 5: ตารางรายชื่อ — คอลัมน์รุ่น + งานล่าสุด แทน "สถานะ", ป้ายเสียชีวิตข้างชื่อ
const path = require('path');
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');
(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const demo = await prisma.person.findMany({ where: { thaiId: { startsWith: '88888888' } }, orderBy: { id: 'asc' } });
  const dead = demo.find((p) => p.lifeStatus === 'DECEASED');
  const b = await browser();
  try {
    await b.login(admin.id);
    await b.nav('/persons');
    await b.waitFor(`document.querySelectorAll('tbody tr').length > 3`, 'ตาราง'); await sleep(500);
    eq('หัวตาราง', await b.evaluate(`[...document.querySelectorAll('thead th')].map(t => t.textContent)`), ['#', 'ชื่อ-นามสกุล', 'เลขบัตร', 'เพศ', 'จังหวัด', 'การศึกษา', 'รุ่น', 'งานล่าสุด', 'จัดการ']);
    eq('ไม่มีป้าย "มีชีวิต" ในตารางแล้ว', await b.evaluate(`document.querySelector('tbody').textContent.includes('มีชีวิต')`), false);
    const rowOf = (name) => `[...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes(${JSON.stringify(name)}))`;
    eq('คนแรก: รุ่น + มีงานทำ', await b.evaluate(`[...${rowOf(demo[0].fullName)}.children].slice(6, 8).map(td => td.textContent.trim())`), ['813/2569', 'มีงานทำ']);
    eq('คนเสียชีวิต: ป้ายข้างชื่อ', await b.evaluate(`${rowOf(dead.fullName)}.children[1].textContent.includes('เสียชีวิต')`), true);
    eq('ทุกแถวมี 9 ช่อง', await b.evaluate(`[...document.querySelectorAll('tbody tr')].every(r => r.children.length === 9)`), true);
    eq('จอ 1400: ตารางพอดี ไม่ต้องเลื่อน', await b.evaluate(`(() => { const c = document.querySelector('table').parentElement; return c.scrollWidth <= c.clientWidth; })()`), true);
    await b.screenshot(shot('ux5-d-persons.png'));
    eq('ชื่ออยู่บรรทัดเดียวทุกแถว', await b.evaluate(`[...document.querySelectorAll('tbody tr td:nth-child(2) p:first-child')].every(p => p.getBoundingClientRect().height < 30)`), true);
    await b.send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 800, deviceScaleFactor: 1, mobile: false });
    await sleep(500);
    eq('จอ 1100: หน้าไม่ล้นแนวนอน (ตารางเลื่อนในกรอบเอง)', await b.evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
    eq('จอ 1100: ปุ่มจัดการยังอยู่ในกรอบที่มองเห็น', await b.evaluate(`(() => { const c = document.querySelector('table').parentElement.getBoundingClientRect(); const r = document.querySelector('tbody tr td:last-child').getBoundingClientRect(); return r.right <= c.right + 1 && r.left >= c.left; })()`), true);
    await b.screenshot(shot('ux5-d1100-persons.png'));
    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await b.nav('/persons');
    await b.waitFor(`document.querySelectorAll('main div.divide-y > div').length > 3`, 'การ์ด'); await sleep(500);
    eq('มือถือ: การ์ดคนแรกมีป้ายงานล่าสุด', await b.evaluate(`[...document.querySelectorAll('main div.divide-y > div')].find(d => d.textContent.includes(${JSON.stringify(demo[0].fullName)})).textContent.includes('มีงานทำ')`), true);
    await b.screenshot(shot('ux5-m-persons.png'));
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); eq('สคริปต์รันจบ', false, true); }
  await b.close(); process.exit(summary() ? 1 : 0);
})();
