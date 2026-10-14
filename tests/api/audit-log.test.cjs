// ประวัติการใช้งาน (audit log): เพิ่ม/แก้/ลบ + ล็อกอินพลาด ถูกบันทึกครบ · คำขอที่ไม่สำเร็จไม่บันทึก · ตัวกรอง · เฉพาะแอดมิน
const { prisma, jwt, API: U, SECRET, eq, summary, sleep } = require('../lib.cjs');

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const staff = await prisma.user.findFirst({ where: { role: { not: 'ADMIN' }, isActive: true } });
  const startId = ((await prisma.auditLog.aggregate({ _max: { id: true } }))._max.id) || 0;
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: admin.id }, SECRET, { expiresIn: '5m' }) };
  const call = async (m, p, b) => { const r = await fetch(U + p, { method: m, headers: H, body: b && JSON.stringify(b) }); return [r.status, await r.json().catch(() => null)]; };
  let p;
  try {
    eq('ล็อกอินผิด → 401', (await fetch(U + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'nobody@x.com', password: 'x' }) })).status, 401);
    const [s1, created] = await call('POST', '/persons', { thaiId: '9999999999991', fullName: 'ทดสอบ ออดิต', gender: 'MALE' });
    p = created;
    eq('เพิ่มคน', s1, 201);
    eq('แก้คน', (await call('PUT', `/persons/${p.id}`, { fullName: 'ทดสอบ ออดิต2', gender: 'MALE' }))[0], 200);
    const [s3, sk] = await call('POST', `/persons/${p.id}/skills`, { skillName: 'Excel', skillLevel: 'BEGINNER' });
    eq('เพิ่ม/ลบทักษะ', [s3, (await call('DELETE', `/persons/${p.id}/skills/${sk.id}`))[0]], [201, 200]);
    eq('แก้คนที่ไม่มีอยู่ → ไม่สำเร็จ (ต้องไม่ถูกบันทึก)', (await call('PUT', '/persons/999999', { fullName: 'x' }))[0] >= 400, true);
    eq('ลบคน', (await call('DELETE', `/persons/${p.id}`))[0], 200);
    await sleep(500);   // บันทึกหลังส่งคำตอบแล้ว

    const rows = (await prisma.auditLog.findMany({ where: { id: { gt: startId } }, orderBy: { id: 'asc' } }))
      .map((l) => [l.action, l.entity, l.label]);
    eq('บันทึกครบตามลำดับ (คำขอที่พังไม่บันทึก)', rows, [
      ['LOGIN_FAILED', 'auth', 'nobody@x.com'],
      ['CREATE', 'person', 'ทดสอบ ออดิต'],
      ['UPDATE', 'person', 'ทดสอบ ออดิต2'],
      ['CREATE', 'skills', 'ทดสอบ ออดิต2'],
      ['DELETE', 'skills', 'ทดสอบ ออดิต2'],
      ['DELETE', 'person', 'ทดสอบ ออดิต2'],
    ]);
    const last = await prisma.auditLog.findFirst({ where: { id: { gt: startId }, action: 'DELETE', entity: 'person' } });
    eq('รู้ว่าใครทำ + จาก IP ไหน + ผูกกับคนที่ถูกลบ', [last.userName, !!last.ip, last.personId], [admin.name, true, p.id]);

    eq('ค้นด้วยชื่อ', (await call('GET', '/audit-logs?q=' + encodeURIComponent('ออดิต')))[1].total, 5);
    eq('กรองการลบของคนนี้', (await call('GET', `/audit-logs?action=DELETE&personId=${p.id}`))[1].total, 2);
    const vt = jwt.sign({ id: staff.id }, SECRET);
    eq('ไม่ใช่แอดมิน → 403', (await fetch(U + '/audit-logs', { headers: { Authorization: 'Bearer ' + vt } })).status, 403);
  } catch (e) { console.log('ERROR', e.message); eq('สคริปต์รันจบ', false, true); }
  await prisma.auditLog.deleteMany({ where: { id: { gt: startId } } });
  if (p?.id) await prisma.person.deleteMany({ where: { id: p.id } });
  await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
