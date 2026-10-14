// ข้อ 7-9: กันแอดมินทำร้ายบัญชีตัวเอง / รหัสผ่านอย่างน้อย 8 / อีเมลไม่สนตัวใหญ่-เล็ก
const path = require('path');
const { prisma, eq, summary, API, SECRET, jwt, B } = require('../lib.cjs');
const bcrypt = require(path.join(B, 'node_modules/bcryptjs'));

(async () => {
  for (let i = 0; i < 30; i++) { try { await fetch(API + '/ping'); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const made = [];
  const mkUser = async (data) => { const u = await prisma.user.create({ data: { password: await bcrypt.hash('oldpass1', 10), ...data } }); made.push(u.id); return u; };
  const me = await mkUser({ name: 'ทดสอบ แอดมินฉัน', email: 'me-admin@test.local', role: 'ADMIN' });
  const other = await mkUser({ name: 'ทดสอบ แอดมินอื่น', email: 'other-admin@test.local', role: 'ADMIN' });
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: me.id }, SECRET, { expiresIn: '5m' }) };
  const call = async (m, p, b) => { const r = await fetch(API + p, { method: m, headers: H, body: b && JSON.stringify(b) }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const login = async (email, password) => (await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).status;
  try {
    console.log('── ข้อ 7: แอดมินทำร้ายบัญชีตัวเองไม่ได้');
    let r = await call('PUT', `/users/${me.id}`, { role: 'VIEWER' });
    eq('ลดสิทธิ์ตัวเอง → 400 (เดิมทำได้)', [r.status, r.body?.error], [400, 'เปลี่ยนบทบาทของตัวเองไม่ได้']);
    r = await call('PUT', `/users/${me.id}`, { isActive: false });
    eq('ปิดบัญชีตัวเอง → 400', [r.status, r.body?.error], [400, 'ปิดบัญชีของตัวเองไม่ได้']);
    r = await call('DELETE', `/users/${me.id}`);
    eq('ลบบัญชีตัวเอง → 400', [r.status, r.body?.error], [400, 'ลบบัญชีของตัวเองไม่ได้']);
    eq('บัญชีตัวเองยังเป็น ADMIN ใช้งานได้', await prisma.user.findUnique({ where: { id: me.id }, select: { role: true, isActive: true } }), { role: 'ADMIN', isActive: true });
    r = await call('PUT', `/users/${me.id}`, { name: 'ทดสอบ แอดมินฉัน2', role: 'ADMIN', isActive: true });
    eq('แก้ชื่อตัวเอง (ส่งบทบาทเดิมมาด้วย) → ได้', [r.status, r.body?.name], [200, 'ทดสอบ แอดมินฉัน2']);
    r = await call('PUT', `/users/${other.id}`, { role: 'STAFF' });
    eq('ลดสิทธิ์แอดมินคนอื่น (มีแอดมินเหลือ) → ได้', [r.status, r.body?.role], [200, 'STAFF']);
    r = await call('PUT', `/users/${other.id}`, { role: 'BOSS' });
    eq('บทบาทมั่ว → 400', [r.status, r.body?.error], [400, 'บทบาทไม่ถูกต้อง']);
    r = await call('PUT', `/users/999999`, { name: 'x' });
    eq('แก้ผู้ใช้ที่ไม่มี → 404 ไทย', [r.status, r.body?.error], [404, 'ไม่พบผู้ใช้นี้ อาจถูกลบไปแล้ว']);

    console.log('── ข้อ 8: รหัสผ่านอย่างน้อย 8 ตัว');
    r = await call('POST', '/users', { name: 'ทดสอบ สั้น', email: 'short@test.local', password: '1' });
    eq('สร้างด้วยรหัส "1" → 400', [r.status, r.body?.error], [400, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร']);
    r = await call('POST', '/users', { name: 'ทดสอบ เจ็ด', email: 'seven@test.local', password: '1234567' });
    eq('รหัส 7 ตัว → 400', r.status, 400);
    r = await call('POST', '/users', { name: 'ทดสอบ แปด', email: 'eight@test.local', password: '12345678' });
    if (r.body?.id) made.push(r.body.id);
    eq('รหัส 8 ตัว → สร้างได้', r.status, 201);
    r = await call('PUT', `/users/${other.id}`, { password: 'abc' });
    eq('เปลี่ยนรหัสเป็น 3 ตัว → 400', r.status, 400);
    eq('บัญชีเดิมที่รหัสสั้นกว่านี้ยังล็อกอินได้ตามปกติ', await login('other-admin@test.local', 'oldpass1'), 200);

    console.log('── ข้อ 9: อีเมลไม่สนตัวใหญ่-เล็ก');
    r = await call('POST', '/users', { name: 'ทดสอบ ตัวใหญ่', email: '  Mixed.Case@Test.LOCAL ', password: 'password1' });
    if (r.body?.id) made.push(r.body.id);
    eq('สร้างแล้วเก็บเป็นตัวเล็ก ตัดช่องว่าง', r.body?.email, 'mixed.case@test.local');
    eq('ล็อกอินพิมพ์ตัวใหญ่ปนเว้นวรรค → เข้าได้', await login(' MIXED.case@test.local', 'password1'), 200);
    r = await call('POST', '/users', { name: 'ทดสอบ ซ้ำ', email: 'MIXED.CASE@test.local', password: 'password1' });
    eq('สร้างอีเมลซ้ำ (ต่างแค่ตัวใหญ่) → 400', [r.status, r.body?.error], [400, 'อีเมลนี้มีผู้ใช้แล้ว']);
    const legacy = await mkUser({ name: 'ทดสอบ บัญชีเก่า', email: 'Legacy.User@Test.Local', role: 'STAFF', password: await bcrypt.hash('legacypw', 10) });
    eq('บัญชีเก่าที่เก็บตัวใหญ่ ล็อกอินด้วยตัวเล็กได้', await login('legacy.user@test.local', 'legacypw'), 200);
    eq('รหัสผิด ยังเข้าไม่ได้', await login('legacy.user@test.local', 'wrongpass'), 401);
    r = await call('PUT', `/users/${legacy.id}`, { email: 'mixed.case@test.local' });
    eq('แก้อีเมลไปชนคนอื่น → 400', [r.status, r.body?.error], [400, 'อีเมลนี้มีผู้ใช้แล้ว']);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: made } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ userName: { startsWith: 'ทดสอบ' } }, { label: { contains: 'test.local' } }, { label: { startsWith: 'ทดสอบ' } }] } });
    const f = summary();
    await prisma.$disconnect();
    process.exit(f ? 1 : 0);
  }
})().catch((e) => { console.error(e); process.exit(1); });
