// จัดการประเภทความพิการ /api/disability-types: อ่านได้ทุกคน · เพิ่ม/แก้/ลบ เฉพาะแอดมิน · ชื่อห้ามว่าง/ซ้ำ/ยาวเกิน
// · ลบประเภทที่มีคนใช้ไม่ได้ · ลงประวัติการใช้งาน · รัน seed ซ้ำแล้วประเภทที่ลบไม่กลับมา
const { execFileSync } = require('child_process');
const { prisma, jwt, API, SECRET, B, eq, summary, sleep } = require('../lib.cjs');

(async () => {
  const [admin, staff, viewer] = await Promise.all(['ADMIN', 'STAFF', 'VIEWER'].map((role) => prisma.user.findFirst({ where: { role, isActive: true } })));
  const call = async (user, m, p, body) => {
    const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: user.id }, SECRET, { expiresIn: '5m' }) }, body: body && JSON.stringify(body) });
    return [r.status, await r.json().catch(() => null)];
  };
  const startAudit = ((await prisma.auditLog.aggregate({ _max: { id: true } }))._max.id) || 0;
  const created = [];
  try {
    console.log('── อ่าน / สิทธิ์');
    const [s0, list] = await call(staff, 'GET', '/disability-types');
    const used0 = await prisma.disabilityInfo.count({ where: { disabilityTypeId: list[0].id } });
    eq('เจ้าหน้าที่อ่านได้ + มีจำนวนคนที่ใช้', [s0, list.length, list[0]._count.disabilityInfos], [200, await prisma.disabilityType.count(), used0]);
    eq('เจ้าหน้าที่เพิ่มไม่ได้', (await call(staff, 'POST', '/disability-types', { typeName: 'x' }))[0], 403);
    eq('ผู้ดูข้อมูลเพิ่มไม่ได้', (await call(viewer, 'POST', '/disability-types', { typeName: 'x' }))[0], 403);

    console.log('── เพิ่ม');
    const [s1, t1] = await call(admin, 'POST', '/disability-types', { typeName: '  ความพิการทาง  การพูด ' });
    created.push(t1?.id);
    eq('แอดมินเพิ่มได้ (ตัดช่องว่างซ้อน)', [s1, t1?.typeName], [201, 'ความพิการทาง การพูด']);
    eq('ชื่อซ้ำ (ต่างแค่เว้นวรรค/ตัวพิมพ์) → 400', await call(admin, 'POST', '/disability-types', { typeName: 'ความพิการทางการพูด' }), [400, { error: 'มีประเภทความพิการชื่อนี้อยู่แล้ว' }]);
    eq('ชื่อว่าง → 400', await call(admin, 'POST', '/disability-types', { typeName: '   ' }), [400, { error: 'กรุณากรอกชื่อประเภทความพิการ' }]);
    eq('ยาวเกิน 100 → 400', (await call(admin, 'POST', '/disability-types', { typeName: 'ก'.repeat(101) }))[0], 400);

    console.log('── แก้ชื่อ');
    eq('แก้ชื่อ → 200', (await call(admin, 'PUT', `/disability-types/${t1.id}`, { typeName: 'ความพิการทางการพูดและภาษา' }))[1]?.typeName, 'ความพิการทางการพูดและภาษา');
    eq('แก้เป็นชื่อที่ประเภทอื่นใช้อยู่ → 400', (await call(admin, 'PUT', `/disability-types/${t1.id}`, { typeName: list[0].typeName }))[0], 400);
    eq('แก้เป็นชื่อเดิมของตัวเอง → ได้', (await call(admin, 'PUT', `/disability-types/${t1.id}`, { typeName: 'ความพิการทางการพูดและภาษา' }))[0], 200);
    eq('รายการที่ฟอร์มใช้ (endpoint เดิม) เห็นชื่อใหม่', (await call(staff, 'GET', '/persons/disability-types'))[1].some((t) => t.typeName === 'ความพิการทางการพูดและภาษา'), true);
    eq('ไม่มี id นี้ / id มั่ว → 404', [(await call(admin, 'PUT', '/disability-types/99999', { typeName: 'y' }))[0], (await call(admin, 'DELETE', '/disability-types/abc'))[0]], [404, 404]);

    console.log('── ลบ');
    const [sd, bd] = await call(admin, 'DELETE', `/disability-types/${list[0].id}`);
    eq(`ประเภทที่มีคนใช้ (${used0} คน) → ลบไม่ได้ บอกจำนวน`, [sd, bd?.error?.includes(`${used0} คน`), !!(await prisma.disabilityType.findUnique({ where: { id: list[0].id } }))], [400, true, true]);
    eq('ประเภทที่ยังไม่มีใครใช้ → ลบได้', [(await call(admin, 'DELETE', `/disability-types/${t1.id}`))[0], await prisma.disabilityType.count({ where: { id: t1.id } })], [200, 0]);
    created.length = 0;

    console.log('── ประวัติ + seed');
    await sleep(500);
    const logs = await prisma.auditLog.findMany({ where: { id: { gt: startAudit }, entity: 'disabilityType' }, orderBy: { id: 'asc' } });
    eq('ลงประวัติ เพิ่ม/แก้/ลบ พร้อมชื่อ', logs.map((l) => `${l.action}:${l.label}`), ['CREATE:ความพิการทาง การพูด', 'UPDATE:ความพิการทางการพูดและภาษา', 'UPDATE:ความพิการทางการพูดและภาษา', 'DELETE:ความพิการทางการพูดและภาษา']);
    const unused = (await call(admin, 'GET', '/disability-types'))[1].filter((t) => t._count.disabilityInfos === 0).at(-1);
    await call(admin, 'DELETE', `/disability-types/${unused.id}`);
    const before = await prisma.disabilityType.count();
    execFileSync(process.execPath, ['prisma/seed.js'], { cwd: B, env: process.env, encoding: 'utf8' });
    eq('รัน seed ซ้ำ → ประเภทที่แอดมินลบไม่กลับมา', [await prisma.disabilityType.count(), await prisma.disabilityType.count({ where: { typeName: unused.typeName } })], [before, 0]);
    await prisma.disabilityType.create({ data: { typeName: unused.typeName } });   // คืนให้เทสต์อื่น
  } catch (e) { console.log('ERROR', e.message); eq('สคริปต์รันจบ', false, true); }
  for (const id of created.filter(Boolean)) await prisma.disabilityType.deleteMany({ where: { id } });
  await prisma.auditLog.deleteMany({ where: { id: { gt: startAudit } } });
  await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
