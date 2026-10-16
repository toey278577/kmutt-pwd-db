// ต่อเวลาเข้าระบบ GET /api/auth/refresh (แถบเตือน "ใช้งานต่อ" ก่อนหมด 8 ชม.)
// ตั๋วที่ยังใช้ได้ → ได้ตั๋วใหม่ 8 ชม. (ผู้ดูข้อมูลก็ต่อได้) · ตั๋วหมดอายุ/ไม่มี/บัญชีถูกปิด → 401 · ข้อมูลในตั๋วใหม่มาจาก DB
const { prisma, eq, summary, API, SECRET, jwt } = require('../lib.cjs');

(async () => {
  for (let i = 0; i < 30; i++) { try { await fetch(API + '/ping'); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const staff = await prisma.user.findFirst({ where: { role: 'STAFF', isActive: true } });
  const viewer = await prisma.user.findFirst({ where: { role: 'VIEWER', isActive: true } });
  const refresh = async (token) => {
    const r = await fetch(API + '/auth/refresh', { headers: token ? { Authorization: 'Bearer ' + token } : {} });
    return { status: r.status, cache: r.headers.get('cache-control'), body: await r.json().catch(() => null) };
  };
  const hoursLeft = (t) => Math.round((jwt.decode(t).exp * 1000 - Date.now()) / 3600000 * 10) / 10;
  try {
    let r = await refresh(jwt.sign({ id: staff.id }, SECRET, { expiresIn: '5m' }));
    eq('เจ้าหน้าที่ ตั๋วเหลือ 5 นาที → ได้ตั๋วใหม่ 8 ชม. + ไม่ให้เก็บแคช', [r.status, hoursLeft(r.body.token), r.cache], [200, 8, 'no-store']);
    eq('ตั๋วใหม่ใช้งานได้จริง + ข้อมูลผู้ใช้มาจาก DB', [
      (await fetch(API + '/auth/me', { headers: { Authorization: 'Bearer ' + r.body.token } })).status,
      r.body.user, jwt.decode(r.body.token).role,
    ], [200, { id: staff.id, name: staff.name, email: staff.email, role: 'STAFF' }, 'STAFF']);

    r = await refresh(jwt.sign({ id: viewer.id }, SECRET, { expiresIn: '5m' }));
    eq('ผู้ดูข้อมูลก็ต่อเวลาได้ (ไม่โดนกันแบบคำขอเขียน)', [r.status, r.body.user?.role], [200, 'VIEWER']);

    r = await refresh(jwt.sign({ id: staff.id, exp: Math.floor(Date.now() / 1000) - 60 }, SECRET));
    eq('ตั๋วหมดอายุแล้ว → 401 (ต้องใส่รหัสผ่านใหม่)', r.status, 401);
    eq('ไม่มีตั๋ว → 401', (await refresh(null)).status, 401);
    eq('ตั๋วปลอม (รหัสลับผิด) → 401', (await refresh(jwt.sign({ id: staff.id }, 'wrong-secret', { expiresIn: '5m' }))).status, 401);

    await prisma.user.update({ where: { id: staff.id }, data: { isActive: false } });
    r = await refresh(jwt.sign({ id: staff.id }, SECRET, { expiresIn: '5m' }));
    eq('บัญชีถูกปิดระหว่างนั้น → 401 Account disabled (ต่อเวลาไม่ได้)', [r.status, r.body?.error], [401, 'Account disabled']);
  } catch (e) { console.log('ERROR', e.message); eq('สคริปต์รันจบ', false, true); }
  await prisma.user.update({ where: { id: staff.id }, data: { isActive: true } });
  await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
