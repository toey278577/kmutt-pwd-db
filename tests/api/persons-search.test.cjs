// UX ข้อ 5+6 (หลังบ้าน): รายชื่อมีผลติดตามล่าสุด + ค้นหาด้วยชื่อเล่น/เบอร์/เลขบัตร
const { prisma, eq, summary, API, SECRET, jwt } = require('../lib.cjs');
(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const H = { Authorization: 'Bearer ' + jwt.sign({ id: admin.id }, SECRET) };
  const get = async (q) => (await (await fetch(`${API}/persons${q}`, { headers: H })).json());
  const demo = await prisma.person.findMany({ where: { thaiId: { startsWith: '88888888' } }, orderBy: { id: 'asc' } });
  const [a, b2] = demo;
  await prisma.followUp.deleteMany({ where: { personId: { in: [a.id, b2.id] } } });
  // a: ติดตาม 2 ครั้ง ล่าสุด = มีงานทำ · วันเดียวกัน 2 รายการ ต้องเอาที่บันทึกทีหลัง
  await prisma.followUp.create({ data: { personId: a.id, followUpDate: new Date('2026-08-01'), employmentStatus: 'UNEMPLOYED' } });
  await prisma.followUp.create({ data: { personId: a.id, followUpDate: new Date('2026-10-01'), employmentStatus: 'STUDYING' } });
  await prisma.followUp.create({ data: { personId: a.id, followUpDate: new Date('2026-10-01'), employmentStatus: 'EMPLOYED' } });
  await prisma.followUp.create({ data: { personId: b2.id, followUpDate: new Date('2026-09-01'), employmentStatus: 'UNEMPLOYED' } });

  const all = await get('');
  const row = (id) => all.find((p) => p.id === id);
  eq('ผลติดตามล่าสุด (วันเดียวกันเอาอันหลัง)', row(a.id).followUps.map((f) => f.employmentStatus), ['EMPLOYED']);
  eq('ส่งมาแค่ 1 รายการต่อคน', row(a.id).followUps.length, 1);
  eq('คนที่สอง = ว่างงาน', row(b2.id).followUps[0].employmentStatus, 'UNEMPLOYED');
  const never = await prisma.person.findFirst({ where: { followUps: { none: {} } } });
  eq('คนที่ไม่เคยติดตาม = []', row(never.id).followUps, []);

  const ids = (r) => r.map((p) => p.id);
  eq('ค้นชื่อเล่น', ids(await get('?search=' + encodeURIComponent(a.nickname))).includes(a.id), true);
  eq('ค้นเบอร์มือถือ', ids(await get('?search=' + a.mobile)).includes(a.id), true);
  const dashed = a.mobile.slice(0, 3) + '-' + a.mobile.slice(3, 6) + '-' + a.mobile.slice(6);
  eq('ค้นเบอร์แบบมีขีด ' + dashed, ids(await get('?search=' + dashed)).includes(a.id), true);
  eq('ค้นเบอร์แบบมีเว้นวรรค', ids(await get('?search=' + encodeURIComponent(a.mobile.slice(0, 3) + ' ' + a.mobile.slice(3)))).includes(a.id), true);
  eq('ค้นเลขบัตรบางส่วน', ids(await get('?search=' + a.thaiId.slice(-5))), [a.id]);
  eq('ค้นชื่อ (ไม่สนตัวพิมพ์/เว้นวรรคหน้าหลัง)', ids(await get('?search=' + encodeURIComponent('  ' + a.fullName.split(' ')[1] + ' '))).includes(a.id), true);
  // ทุกแถวที่ค้นเจอด้วยเบอร์ ต้องมีเบอร์นั้นจริง (ข้อมูลเก่าในเครื่อง dev มีเบอร์ซ้ำกัน)
  const r = await get('?search=' + dashed);
  eq('ค้นเบอร์: ทุกแถวที่เจอมีเบอร์นั้นจริง', r.every((p) => p.mobile === a.mobile || p.phone === a.mobile), true);
  eq('ค้นด้วยคำที่ไม่มี → ว่าง', await get('?search=' + encodeURIComponent('ไม่มีใครชื่อนี้แน่นอน')), []);
  eq('ค้น + กรองรุ่นพร้อมกัน', ids(await get(`?search=${encodeURIComponent(a.nickname)}&batchId=${a.batchId}`)).includes(a.id), true);
  process.exit(summary() ? 1 : 0);
})();
