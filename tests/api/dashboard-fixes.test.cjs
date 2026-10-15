// ทดสอบ: ตัวเลข Dashboard (นับคน/ผู้เข้าอบรม), ล้าง cache ทันที, error ภาษาไทย
const { prisma, jwt, B, API: U, UPLOAD_DIR, SECRET } = require('../lib.cjs');
const path = require('path');

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  g === w ? pass++ : fail++;
  console.log(`${g === w ? 'PASS' : 'FAIL'}  ${name}${g === w ? '' : `\n      ได้ ${g}\n      ควร ${w}`}`);
};
const emp = (s) => Object.fromEntries(s.byEmployment.map((e) => [e.name, e.value]));

(async () => {
  for (let i = 0; i < 30; i++) { try { await fetch(U + '/ping'); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: admin.id }, SECRET, { expiresIn: '5m' }) };
  const call = async (m, p, b) => { const r = await fetch(U + p, { method: m, headers: H, body: b && JSON.stringify(b) }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const persons = [], batches = [];
  let seq = 0;
  const mk = async (extra = {}) => { const p = await prisma.person.create({ data: { fullName: 'ทดสอบแก้ ' + seq, gender: 'MALE', thaiId: String(9999999980000 + seq++), ...extra } }); persons.push(p.id); return p; };

  try {
    const before = (await call('GET', '/dashboard/stats')).body;
    const e0 = emp(before);

    // คน A ตาม 3 รอบ: ล่าสุด = ศึกษาต่อ · คน B ตาม 1 รอบ = มีงาน
    const A = await mk(), Bp = await mk();
    for (const [d, s] of [['2026-01-01', 'EMPLOYED'], ['2026-04-01', 'UNEMPLOYED'], ['2026-07-01', 'STUDYING']]) {
      await prisma.followUp.create({ data: { personId: A.id, followUpDate: new Date(d), employmentStatus: s } });
    }
    await prisma.followUp.create({ data: { personId: Bp.id, followUpDate: new Date('2026-05-01'), employmentStatus: 'EMPLOYED' } });
    // คน C อยู่ในรุ่น (ไม่มีประวัติอบรมรายคน) · คน D มีประวัติอบรมรายคน (ไม่อยู่ในรุ่น) · คน E ไม่มีทั้งคู่
    const b = await prisma.trainingBatch.create({ data: { batchNumber: 950, year: 2569, courseName: 'ทดสอบ' } }); batches.push(b.id);
    await mk({ batchId: b.id });
    const D = await mk(); await prisma.trainingRecord.create({ data: { personId: D.id, courseName: 'ทดสอบ' } });
    await mk();

    // เพิ่มคนผ่าน API → cache ต้องถูกล้าง ตัวเลขต้องขยับทันที (ไม่ต้องรอ 60 วิ)
    const created = await call('POST', '/persons', { fullName: 'ทดสอบแก้ api', gender: 'FEMALE', thaiId: '9999999989999' });
    if (created.body?.id) persons.push(created.body.id);
    const after = (await call('GET', '/dashboard/stats')).body;
    const e1 = emp(after);

    console.log('── ตัวเลข Dashboard');
    eq('คนทั้งหมด +6 ทันทีหลังเพิ่ม (cache ถูกล้าง)', after.totalPersons - before.totalPersons, 6);
    eq('ผู้เข้าอบรม +2 (คนในรุ่น + คนมีประวัติอบรม, ไม่นับคนที่ไม่มีทั้งคู่)', after.totalTraining - before.totalTraining, 2);
    eq('คนที่มีผลติดตาม +2 (ไม่ใช่ +4 ตามจำนวนบันทึก)', after.followedUpPersons - before.followedUpPersons, 2);
    eq('สถานะงาน: ศึกษาต่อ +1, มีงาน +1, ว่างงาน +0 (ใช้ผลล่าสุดของคน A)',
      [(e1.STUDYING || 0) - (e0.STUDYING || 0), (e1.EMPLOYED || 0) - (e0.EMPLOYED || 0), (e1.UNEMPLOYED || 0) - (e0.UNEMPLOYED || 0)], [1, 1, 0]);

    console.log('── error เป็นภาษาไทย');
    const r1 = await call('PUT', '/persons/999999', { fullName: 'x', gender: 'MALE' });
    eq('แก้คนที่ไม่มีอยู่ → ไม่พบข้อมูล (ไทย)', [r1.status, r1.body?.error], [400, 'ไม่พบข้อมูลนี้ อาจถูกลบไปแล้ว ลองรีเฟรชหน้า']);
    const r2 = await call('POST', `/persons/${A.id}/followup`, { followUpDate: '2026-10-01', employmentStatus: 'มั่ว' });
    eq('ค่าสถานะผิด → ข้อความไทยทั่วไป', r2.body?.error, 'บันทึกไม่สำเร็จ ข้อมูลบางช่องไม่ถูกต้องหรือไม่ครบ กรุณาตรวจสอบแล้วลองใหม่');
    const r3 = await call('POST', '/persons', { fullName: 'ซ้ำ', gender: 'MALE', thaiId: '9999999989999' });
    eq('เลขบัตรซ้ำ → ไทย ไม่โชว์ชื่อคอลัมน์', r3.body?.error, 'เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว (ซ้ำ)');
    const r4 = await fetch(U + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'nobody@x.local', password: 'x' }) });
    eq('ล็อกอินผิด → ไทย', (await r4.json()).error, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    const r5 = await call('GET', '/batches/999999');
    eq('รุ่นที่ไม่มี → ไทย', r5.body?.error, 'ไม่พบข้อมูลนี้ อาจถูกลบไปแล้ว');
    const r6 = await call('POST', '/batches', { year: 2569 });
    eq('สร้างรุ่นไม่ครบช่อง → ไทย', r6.body?.error, 'กรุณากรอกเลขรุ่น ปี และชื่อหลักสูตร');
    const ok = await call('GET', '/persons');
    eq('request ปกติยังใช้ได้', ok.status, 200);
  } finally {
    await prisma.person.deleteMany({ where: { id: { in: persons } } });
    await prisma.trainingBatch.deleteMany({ where: { id: { in: batches } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ label: { startsWith: 'ทดสอบแก้' } }, { label: 'nobody@x.local' }] } });
    console.log(`\nสรุป: ผ่าน ${pass} / ไม่ผ่าน ${fail} — ลบข้อมูลทดสอบแล้ว`);
    await prisma.$disconnect();
    process.exit(fail ? 1 : 0);
  }
})().catch((e) => { console.error(e); process.exit(1); });
