// หน้าออกรายงาน: รายชื่อ + แบบสังเกตพฤติกรรม (ช่องทักษะคอมพิวเตอร์ — เดิมว่างทุกคน) + ส่งออก Excel + รูปโปรไฟล์ถูกรูป
const fs = require('fs');
const path = require('path');
const { prisma, browser, eq, summary, sleep, shot, OUT, FE, API, SECRET, jwt, UPLOAD_DIR } = require('../lib.cjs');
const XLSX = require(path.join(FE, 'node_modules/xlsx'));
const DIR = path.join(OUT, 'downloads');

(async () => {
  fs.rmSync(DIR, { recursive: true, force: true }); fs.mkdirSync(DIR, { recursive: true });
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const p = await prisma.person.findFirst({ where: { thaiId: '8888888810000' } });
  const skills = await Promise.all([['Excel พื้นฐาน', 'BEGINNER'], ['Microsoft Word', 'INTERMEDIATE'], ['ทำอาหาร', 'ADVANCED']]
    .map(([skillName, skillLevel]) => prisma.skill.create({ data: { personId: p.id, skillName, skillLevel } })));
  // รูปกิจกรรมก่อน แล้วค่อยรูปโปรไฟล์ — รายงานต้องเลือกรูปโปรไฟล์ (เดิมเอารูปแรกที่เจอ)
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: admin.id }, SECRET, { expiresIn: '5m' }) };
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const up = async (photoType) => (await fetch(`${API}/persons/${p.id}/photos`, { method: 'POST', headers: H, body: JSON.stringify({ filePath: png, photoType }) })).json();
  const activity = await up('activity');
  const profile = await up('profile');
  const b = await browser();
  const pickType = async (label) => { await b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.includes(${JSON.stringify(label)})).click(), true`); await sleep(500); };
  const download = async (match) => {
    const before = new Set(fs.readdirSync(DIR));
    await b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.trim() === 'Excel').click(), true`);
    for (let i = 0; i < 40; i++) {
      await sleep(250);
      const f = fs.readdirSync(DIR).find((x) => !before.has(x) && x.endsWith('.xlsx') && x.includes(match));
      if (f) { await sleep(300); return XLSX.utils.sheet_to_json(XLSX.readFile(path.join(DIR, f)).Sheets[XLSX.readFile(path.join(DIR, f)).SheetNames[0]], { header: 1, defval: '' }); }
    }
    throw new Error('ไม่ได้ไฟล์ Excel ' + match);
  };
  try {
    await b.login(admin.id);
    await b.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DIR.replace(/\//g, '\\') });
    await b.nav('/report');
    await b.waitFor(`document.querySelector('main').textContent.includes(${JSON.stringify(p.fullName)})`, 'หน้ารายงาน'); await sleep(500);

    console.log('── รายชื่อคนพิการ');
    const list = await download('');
    const total = await prisma.person.count();
    eq(`Excel รายชื่อ: มีครบ ${total} คน`, list.filter((r) => /^\d+$/.test(String(r[0]))).length, total);

    console.log('── แบบสังเกตพฤติกรรม');
    await pickType('แบบสังเกตพฤติกรรมรายบุคคล');
    const rowText = await b.evaluate(`[...document.querySelectorAll('main tr')].filter(r => r.offsetParent !== null || true).map(r => r.innerText).find(t => t.includes(${JSON.stringify(p.fullName)})) || ''`);
    eq('หน้าพิมพ์: ช่องทักษะคอมพิวเตอร์มี Excel + Word (ตัวพิมพ์ใหญ่ก็นับ) ไม่มีทำอาหาร', [rowText.includes('Excel พื้นฐาน'), rowText.includes('Microsoft Word'), rowText.includes('ทำอาหาร')], [true, true, false]);
    eq('แบบสังเกต: รูป = รูปโปรไฟล์ (ไม่ใช่รูปกิจกรรม)', await b.evaluate(`[...document.querySelectorAll('main img')].map(i => i.getAttribute('src')).filter(s => s.includes('/uploads/'))`).then((srcs) => [srcs.includes(profile.filePath), srcs.includes(activity.filePath)]), [true, false]);
    await b.screenshot(shot('report-behavior.png'));
    const beh = await download('');
    const head = beh.find((r) => r.includes('ชื่อ - สกุล')) || [];
    const col = head.findIndex((h) => String(h).includes('คอมพิวเตอร์'));
    const row = beh.find((r) => r[1] === p.fullName) || [];
    eq('Excel แบบสังเกต: คอลัมน์ทักษะคอมพิวเตอร์ของคนนี้ถูก', [col >= 0, String(row[col] || '').split(', ').sort()], [true, ['Excel พื้นฐาน', 'Microsoft Word']]);
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-report.png')); eq('สคริปต์รันจบ', false, true); }
  await prisma.skill.deleteMany({ where: { id: { in: skills.map((s) => s.id) } } });
  for (const ph of await prisma.personPhoto.findMany({ where: { personId: p.id } })) { const f = path.join(UPLOAD_DIR, path.basename(ph.filePath)); if (fs.existsSync(f)) fs.unlinkSync(f); }
  await prisma.personPhoto.deleteMany({ where: { personId: p.id } });
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
