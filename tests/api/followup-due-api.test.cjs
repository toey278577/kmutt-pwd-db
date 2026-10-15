// ทดสอบ GET /api/data/followup-due กับข้อมูลจำลองใน DB เครื่อง แล้วลบทิ้ง
const { prisma, jwt, B, API: U, UPLOAD_DIR, SECRET } = require('../lib.cjs');
const path = require('path');
const { todayBangkok } = require(path.join(B, 'src/utils/followupDue'));
const DAY = 86_400_000;

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  g === w ? pass++ : fail++;
  console.log(`${g === w ? 'PASS' : 'FAIL'}  ${name}${g === w ? '' : `\n      ได้ ${g}\n      ควร ${w}`}`);
};

(async () => {
  for (let i = 0; i < 30; i++) { try { await fetch(U + '/ping'); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const today = todayBangkok();
  const ago = (d) => new Date(today.getTime() - d * DAY);
  const batches = [], persons = [];
  const batch = async (n, endDate, status) => { const b = await prisma.trainingBatch.create({ data: { batchNumber: 900 + n, year: 2569, courseName: 'ทดสอบ', endDate, status } }); batches.push(b.id); return b; };
  let seq = 0;
  const person = async (b, name, extra = {}, fus = []) => {
    const p = await prisma.person.create({ data: { fullName: name, gender: 'MALE', thaiId: String(9999999990000 + seq++), batchId: b.id, ...extra } });
    persons.push(p.id);
    for (const d of fus) await prisma.followUp.create({ data: { personId: p.id, followUpDate: d, employmentStatus: 'EMPLOYED' } });
    return p;
  };

  try {
    const A = await batch(1, ago(100), 'COMPLETED');   // รอบ 3ด ครบไปแล้ว ~9 วัน
    const Bb = await batch(2, ago(70), 'COMPLETED');   // รอบ 3ด อีก ~20 วัน (ช่วงเปิดแล้ว)
    const C = await batch(3, null, 'COMPLETED');       // จบแล้วแต่ไม่มีวันสิ้นสุด → เตือน
    const Dd = await batch(4, null, 'ACTIVE');         // ยังอบรมอยู่ → ไม่เตือน
    const E = await batch(5, ago(200), 'COMPLETED');   // ทำรอบ 3ด แล้ว → ตอนนี้รอบ 6ด เลยกำหนด
    const F = await batch(6, ago(20), 'COMPLETED');    // เพิ่งจบ ยังไม่ถึงช่วง

    await person(A, 'ทดสอบ เลยกำหนด', { mobile: '081-234-5678', nickname: 'เอ' });
    await person(A, 'ทดสอบ ตามแล้ว', {}, [ago(15)]);
    await person(A, 'ทดสอบ เสียชีวิต', { lifeStatus: 'DECEASED' });
    await person(Bb, 'ทดสอบ ใกล้ถึง', { phone: '02-111-2222' });
    await person(C, 'ทดสอบ ไม่มีวันจบ1');
    await person(C, 'ทดสอบ ไม่มีวันจบ2');
    await person(Dd, 'ทดสอบ ยังอบรม');
    await person(E, 'ทดสอบ รอบหก', {}, [ago(110)]);
    await person(F, 'ทดสอบ เพิ่งจบ');

    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const r = await fetch(U + '/data/followup-due', { headers: { Authorization: 'Bearer ' + jwt.sign({ id: admin.id }, SECRET) } });
    const data = await r.json();
    const mine = data.items.filter(i => i.fullName.startsWith('ทดสอบ'));
    const by = Object.fromEntries(mine.map(i => [i.fullName, i]));

    eq('HTTP 200', r.status, 200);
    eq('ขึ้นแค่ 3 คน: เลยกำหนด, ใกล้ถึง, รอบหก', mine.map(i => i.fullName).sort(), ['ทดสอบ ใกล้ถึง', 'ทดสอบ รอบหก', 'ทดสอบ เลยกำหนด'].sort());
    const a = by['ทดสอบ เลยกำหนด'];
    eq('เลยกำหนด: รอบ 3 / overdue / ติดลบ', [a?.round, a?.status, a?.daysLeft < 0], [3, 'overdue', true]);
    eq('เลยกำหนด: ใช้เบอร์มือถือ', a?.phone, '081-234-5678');
    const b = by['ทดสอบ ใกล้ถึง'];
    eq('ใกล้ถึง: upcoming / 1-30 วัน / ใช้เบอร์บ้านแทน', [b?.status, b?.daysLeft > 0 && b?.daysLeft <= 30, b?.phone], ['upcoming', true, '02-111-2222']);
    const e = by['ทดสอบ รอบหก'];
    eq('รอบหก: รอบ 6 overdue, ชิป done/current/future', [e?.round, e?.status, e?.rounds.map(x => x.state)], [6, 'overdue', ['done', 'current', 'future']]);
    eq('เรียงเลยกำหนดนานสุดก่อน', mine.map(i => i.daysLeft).every((d, i, arr) => i === 0 || arr[i - 1] <= d), true);
    const warn = data.noEndDateBatches.filter(x => x.batchNumber >= 900);
    eq('เตือนเฉพาะรุ่น 903 (จบแล้วไม่มีวันสิ้นสุด) 2 คน — ไม่เตือนรุ่นที่ยังอบรม', warn, [{ batchId: C.id, batchNumber: 903, year: 2569, persons: 2 }]);
    eq('summary นับตรง (อย่างน้อย)', data.summary.overdue >= 2 && data.summary.upcoming >= 1, true);
    console.log('\nตัวอย่างที่ส่งกลับ:', JSON.stringify(a));
  } finally {
    await prisma.person.deleteMany({ where: { id: { in: persons } } });
    await prisma.trainingBatch.deleteMany({ where: { id: { in: batches } } });
    console.log(`\nสรุป: ผ่าน ${pass} / ไม่ผ่าน ${fail} — ลบข้อมูลทดสอบแล้ว`);
    await prisma.$disconnect();
    process.exit(fail ? 1 : 0);
  }
})().catch((e) => { console.error(e); process.exit(1); });
