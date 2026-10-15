// ข้อ 3: ขนาดรูป/ข้อมูลที่ส่งเข้าหลังบ้าน
const { prisma, jwt, B, API: U, UPLOAD_DIR, SECRET } = require('../lib.cjs');
const path = require('path');
const fs = require('fs');
let pass = 0, fail = 0;
const eq = (n, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  ได้ ${JSON.stringify(g)} ควร ${JSON.stringify(w)}`}`); };

(async () => {
  for (let i = 0; i < 30; i++) { try { await fetch(U + '/ping'); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: admin.id }, SECRET, { expiresIn: '5m' }) };
  const raw = async (body) => { const r = await fetch(U + `/persons/${pid}/photos`, { method: 'POST', headers: H, body }); return { status: r.status, body: await r.json().catch(() => '(ไม่ใช่ JSON)') }; };
  const jpg = (mb) => JSON.stringify({ filePath: 'data:image/jpeg;base64,' + Buffer.alloc(Math.round(mb * 1024 * 1024), 3).toString('base64'), photoType: 'profile' });
  const p = await prisma.person.create({ data: { fullName: 'ทดสอบขนาดรูป', gender: 'MALE', thaiId: '9999999940001' } });
  const pid = p.id;
  try {
    eq('รูป 4MB (เดิมไม่ผ่าน) → ผ่าน', (await raw(jpg(4))).status, 201);
    eq('รูป 4.9MB → ผ่าน', (await raw(jpg(4.9))).status, 201);
    const r6 = await raw(jpg(6.5));
    eq('รูป 6.5MB → 413 + ข้อความไทย (JSON)', [r6.status, typeof r6.body?.error === 'string' && r6.body.error.startsWith('ไฟล์หรือข้อมูลใหญ่เกินไป')], [413, true]);
    const r5 = await raw(jpg(5.5));
    eq('รูป 5.5MB → ปฏิเสธด้วยข้อความไทย', [r5.status, r5.body?.error], [400, 'ไฟล์ใหญ่เกิน 5MB']);
    const bad = await raw('{"filePath": ');
    eq('JSON เสีย → 400 ข้อความไทย', [bad.status, bad.body?.error], [400, 'ข้อมูลที่ส่งมาไม่ถูกต้อง กรุณาลองใหม่']);
    const ok = await fetch(U + '/persons', { headers: H });
    eq('request ปกติยังใช้ได้', ok.status, 200);
  } finally {
    const photos = await prisma.personPhoto.findMany({ where: { personId: pid } });
    for (const ph of photos) { const f = path.join(UPLOAD_DIR, path.basename(ph.filePath)); if (fs.existsSync(f)) fs.unlinkSync(f); }
    await prisma.person.delete({ where: { id: pid } });
    await prisma.auditLog.deleteMany({ where: { label: 'ทดสอบขนาดรูป' } });
    console.log(`\nสรุป: ผ่าน ${pass} / ไม่ผ่าน ${fail} — ลบข้อมูลทดสอบแล้ว`);
    await prisma.$disconnect();
    process.exit(fail ? 1 : 0);
  }
})().catch((e) => { console.error(e); process.exit(1); });
