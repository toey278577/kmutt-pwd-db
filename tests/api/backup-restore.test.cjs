// ซ้อมกู้ข้อมูล: สำรองด้วยสคริปต์ที่ระบบจริงใช้ทุกคืน (backup-db.cjs + tar รูปแบบ backup.sh)
// → ทำข้อมูลพัง (ลบคน/องค์กร, แก้ชื่อ, เพิ่มขยะ, รูปหาย) → กู้ (restore-db.cjs --wipe + แตก tar)
// → ทุกแถวของทุกตารางต้องเหมือนตอนสำรองเป๊ะ · รูปกลับมาเปิดได้ · ล็อกอินได้ · เพิ่มข้อมูลใหม่ต่อได้ (id ไม่ชน)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { prisma, eq, summary, sleep, B, OUT, API, SECRET, jwt, UPLOAD_DIR } = require('../lib.cjs');

const MODELS = ['disabilityType', 'organization', 'user', 'trainingBatch', 'course', 'person', 'personPhoto', 'disabilityInfo',
  'trainingRecord', 'workExperience', 'skill', 'followUp', 'personOrganization', 'personAssessment', 'auditLog'];
const node = (args) => execFileSync(process.execPath, args, { cwd: B, env: process.env, encoding: 'utf8' });
const snapshot = async () => Object.fromEntries(await Promise.all(MODELS.map(async (m) => [m, JSON.stringify(await prisma[m].findMany({ orderBy: { id: 'asc' } }))])));
const counts = async () => Object.fromEntries(await Promise.all(MODELS.map(async (m) => [m, await prisma[m].count()])));

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: admin.id }, SECRET, { expiresIn: '10m' }) };
  const call = async (m, p, body) => { const r = await fetch(API + p, { method: m, headers: H, body: body && JSON.stringify(body) }); return [r.status, await r.json().catch(() => null)]; };
  const ORIGIN = API.replace(/\/api$/, '');
  let drillId = null;
  try {
    // ข้อมูลให้ครบทุกแบบ: ทศนิยม (รายได้/เงินสนับสนุน) วันที่ รูปจริง ผลประเมิน ประวัติการใช้งาน
    const [, p] = await call('POST', '/persons', { fullName: 'นาย ซ้อมกู้ ข้อมูล', gender: 'MALE', thaiId: '9999999960001', birthDate: '1995-03-15', province: 'ชลบุรี' });
    drillId = p.id;
    await call('POST', `/persons/${p.id}/workexp`, { organizationName: 'ร้านทดสอบซ้อมกู้', workMode: 'EMPLOYMENT', income: '12345.67', startDate: '2026-01-02' });
    await call('POST', `/persons/${p.id}/followup`, { followUpDate: '2026-09-01', employmentStatus: 'EMPLOYED', income: '9000.50' });
    const [, photo] = await call('POST', `/persons/${p.id}/photos`, { filePath: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', photoType: 'profile' });
    const photoUrl = ORIGIN + photo.filePath;
    await sleep(600);   // ประวัติการใช้งานบันทึกหลังตอบกลับ

    console.log('── สำรอง (แบบที่ระบบจริงทำทุกคืน)');
    const before = await snapshot();
    const beforeCounts = await counts();
    const out = node(['scripts/backup-db.cjs']);
    const file = (out.match(/→ (.+\.json)/) || [])[1]?.trim();
    eq('สำรองฐานข้อมูลได้ไฟล์ + อยู่ในโฟลเดอร์ของชุดทดสอบ (ไม่ปนไฟล์สำรองจริง)', [!!file && fs.existsSync(file), file?.startsWith(path.join(OUT, 'backups'))], [true, true]);
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    eq('ไฟล์สำรองมีครบ 15 ตาราง จำนวนแถวตรง', Object.fromEntries(MODELS.map((m) => [m, json.data[m]?.length])), beforeCounts);
    fs.rmSync(path.join(OUT, 'photos-drill.tar.gz'), { force: true });
    execFileSync('tar', ['-czf', 'photos-drill.tar.gz', '-C', '.', path.basename(path.dirname(UPLOAD_DIR))], { cwd: path.dirname(path.dirname(UPLOAD_DIR)) });
    eq('สำรองรูปเป็น tar ได้', fs.existsSync(path.join(OUT, 'photos-drill.tar.gz')), true);

    console.log('── ทำข้อมูลพัง');
    const somchai = await prisma.person.findFirst({ where: { thaiId: '8888888810000' } });
    await call('DELETE', `/persons/${p.id}`);                     // ลบคน (รูปถูกลบจากดิสก์ด้วย)
    await call('DELETE', `/persons/${somchai.id}`);               // ลบคนตัวอย่างที่มีข้อมูลเยอะ
    const org = await prisma.organization.findFirst();
    await call('DELETE', `/organizations/${org.id}`);
    await prisma.person.updateMany({ where: { thaiId: '8888888810001' }, data: { fullName: 'ชื่อพัง' } });
    await prisma.person.create({ data: { fullName: 'ขยะ', gender: 'MALE', thaiId: '9999999960099' } });
    fs.rmSync(path.dirname(UPLOAD_DIR), { recursive: true, force: true });   // โฟลเดอร์รูปหายทั้งหมด
    await sleep(400);
    eq('ยืนยันว่าพังจริง (ข้อมูลไม่เหมือนเดิม + เปิดรูปไม่ได้)', [JSON.stringify(await snapshot()) !== JSON.stringify(before), (await fetch(photoUrl)).status !== 200], [true, true]);

    console.log('── กู้');
    const rout = node(['scripts/restore-db.cjs', file, '--wipe']);
    eq('สคริปต์กู้จบ ไม่มีแถวถูกข้าม', [rout.includes('กู้คืนเสร็จ'), rout.includes('กู้ไม่ครบ')], [true, false]);
    execFileSync('tar', ['-xzf', 'photos-drill.tar.gz', '-C', '.'], { cwd: path.dirname(path.dirname(UPLOAD_DIR)) });
    const after = await snapshot();
    eq('ทุกตารางกลับมาเหมือนตอนสำรองเป๊ะ (เทียบทุกแถว ทุกช่อง)', MODELS.filter((m) => after[m] !== before[m]), []);
    eq('ทศนิยม + วันที่ไม่เพี้ยน', await prisma.workExperience.findFirst({ where: { personId: p.id } }).then((w) => [String(w.income), w.startDate.toISOString().slice(0, 10)]), ['12345.67', '2026-01-02']);
    eq('รูปกลับมาเปิดได้', (await fetch(photoUrl)).status, 200);

    console.log('── ใช้งานต่อได้');
    const login = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@kmutt.ac.th', password: 'admin123' }) });
    eq('ล็อกอินได้ (รหัสผ่านกลับมาด้วย)', login.status, 200);
    const maxId = (await prisma.person.aggregate({ _max: { id: true } }))._max.id;
    const [s, np] = await call('POST', '/persons', { fullName: 'นาย หลังกู้ ทดสอบ', gender: 'MALE', thaiId: '9999999960002' });
    eq('เพิ่มคนใหม่หลังกู้ได้ เลข id ต่อจากเดิม ไม่ชน', [s, np?.id > maxId], [201, true]);
    if (np?.id) await call('DELETE', `/persons/${np.id}`);

    console.log('── กู้ซ้ำโดยไม่ล้างก่อน (ต้องบอกตามจริงว่าข้าม)');
    const again = node(['scripts/restore-db.cjs', file]);
    eq('ไม่ใส่ --wipe → เตือน "กู้ไม่ครบ" (เดิมขึ้นว่ากู้ครบทั้งที่ข้ามหมด)', [again.includes('กู้ไม่ครบ'), /กู้คืนเสร็จ 0 แถว/.test(again)], [true, true]);
  } catch (e) { console.log('ERROR', e.message); eq('สคริปต์รันจบ', false, true); }
  // เก็บกวาดผ่าน API — ไฟล์รูปจะถูกลบด้วย ไม่ค้างไปกวนเทสต์อื่น
  if (drillId) for (const x of await prisma.person.findMany({ where: { thaiId: { in: ['9999999960001', '9999999960002', '9999999960099'] } } })) await call('DELETE', `/persons/${x.id}`);
  await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
