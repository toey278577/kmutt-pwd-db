// แท็บ "ประวัติการแก้ไข" ในหน้ารายละเอียด (เฉพาะแอดมิน) + หน้าประวัติการใช้งานเป็นการ์ดบนมือถือ
const { prisma, browser, eq, summary, sleep, shot, API, SECRET, jwt } = require('../lib.cjs');

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const staff = await prisma.user.findFirst({ where: { role: 'STAFF', isActive: true } });
  const viewer = await prisma.user.findFirst({ where: { role: 'VIEWER', isActive: true } });
  const call = async (user, m, p, body) => {
    const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: user.id }, SECRET, { expiresIn: '5m' }) }, body: body && JSON.stringify(body) });
    return r.json().catch(() => null);
  };
  // สร้างประวัติจริงผ่าน API: แอดมินเพิ่มคน → เจ้าหน้าที่แก้ → แอดมินเพิ่ม/ลบทักษะ
  const p = await call(admin, 'POST', '/persons', { fullName: 'นาย ทดสอบประวัติ แก้ไข', gender: 'MALE', thaiId: '9999999950001' });
  await call(staff, 'PUT', `/persons/${p.id}`, { fullName: 'นาย ทดสอบประวัติ แก้ไข', gender: 'MALE', nickname: 'ประวัติ' });
  const sk = await call(admin, 'POST', `/persons/${p.id}/skills`, { skillName: 'Excel', skillLevel: 'BEGINNER' });
  await call(admin, 'DELETE', `/persons/${p.id}/skills/${sk.id}`);
  await sleep(600);

  const b = await browser();
  const tabNames = () => b.evaluate(`[...document.querySelectorAll('[role=tab]')].map(t => t.textContent.trim())`);
  const items = () => b.evaluate(`[...document.querySelectorAll('main ol > li')].map(li => li.innerText.replace(/\\s+/g, ' '))`);
  const openHistory = async () => {
    await b.evaluate(`[...document.querySelectorAll('[role=tab]')].find(t => t.textContent.trim() === 'ประวัติการแก้ไข').click(), true`);
    await b.waitFor(`document.querySelector('main ol > li') || document.querySelector('main')?.textContent.includes('ยังไม่มีประวัติ')`, 'รายการประวัติ');
    await sleep(300);
  };
  const open = async () => { await b.nav('/persons/' + p.id); await b.waitFor(`document.querySelector('[role=tablist]') && document.querySelector('main').textContent.includes('ทดสอบประวัติ')`, 'หน้ารายละเอียด'); await sleep(300); };
  try {
    await b.login(admin.id);
    await open();
    eq('แอดมิน: มีแท็บ "ประวัติการแก้ไข" ต่อท้าย (8 แท็บ)', [(await tabNames()).length, (await tabNames()).at(-1)], [8, 'ประวัติการแก้ไข']);
    await openHistory();
    const rows = await items();
    const dbCount = await prisma.auditLog.count({ where: { personId: p.id } });
    eq('รายการครบเท่าในฐานข้อมูล (4 การกระทำ)', [rows.length, dbCount], [4, 4]);
    eq('เรียงใหม่สุดก่อน: ลบทักษะ → เพิ่มทักษะ → แก้ข้อมูล → เพิ่มคน', rows.map((t) => t.split(' โดย ')[0]), ['ลบ ทักษะ', 'เพิ่ม ทักษะ', 'แก้ไข ข้อมูลคนพิการ', 'เพิ่ม ข้อมูลคนพิการ']);
    eq('บอกว่าใครทำ (แอดมิน / เจ้าหน้าที่)', [rows[2].includes(`โดย ${staff.name}`), rows[3].includes(`โดย ${admin.name}`)], [true, true]);
    eq('หัวแท็บบอกจำนวน + เห็นเฉพาะผู้ดูแล', await b.evaluate(`document.querySelector('main').innerText.includes('(4 รายการ)') && document.querySelector('main').innerText.includes('เห็นเฉพาะผู้ดูแลระบบ')`), true);
    await b.screenshot(shot('history-tab.png'));

    console.log('── โหลดเพิ่ม (เกิน 50 รายการ)');
    await prisma.auditLog.createMany({ data: Array.from({ length: 55 }, (_, i) => ({ userId: staff.id, userName: staff.name, action: 'UPDATE', entity: 'training', entityId: 1, personId: p.id, label: 'ทดสอบ', createdAt: new Date(Date.now() - (i + 1) * 60000 - 86400000) })) });
    await open(); await openHistory();
    eq('ครั้งแรกโหลด 50 + มีปุ่ม "โหลดเพิ่ม (9)"', [(await items()).length, await b.evaluate(`[...document.querySelectorAll('main button')].some(x => x.textContent.trim() === 'โหลดเพิ่ม (9)')`)], [50, true]);
    await b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.trim().startsWith('โหลดเพิ่ม')).click(), true`); await sleep(800);
    eq('กดโหลดเพิ่ม → ครบ 59 + ปุ่มหาย + ไม่มีรายการซ้ำ', [(await items()).length, await b.evaluate(`[...document.querySelectorAll('main button')].some(x => x.textContent.trim().startsWith('โหลดเพิ่ม'))`), await b.evaluate(`new Set([...document.querySelectorAll('main ol > li')].map(li => li.innerText)).size >= 2`)], [59, false, true]);

    console.log('── มือถือ');
    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await open(); await openHistory();
    eq('มือถือ: เปิดแท็บได้ (ปัดถึง) + ไม่ล้นจอ', [(await items()).length > 0, await b.evaluate(`document.documentElement.scrollWidth <= innerWidth`)], [true, true]);
    await b.screenshot(shot('m-history-tab.png'));

    console.log('── หน้าประวัติการใช้งาน (มือถือ)');
    await b.nav('/audit');
    await b.waitFor(`[...document.querySelectorAll('main [data-card]')].filter(c => c.offsetParent).length > 0`, 'การ์ดประวัติ'); await sleep(400);
    eq('การ์ดแทนตาราง + ไม่ล้นจอ', await b.evaluate(`[[...document.querySelectorAll('main table')].every(t => !t.offsetParent), document.documentElement.scrollWidth <= innerWidth, [...document.querySelectorAll('main [data-card]')].filter(c => c.offsetParent).length]`), [true, true, 50]);
    await b.screenshot(shot('m-audit.png'));
    await b.evaluate(`[...document.querySelectorAll('main [data-card]')].find(c => c.offsetParent && c.getAttribute('role') === 'button' && c.innerText.includes('ทดสอบ')).click(), true`); await sleep(600);
    eq('กดการ์ดที่ผูกกับคน → ไปหน้ารายละเอียดคนนั้น', await b.evaluate('location.pathname'), `/persons/${p.id}`);

    console.log('── สิทธิ์');
    await b.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
    for (const [u, label] of [[staff, 'เจ้าหน้าที่'], [viewer, 'ผู้ดูข้อมูล']]) {
      await b.login(u.id); await open();
      eq(`${label}: ไม่มีแท็บประวัติ (7 แท็บ)`, [(await tabNames()).length, (await tabNames()).includes('ประวัติการแก้ไข')], [7, false]);
    }
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-history.png')); eq('สคริปต์รันจบ', false, true); }
  await prisma.auditLog.deleteMany({ where: { personId: p.id } });
  await prisma.person.deleteMany({ where: { id: p.id } });
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
