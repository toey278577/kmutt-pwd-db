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
    await b.evaluate(`localStorage.setItem('theme', 'light'), true`);   // เช็คสีโหมดสว่างก่อน — กันค่าโหมดมืดค้างใน Chrome ของชุดทดสอบ
    await b.nav('/persons');
    await b.waitFor(`document.querySelectorAll('tbody tr.row-link').length >= 3`, 'ตารางรายชื่อ'); await sleep(300);
    await mouseAway();
    const before = await b.evaluate(look(1));
    eq('ยังไม่ชี้: แถวไม่มีพื้นส้ม/แถบส้ม', [before.bg.includes('rgb(255, 245, 240)'), before.bar], [false, false]);

    await mouseTo(1);
    const on = await b.evaluate(look(1));
    eq('ชี้แถว: พื้นส้มอ่อนทั้งแถว (รวมช่องปุ่มขวาสุด)', on.bg, ['rgb(255, 245, 240)']);
    eq('ชี้แถว: แถบส้มซ้าย + ชื่อสีส้ม + เคอร์เซอร์มือ', [on.bar, on.name, on.cursor], [true, 'rgb(201, 55, 12)', 'pointer']);
    eq('แถวอื่นไม่ติดสีไปด้วย', (await b.evaluate(look(0))).bar, false);
    await b.screenshot(shot('row-hover.png'));

    await b.evaluate(`document.documentElement.classList.add('dark'); true`);
    await mouseAway(); await mouseTo(1);
    const dark = await b.evaluate(look(1));
    eq('โหมดมืด: ชี้แล้วพื้นเปลี่ยน + ชื่อส้มสว่าง + แถบส้ม', [dark.bg, dark.name, dark.bar], [['rgb(51, 48, 44)'], 'rgb(255, 138, 92)', true]);
    await b.screenshot(shot('row-hover-dark.png'));
    await b.evaluate(`document.documentElement.classList.remove('dark'); true`);

    const id = await b.evaluate(`${ROW(1)}.querySelector('.row-link-name').textContent`);
    await b.evaluate(`${ROW(1)}.children[4].click(), true`);
    await b.waitFor(`/^\\/persons\\/\\d+$/.test(location.pathname)`, 'หน้ารายละเอียด');
    eq('กดแถว → เข้าหน้ารายละเอียดคนนั้น', await b.evaluate(`document.querySelector('main').innerText.includes(${JSON.stringify(id.split(' (')[0])})`), true);

    // หน้าอื่นที่แถวพาไปหน้าคนพิการ (เดิมต้องกดตรงชื่อเท่านั้น — พี่เต้ย 16 ต.ค. 69 ให้กดได้ทั้งแถวเหมือนกัน)
    for (const [label, url, tab] of [['ติดตามผล', '/followup'], ['การอบรม ตามรุ่น', '/training', 'ตามรุ่นอบรม'], ['การอบรม รายคน', '/training', 'ประวัติอบรมรายคน']]) {
      await b.nav(url);
      await b.waitFor(`document.querySelector('main')`, label); await sleep(500);
      if (tab) { await b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.trim().startsWith(${JSON.stringify(tab)})).click(), true`); }
      await b.waitFor(`document.querySelectorAll('tbody tr.row-link').length >= 1`, `แถว ${label}`); await sleep(300);
      await mouseAway(); await mouseTo(0);
      const s = await b.evaluate(look(0));
      await b.screenshot(shot(`row-hover-${url.slice(1)}${tab ? '-' + (tab === 'ตามรุ่นอบรม' ? 'batch' : 'records') : ''}.png`));
      eq(`${label}: ชี้แถว → พื้นส้มทั้งแถว + แถบซ้าย + ชื่อส้ม + เคอร์เซอร์มือ`, [s.bg, s.bar, s.name, s.cursor], [['rgb(255, 245, 240)'], true, 'rgb(201, 55, 12)', 'pointer']);
      const name = await b.evaluate(`${ROW(0)}.querySelector('.row-link-name').textContent.trim()`);
      await b.evaluate(`${ROW(0)}.children[2].click(), true`);
      await b.waitFor(`/^\\/persons\\/\\d+$/.test(location.pathname) && document.querySelector('main').innerText.includes(${JSON.stringify(name)})`, `${label}: หน้ารายละเอียด`);
      eq(`${label}: กดตรงไหนของแถวก็ได้ (ไม่ใช่แค่ชื่อ) → เข้าหน้าคนนั้น + ย้อนกลับครั้งเดียวถึงหน้าเดิม`,
        await b.evaluate(`new Promise(r => { history.back(); setTimeout(() => r(location.pathname), 400); })`), url);
    }
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-row-hover.png')); eq('สคริปต์รันจบ', false, true); }
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
