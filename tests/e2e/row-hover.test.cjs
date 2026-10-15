// รายชื่อคนพิการ: เอาเมาส์ชี้แถวแล้วต้องรู้ว่ากดได้ (พี่เต้ย 15 ต.ค. 69 — เดิม hover จางจนมองไม่เห็น)
// พื้นส้มอ่อนทั้งแถว (รวมช่องปุ่มที่ติดขอบขวา) + แถบส้มซ้าย + ชื่อเป็นสีส้ม + เคอร์เซอร์มือ · โหมดมืดก็ต้องเห็น
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');
const ROW = (i) => `document.querySelectorAll('tbody tr.row-link')[${i}]`;
const look = (i) => `(() => { const r = ${ROW(i)}, td = [...r.children], cs = (e) => getComputedStyle(e);
  return { bg: [...new Set(td.map(c => cs(c).backgroundColor))], bar: cs(td[0]).boxShadow.includes('inset'),
           name: cs(r.querySelector('.row-link-name')).color, cursor: cs(td[4]).cursor }; })()`;

(async () => {
  const staff = await prisma.user.findFirst({ where: { role: 'STAFF', isActive: true } });
  const b = await browser();
  const mouseTo = async (i) => {
    const [x, y] = await b.evaluate(`(() => { const c = ${ROW(i)}.children[4].getBoundingClientRect(); return [c.x + c.width / 2, c.y + c.height / 2]; })()`);
    await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await sleep(400);
  };
  const mouseAway = async () => { await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 }); await sleep(400); };
  try {
    await b.login(staff.id);
    await b.nav('/persons');
    await b.waitFor(`document.querySelectorAll('tbody tr.row-link').length >= 3`, 'ตารางรายชื่อ'); await sleep(300);
    await mouseAway();
    const before = await b.evaluate(look(1));
    eq('ยังไม่ชี้: แถวไม่มีพื้นส้ม/แถบส้ม', [before.bg.includes('rgb(255, 247, 237)'), before.bar], [false, false]);

    await mouseTo(1);
    const on = await b.evaluate(look(1));
    eq('ชี้แถว: พื้นส้มอ่อนทั้งแถว (รวมช่องปุ่มขวาสุด)', on.bg, ['rgb(255, 247, 237)']);
    eq('ชี้แถว: แถบส้มซ้าย + ชื่อสีส้ม + เคอร์เซอร์มือ', [on.bar, on.name, on.cursor], [true, 'rgb(194, 65, 12)', 'pointer']);
    eq('แถวอื่นไม่ติดสีไปด้วย', (await b.evaluate(look(0))).bar, false);
    await b.screenshot(shot('row-hover.png'));

    await b.evaluate(`document.documentElement.classList.add('dark'); true`);
    await mouseAway(); await mouseTo(1);
    const dark = await b.evaluate(look(1));
    eq('โหมดมืด: ชี้แล้วพื้นเปลี่ยน + ชื่อส้มสว่าง + แถบส้ม', [dark.bg, dark.name, dark.bar], [['rgb(51, 48, 44)'], 'rgb(251, 146, 60)', true]);
    await b.screenshot(shot('row-hover-dark.png'));
    await b.evaluate(`document.documentElement.classList.remove('dark'); true`);

    const id = await b.evaluate(`${ROW(1)}.querySelector('.row-link-name').textContent`);
    await b.evaluate(`${ROW(1)}.children[4].click(), true`);
    await b.waitFor(`/^\\/persons\\/\\d+$/.test(location.pathname)`, 'หน้ารายละเอียด');
    eq('กดแถว → เข้าหน้ารายละเอียดคนนั้น', await b.evaluate(`document.querySelector('main').innerText.includes(${JSON.stringify(id.split(' (')[0])})`), true);
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-row-hover.png')); eq('สคริปต์รันจบ', false, true); }
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
