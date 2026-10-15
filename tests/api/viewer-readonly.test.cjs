// ทดสอบว่า VIEWER อ่านได้อย่างเดียว ส่วน STAFF/ADMIN ยังเขียนได้ปกติ
const { prisma, jwt, B, API: U, UPLOAD_DIR } = require('../lib.cjs');
const path = require('path');
const { SECRET } = require('../lib.cjs');

let pass = 0, fail = 0;
const check = (name, got, want) => {
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (ได้ ${got}${ok ? '' : `, ควรได้ ${want}`})`);
};

(async () => {
  for (let i = 0; i < 30; i++) { try { await fetch(U + '/ping'); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const startAudit = (await prisma.auditLog.aggregate({ _max: { id: true } }))._max.id || 0;
  const viewer = await prisma.user.create({ data: { name: 'ทดสอบ viewer', email: 'viewer-test@x.local', password: 'x', role: 'VIEWER' } });
  const staff = await prisma.user.create({ data: { name: 'ทดสอบ staff', email: 'staff-test@x.local', password: 'x', role: 'STAFF' } });
  const target = await prisma.person.create({ data: { fullName: 'เป้าทดสอบ', gender: 'MALE', thaiId: '9999999999970' } });
  const org = await prisma.organization.create({ data: { orgName: 'องค์กรทดสอบ' } });
  const made = [target.id];

  const as = (u) => {
    const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: u.id }, SECRET, { expiresIn: '5m' }) };
    return async (m, p, b) => {
      const r = await fetch(U + p, { method: m, headers: H, body: b && JSON.stringify(b) });
      const body = await r.json().catch(() => null);
      return { status: r.status, body };
    };
  };
  const V = as(viewer), S = as(staff);

  try {
    console.log('── VIEWER อ่านได้');
    check('GET /persons', (await V('GET', '/persons')).status, 200);
    check(`GET /persons/${target.id}`, (await V('GET', `/persons/${target.id}`)).status, 200);
    check('GET /dashboard/stats', (await V('GET', '/dashboard/stats')).status, 200);
    check('GET /organizations', (await V('GET', '/organizations')).status, 200);
    check('GET /batches', (await V('GET', '/batches')).status, 200);
    check('GET /auth/me', (await V('GET', '/auth/me')).status, 200);

    console.log('── VIEWER เขียนไม่ได้');
    check('POST /persons', (await V('POST', '/persons', { fullName: 'แอบเพิ่ม', gender: 'MALE', thaiId: '9999999999971' })).status, 403);
    check('POST /persons/import', (await V('POST', '/persons/import', { persons: [{ fullName: 'แอบนำเข้า' }] })).status, 403);
    check(`PUT /persons/${target.id}`, (await V('PUT', `/persons/${target.id}`, { fullName: 'แอบแก้', gender: 'MALE' })).status, 403);
    check(`POST /persons/${target.id}/skills`, (await V('POST', `/persons/${target.id}/skills`, { skillName: 'x', skillLevel: 'BEGINNER' })).status, 403);
    check(`POST /persons/${target.id}/followup`, (await V('POST', `/persons/${target.id}/followup`, { followUpDate: '2026-10-14', employmentStatus: 'EMPLOYED' })).status, 403);
    check(`PUT /organizations/${org.id}`, (await V('PUT', `/organizations/${org.id}`, { orgName: 'แอบแก้' })).status, 403);
    check('POST /batches', (await V('POST', '/batches', { batchNumber: 99, year: 2569, courseName: 'x' })).status, 403);
    check(`DELETE /persons/${target.id}`, (await V('DELETE', `/persons/${target.id}`)).status, 403);
    const blocked = await V('DELETE', `/organizations/${org.id}`);
    check(`DELETE /organizations/${org.id}`, blocked.status, 403);
    console.log('      ข้อความ:', blocked.body?.error);

    console.log('── ข้อมูลต้องไม่เปลี่ยน');
    const after = await prisma.person.findUnique({ where: { id: target.id }, include: { skills: true, followUps: true } });
    check('คนเป้ายังอยู่ ชื่อเดิม', after?.fullName, 'เป้าทดสอบ');
    check('ไม่มีทักษะ/ติดตามผลงอกมา', after.skills.length + after.followUps.length, 0);
    check('ไม่มีคนถูกแอบเพิ่ม', await prisma.person.count({ where: { fullName: { in: ['แอบเพิ่ม', 'แอบนำเข้า'] } } }), 0);
    check('องค์กรยังอยู่ ชื่อเดิม', (await prisma.organization.findUnique({ where: { id: org.id } }))?.orgName, 'องค์กรทดสอบ');
    check('ไม่มีรุ่น 99 งอกมา', await prisma.trainingBatch.count({ where: { batchNumber: 99, year: 2569 } }), 0);

    console.log('── STAFF ยังทำงานได้ปกติ');
    const created = await S('POST', '/persons', { fullName: 'staff เพิ่ม', gender: 'FEMALE', thaiId: '9999999999972' });
    check('STAFF POST /persons', created.status, 201);
    if (created.body?.id) made.push(created.body.id);
    check(`STAFF PUT /persons/${target.id}`, (await S('PUT', `/persons/${target.id}`, { fullName: 'เป้าทดสอบ2', gender: 'MALE' })).status, 200);
    check(`STAFF DELETE /persons/${created.body?.id}`, (await S('DELETE', `/persons/${created.body?.id}`)).status, 200);
    check('STAFF ยังเข้า /users ไม่ได้ (เดิม)', (await S('GET', '/users')).status, 403);

    await new Promise(r => setTimeout(r, 400));
    const logs = await prisma.auditLog.findMany({ where: { id: { gt: startAudit } } });
    check('VIEWER ที่โดนกันไม่ถูกบันทึกว่าแก้ข้อมูล', logs.filter(l => l.userId === viewer.id).length, 0);
    check('STAFF ถูกบันทึก 3 รายการ', logs.filter(l => l.userId === staff.id).length, 3);
  } finally {
    await prisma.person.deleteMany({ where: { id: { in: made } } });
    await prisma.person.deleteMany({ where: { thaiId: { in: ['9999999999971', '9999999999972'] } } });
    await prisma.organization.delete({ where: { id: org.id } }).catch(() => {});
    await prisma.trainingBatch.deleteMany({ where: { batchNumber: 99, year: 2569 } });
    await prisma.user.deleteMany({ where: { id: { in: [viewer.id, staff.id] } } });
    await prisma.auditLog.deleteMany({ where: { id: { gt: startAudit } } });
    console.log(`\nสรุป: ผ่าน ${pass} / ไม่ผ่าน ${fail} — ลบข้อมูลทดสอบแล้ว`);
    await prisma.$disconnect();
    process.exit(fail ? 1 : 0);
  }
})().catch((e) => { console.error(e); process.exit(1); });
