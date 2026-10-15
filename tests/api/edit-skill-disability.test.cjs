// แก้ไขทักษะ + ข้อมูลความพิการผ่าน API (เดิมมีแค่เพิ่ม/ลบ): แก้ได้ · ช่องบังคับ · ประเภทความพิการห้ามซ้ำ
// · แก้รายการของคนอื่นผ่าน URL ไม่ได้ · ผู้ดูข้อมูลแก้ไม่ได้ · บันทึกลงประวัติการใช้งาน
const { prisma, jwt, API, SECRET, eq, summary, sleep } = require('../lib.cjs');

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const viewer = await prisma.user.findFirst({ where: { role: 'VIEWER', isActive: true } });
  const types = await prisma.disabilityType.findMany({ orderBy: { id: 'asc' } });
  const A = await prisma.person.create({ data: { fullName: 'นาย ทดสอบแก้ ทักษะเอ', gender: 'MALE', thaiId: '9999999940001' } });
  const Bp = await prisma.person.create({ data: { fullName: 'นาง ทดสอบแก้ ทักษะบี', gender: 'FEMALE', thaiId: '9999999940002' } });
  const skA = await prisma.skill.create({ data: { personId: A.id, skillName: 'Excel', skillLevel: 'BEGINNER' } });
  const skB = await prisma.skill.create({ data: { personId: Bp.id, skillName: 'Word', skillLevel: 'BEGINNER' } });
  const d1 = await prisma.disabilityInfo.create({ data: { personId: A.id, disabilityTypeId: types[0].id, disabilityLevel: 'ระดับ 1' } });
  await prisma.disabilityInfo.create({ data: { personId: A.id, disabilityTypeId: types[1].id } });
  const dB = await prisma.disabilityInfo.create({ data: { personId: Bp.id, disabilityTypeId: types[0].id } });
  const startAudit = ((await prisma.auditLog.aggregate({ _max: { id: true } }))._max.id) || 0;

  const tok = (u) => jwt.sign({ id: u.id }, SECRET, { expiresIn: '5m' });
  const call = async (m, p, body, user = admin) => {
    const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok(user) }, body: body && JSON.stringify(body) });
    return [r.status, await r.json().catch(() => null)];
  };
  try {
    console.log('── ทักษะ');
    let [s, b] = await call('PUT', `/persons/${A.id}/skills/${skA.id}`, { skillName: '  Excel ขั้นสูง ', skillLevel: 'ADVANCED' });
    eq('แก้ชื่อ + ระดับ → 200 (ตัดช่องว่างหน้าหลัง)', [s, b.skillName, b.skillLevel], [200, 'Excel ขั้นสูง', 'ADVANCED']);
    eq('ฐานข้อมูลเปลี่ยนจริง + ไม่ได้เพิ่มรายการใหม่', [(await prisma.skill.findUnique({ where: { id: skA.id } })).skillName, await prisma.skill.count({ where: { personId: A.id } })], ['Excel ขั้นสูง', 1]);
    eq('ชื่อว่าง → 400', await call('PUT', `/persons/${A.id}/skills/${skA.id}`, { skillName: '   ', skillLevel: 'ADVANCED' }), [400, { error: 'กรุณากรอกชื่อทักษะ' }]);
    eq('ระดับมั่ว → 400', await call('PUT', `/persons/${A.id}/skills/${skA.id}`, { skillName: 'x', skillLevel: 'GOD' }), [400, { error: 'กรุณาเลือกระดับทักษะ' }]);
    eq('เพิ่มทักษะชื่อว่าง → 400 (เดิมบันทึกได้)', (await call('POST', `/persons/${A.id}/skills`, { skillName: '', skillLevel: 'BEGINNER' }))[0], 400);
    eq('แก้ทักษะของคนอื่นผ่าน URL ของ A → 404 + ของ B ไม่เปลี่ยน', [(await call('PUT', `/persons/${A.id}/skills/${skB.id}`, { skillName: 'แฮก', skillLevel: 'ADVANCED' }))[0], (await prisma.skill.findUnique({ where: { id: skB.id } })).skillName], [404, 'Word']);
    eq('แนบ personId มาเพื่อย้ายเจ้าของ → ไม่ทะลุ', [(await call('PUT', `/persons/${A.id}/skills/${skA.id}`, { skillName: 'Excel ขั้นสูง', skillLevel: 'ADVANCED', personId: Bp.id }))[0], (await prisma.skill.findUnique({ where: { id: skA.id } })).personId], [200, A.id]);

    console.log('── ข้อมูลความพิการ');
    [s, b] = await call('PUT', `/persons/${A.id}/disability/${d1.id}`, { disabilityTypeId: String(types[0].id), disabilityLevel: 'ระดับ 3', assistiveDevice: 'ไม้เท้า' });
    eq('แก้ระดับ + อุปกรณ์ (ประเภทเดิม) → 200', [s, b.disabilityLevel, b.assistiveDevice, b.disabilityType?.typeName], [200, 'ระดับ 3', 'ไม้เท้า', types[0].typeName]);
    [s, b] = await call('PUT', `/persons/${A.id}/disability/${d1.id}`, { disabilityTypeId: types[2].id, disabilityLevel: 'ระดับ 3' });
    eq('เปลี่ยนเป็นประเภทที่ยังไม่มี → 200', [s, b.disabilityTypeId], [200, types[2].id]);
    eq('เปลี่ยนเป็นประเภทที่คนนี้มีอยู่แล้ว → 400', await call('PUT', `/persons/${A.id}/disability/${d1.id}`, { disabilityTypeId: types[1].id }), [400, { error: 'คนนี้มีประเภทความพิการนี้อยู่แล้ว' }]);
    eq('ไม่เลือกประเภท → 400', (await call('PUT', `/persons/${A.id}/disability/${d1.id}`, { disabilityLevel: 'x' }))[0], 400);
    eq('ประเภทที่ไม่มีในระบบ → 400', await call('PUT', `/persons/${A.id}/disability/${d1.id}`, { disabilityTypeId: 99999 }), [400, { error: 'ไม่พบประเภทความพิการนี้ในระบบ' }]);
    eq('แก้ความพิการของคนอื่นผ่าน URL ของ A → 404', (await call('PUT', `/persons/${A.id}/disability/${dB.id}`, { disabilityTypeId: types[3].id }))[0], 404);
    eq('ของ B ไม่เปลี่ยน', (await prisma.disabilityInfo.findUnique({ where: { id: dB.id } })).disabilityTypeId, types[0].id);

    console.log('── สิทธิ์ + ประวัติ');
    eq('ผู้ดูข้อมูลแก้ทักษะ → 403', (await call('PUT', `/persons/${A.id}/skills/${skA.id}`, { skillName: 'x', skillLevel: 'BEGINNER' }, viewer))[0], 403);
    eq('ผู้ดูข้อมูลแก้ความพิการ → 403', (await call('PUT', `/persons/${A.id}/disability/${d1.id}`, { disabilityTypeId: types[0].id }, viewer))[0], 403);
    await sleep(400);
    const logs = await prisma.auditLog.findMany({ where: { id: { gt: startAudit }, action: 'UPDATE' }, orderBy: { id: 'asc' } });
    eq('บันทึกการแก้ลงประวัติ (ทักษะ + ความพิการ) ผูกกับคนถูกคน', [...new Set(logs.map((l) => `${l.entity}:${l.personId}`))].sort(), [`disability:${A.id}`, `skills:${A.id}`]);
  } catch (e) { console.log('ERROR', e.message); eq('สคริปต์รันจบ', false, true); }
  await prisma.person.deleteMany({ where: { id: { in: [A.id, Bp.id] } } });
  await prisma.auditLog.deleteMany({ where: { id: { gt: startAudit } } });
  await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
