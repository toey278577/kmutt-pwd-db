// ข้อ 2: ลบคนแล้วไฟล์รูปต้องหาย + สคริปต์เก็บกวาดลบเฉพาะไฟล์กำพร้า
const { prisma, jwt, B, API: U, UPLOAD_DIR } = require('../lib.cjs');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const DIR = UPLOAD_DIR;   // โฟลเดอร์รูปของชุดทดสอบ (ไม่ใช่รูปจริงในเครื่อง)
let pass = 0, fail = 0;
const eq = (n, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  ได้ ${JSON.stringify(g)} ควร ${JSON.stringify(w)}`}`); };

(async () => {
  for (let i = 0; i < 30; i++) { try { await fetch(U + '/ping'); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: admin.id }, process.env.JWT_SECRET || 'kmutt_pwd_secret_2024', { expiresIn: '5m' }) };
  const call = async (m, p, b) => { const r = await fetch(U + p, { method: m, headers: H, body: b && JSON.stringify(b) }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const jpg = 'data:image/jpeg;base64,' + Buffer.alloc(50 * 1024, 9).toString('base64');
  const fileOf = (fp) => path.join(DIR, path.basename(fp));
  const people = [];
  const mk = async (n) => { const r = await call('POST', '/persons', { fullName: n, gender: 'FEMALE', thaiId: String(9999999950000 + people.length) }); people.push(r.body.id); return r.body.id; };
  const orphan = path.join(DIR, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg');
  try {
    console.log('── ลบคนแล้วไฟล์รูปต้องหาย');
    const a = await mk('ทดสอบรูป ลบ');
    const f1 = fileOf((await call('POST', `/persons/${a}/photos`, { filePath: jpg, photoType: 'profile' })).body.filePath);
    const f2 = fileOf((await call('POST', `/persons/${a}/photos`, { filePath: jpg, photoType: 'activity' })).body.filePath);
    eq('มีไฟล์รูป 2 ไฟล์ก่อนลบ', [fs.existsSync(f1), fs.existsSync(f2)], [true, true]);
    eq('ลบคนสำเร็จ', (await call('DELETE', `/persons/${a}`)).status, 200);
    eq('ไฟล์รูปทั้ง 2 หายไปด้วย', [fs.existsSync(f1), fs.existsSync(f2)], [false, false]);

    console.log('── สคริปต์เก็บกวาดลบเฉพาะไฟล์กำพร้า');
    const b = await mk('ทดสอบรูป เก็บไว้');
    const keep = fileOf((await call('POST', `/persons/${b}/photos`, { filePath: jpg, photoType: 'profile' })).body.filePath);
    fs.writeFileSync(orphan, 'x');
    const run = (...args) => execFileSync('node', ['scripts/cleanup-orphan-photos.cjs', ...args], { encoding: 'utf8' });
    const dry = run();
    eq('ดูอย่างเดียว: เห็นไฟล์กำพร้า', dry.includes(path.basename(orphan)), true);
    eq('ดูอย่างเดียว: ไม่แสดงไฟล์ที่มีเจ้าของ', dry.includes(path.basename(keep)), false);
    eq('ดูอย่างเดียว: ยังไม่ลบ', fs.existsSync(orphan), true);
    run('--apply');
    eq('--apply: ไฟล์กำพร้าหาย', fs.existsSync(orphan), false);
    eq('--apply: ไฟล์ที่มีเจ้าของยังอยู่', fs.existsSync(keep), true);
    eq('รันซ้ำ: ไม่เหลือไฟล์กำพร้า', run().includes('ไม่มีเจ้าของ 0'), true);
  } finally {
    for (const id of people) await call('DELETE', `/persons/${id}`);
    if (fs.existsSync(orphan)) fs.unlinkSync(orphan);
    await prisma.auditLog.deleteMany({ where: { label: { startsWith: 'ทดสอบรูป' } } });
    console.log(`\nสรุป: ผ่าน ${pass} / ไม่ผ่าน ${fail} — ลบข้อมูลทดสอบแล้ว`);
    await prisma.$disconnect();
    process.exit(fail ? 1 : 0);
  }
})().catch((e) => { console.error(e); process.exit(1); });
