// ปลอมตั๋วเข้าระบบด้วยรหัสลับเก่าที่เคยเขียนไว้ในโค้ด (ใครเห็นโค้ดก็รู้) → ต้องเข้าไม่ได้
// ตั๋วที่ระบบออกให้ตอนล็อกอินจริงยังใช้ได้ปกติ
const { prisma, jwt, API, SECRET, eq, summary } = require('../lib.cjs');

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const get = async (p, token) => (await fetch(API + p, { headers: { Authorization: 'Bearer ' + token } })).status;
  try {
    const forged = jwt.sign({ id: admin.id, email: admin.email, role: 'ADMIN' }, 'kmutt_pwd_secret_2024', { expiresIn: '1h' });
    eq('ตั๋วปลอม (รหัสเก่าในโค้ด) → เข้าหน้าผู้ใช้ไม่ได้', await get('/users', forged), 401);
    eq('ตั๋วปลอม → อ่านรายชื่อคนพิการไม่ได้', await get('/persons', forged), 401);
    eq('ตั๋วปลอมด้วยรหัสมั่ว → เข้าไม่ได้', await get('/users', jwt.sign({ id: admin.id }, 'guess')), 401);
    eq('ตั๋วจริง (รหัสลับของระบบ) → เข้าได้', await get('/users', jwt.sign({ id: admin.id }, SECRET, { expiresIn: '5m' })), 200);
    const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@kmutt.ac.th', password: 'admin123' }) });
    const { token } = await r.json();
    eq('ล็อกอินจริง → ได้ตั๋วที่ใช้งานได้', [r.status, await get('/auth/me', token)], [200, 200]);
  } catch (e) { console.log('ERROR', e.message); eq('สคริปต์รันจบ', false, true); }
  await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
