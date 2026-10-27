// ถ่ายภาพหน้าจอจริงให้เอกสารโครงการ (docs/project-docs) — ไม่อยู่ในชุดทดสอบปกติ
//   cd backend && npm test -- docs      (หรือ node docs/project-docs/shots.cjs ซึ่งรันคำสั่งนี้แล้วก๊อปภาพไปให้)
// ใช้ฐานข้อมูลทดสอบ + ข้อมูลสมมติเท่านั้น (เลขบัตร 88888888xxxxx) — ห้ามมีข้อมูลคนพิการจริงในเอกสาร
// ภาพ → tests/.output/shots/doc-*.png · จอคอม 1400 px · มือถือ 390 px (2x)
const { prisma, browser, eq, summary, sleep, shot, API, jwt, SECRET } = require('../lib.cjs');

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const people = await prisma.person.findMany({ orderBy: { id: 'asc' } });
  const batch813 = await prisma.trainingBatch.findFirst({ where: { batchNumber: 813 } });
  const types = await prisma.disabilityType.findMany({ orderBy: { id: 'asc' } });
  const tok = jwt.sign({ id: admin.id }, SECRET, { expiresIn: '1h' });
  const api = async (p, method = 'GET', body) => {
    const r = await fetch(API + p, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: body && JSON.stringify(body) });
    return r.json().catch(() => null);
  };

  // ── ข้อมูลสมมติเพิ่ม ให้หน้าจอมีของให้ดู (ทำผ่าน API บางส่วน จะได้มีประวัติการใช้งานจริง)
  await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'staff@test.local', password: 'test1234' }) });
  const b814 = await api('/batches', 'POST', { batchNumber: 814, year: 2569, courseName: 'การฝึกอบรม-ฝึกงานคนพิการ รุ่นปัจจุบัน', startDate: '2026-09-01', endDate: '2026-12-15', status: 'ACTIVE' });
  for (const name of ['ธุรการสำนักงาน', 'บาริสต้าและบริการ']) await api(`/batches/${b814.id}/courses`, 'POST', { name });
  await prisma.person.update({ where: { id: people[6].id }, data: { batchId: b814.id } });
  for (const [i, p] of people.slice(0, 6).entries()) {
    await prisma.personAssessment.create({ data: { personId: p.id, batchId: batch813.id, preTestScore: 45 + i * 4, postTestScore: 70 + i * 4, softSkillComm: 3 + (i % 3) * 0.5, softSkillTime: 3.5, softSkillMotiv: 4, softSkillDuty: 4 + (i % 2) * 0.5 } });
  }
  for (const [skillName, skillLevel] of [['Microsoft Excel', 'ADVANCED'], ['Microsoft Word', 'INTERMEDIATE'], ['Data Entry', 'BEGINNER']]) await api(`/persons/${people[0].id}/skills`, 'POST', { skillName, skillLevel });
  await api(`/persons/${people[0].id}/workexp`, 'POST', { organizationName: 'บริษัท ตัวอย่างยูไอ จำกัด', jobType: 'ธุรการ', startDate: '2026-08-01', workMode: 'INTERNSHIP', income: 9000, outcome: 'ฝึกงานครบ 3 เดือน' });
  await api(`/persons/${people[1].id}/training`, 'POST', { courseName: 'บาริสต้าเบื้องต้น', organizer: 'มจธ.', startDate: '2026-06-01', endDate: '2026-06-20', trainingType: 'LEARN', skillsGained: 'ชงกาแฟ บริการลูกค้า' });
  for (const o of [{ orgName: 'บริษัท สมมติค้าปลีก จำกัด', businessType: 'ค้าปลีก', contactName: 'ฝ่ายบุคคล', phone: '029998888' }, { orgName: 'โรงแรมตัวอย่าง', businessType: 'โรงแรม/บริการ', contactName: 'ฝ่ายบุคคล' }]) await api('/organizations', 'POST', o);
  await api(`/persons/${people[2].id}/disability`, 'POST', { disabilityTypeId: types[5].id, disabilityLevel: 'ระดับ 1' });
  eq('เตรียมข้อมูลสมมติครบ', !!b814?.id, true);

  const b = await browser();
  const view = (w, h, mobile = false) => b.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile });
  const snap = async (name) => { await sleep(500); await b.screenshot(shot(`doc-${name}.png`)); };
  const go = async (url, name, ready = 'main', wait = 900) => { await b.nav(url); await b.waitFor(`document.querySelector(${JSON.stringify(ready)})`, name); await sleep(wait); if (name) await snap(name); };
  const clickIncl = (text, scope = 'document') => b.evaluate(`(() => { const el = [...${scope}.querySelectorAll('button,a,[role=tab]')].find(e => e.innerText && e.innerText.includes(${JSON.stringify(text)}) && e.offsetParent !== null);
    if (!el) throw new Error('ไม่เจอปุ่ม: ' + ${JSON.stringify(text)}); el.click(); return true; })()`);
  const closeDialogs = () => b.evaluate(`document.querySelectorAll('dialog[open]').forEach(d => d.close()), true`);
  try {
    // ── หน้าเข้าสู่ระบบ
    await view(1400, 900);
    await b.nav('/login'); await b.evaluate(`sessionStorage.clear(); localStorage.setItem('theme', 'light'); true`);
    await go('/login', 'login', 'input[type=email]', 1200);
    await view(390, 844, true);
    await go('/login', 'm-login', 'input[type=email]', 1000);

    // ── ผู้ดูแลระบบ: ทุกหน้า (จอคอม)
    await view(1400, 900);
    await b.login(admin.id);
    await view(1400, 1500);
    await go('/', 'dashboard', 'main', 1800);
    await view(1400, 900);
    await go('/persons', 'persons', 'tbody tr');
    await clickIncl('เพิ่มคนพิการ'); await sleep(700); await snap('person-form'); await b.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })), true`); await closeDialogs();
    await go('/persons', null, 'tbody tr', 500);
    await clickIncl('นำเข้า Excel'); await sleep(700); await snap('import'); await closeDialogs();
    await go(`/persons/${people[0].id}`, 'detail', 'main h1, main h2', 1200);
    await clickIncl('ประเมินทักษะ', 'document.querySelector("main")'); await sleep(900); await snap('detail-assess');
    await clickIncl('ทักษะ', 'document.querySelector("main")'); await sleep(700); await snap('detail-skills');
    await go('/training', 'training', 'main table, main [data-card]', 1000);
    await go('/followup', 'followup', 'main', 1300);
    await go('/data-check', 'data-check', 'main', 1200);
    await go('/organizations', 'organizations', 'main', 1000);
    await go('/batches', 'batches', 'main', 1200);
    await go('/report', 'report', 'main', 900);
    await clickIncl('ใบ Certificate'); await sleep(1200); await snap('report-cert');
    await go('/report', null, 'main', 600);
    await clickIncl('แบบสังเกตพฤติกรรมรายบุคคล'); await sleep(1200); await snap('report-behavior');
    await go('/help', 'help', 'main', 1000);
    await go('/users', 'users', 'main table', 1000);
    await go('/audit', 'audit', 'main', 1200);
    await go('/disability-types', 'disability-types', 'main', 1000);

    // ── โหมดมืด
    await b.evaluate(`localStorage.setItem('theme', 'dark'); true`);
    await go('/', 'dark-dashboard', 'main', 1600);
    await go(`/persons/${people[0].id}`, 'dark-detail', 'main h1, main h2', 1200);
    await b.nav('/login'); await b.evaluate(`sessionStorage.clear(); true`);
    await go('/login', 'dark-login', 'input[type=email]', 1200);
    await b.login(admin.id);
    await b.evaluate(`localStorage.setItem('theme', 'light'); true`);

    // ── มือถือ
    await view(390, 844, true);
    await go('/', 'm-dashboard', 'main', 1500);
    await b.evaluate(`[...document.querySelectorAll('button')].find(x => x.offsetParent && x.querySelector('svg.lucide-menu'))?.click(), true`); await sleep(600);
    await snap('m-menu');
    await go('/persons', 'm-persons', 'main', 1000);
    await go(`/persons/${people[0].id}`, 'm-detail', 'main h1, main h2', 1200);
    await go('/followup', 'm-followup', 'main', 1200);
    await view(1400, 900);
    eq('ถ่ายภาพครบ ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-doc-shots.png')); eq('สคริปต์รันจบ', false, true); }
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
