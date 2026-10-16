// GET /api/data/incomplete — ใครข้อมูลยังไม่ครบ (หน้า "ข้อมูลยังไม่ครบ")
const { prisma, eq, summary, API, SECRET, jwt } = require('../lib.cjs');
const { CHECKS, missingFields } = require('../../backend/src/utils/incomplete');

(async () => {
  for (let i = 0; i < 30; i++) { try { await fetch(API + '/ping'); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const staff = await prisma.user.findFirst({ where: { role: 'STAFF', isActive: true } });
  const viewer = await prisma.user.findFirst({ where: { role: 'VIEWER', isActive: true } });
  const batch = await prisma.trainingBatch.findFirst();
  const type = await prisma.disabilityType.findFirst();
  const get = async (u) => {
    const r = await fetch(API + '/data/incomplete', { headers: u ? { Authorization: 'Bearer ' + jwt.sign({ id: u.id }, SECRET, { expiresIn: '5m' }) } : {} });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  const base = { gender: 'MALE', birthDate: new Date('1991-02-03'), province: 'นนทบุรี', educationLevel: 'ปริญญาตรี', mobile: '0812345678', batchId: batch.id };
  const made = [];
  const mk = async (fullName, data, withDisability = true) => {
    const p = await prisma.person.create({ data: { fullName, ...base, ...data } });
    if (withDisability) await prisma.disabilityInfo.create({ data: { personId: p.id, disabilityTypeId: type.id } });
    made.push(p.id); return p;
  };
  try {
    const many = await mk('ทดสอบตรวจ ขาดหลายช่อง', { gender: 'FEMALE', birthDate: null, province: null, educationLevel: null, mobile: null, batchId: null }, false);
    const phone = await mk('ทดสอบตรวจ ขาดเบอร์', { thaiId: '7777777700001', mobile: '  ', phone: '' });
    const badId = await mk('ทดสอบตรวจ บัตรไม่ครบ', { thaiId: '77777' });
    const dead = await mk('ทดสอบตรวจ เสียชีวิตไม่มีเบอร์', { thaiId: '7777777700003', mobile: null, lifeStatus: 'DECEASED' });
    const ok = await mk('ทดสอบตรวจ ครบทุกช่อง', { thaiId: '7777777700004' });

    const r = await get(staff);
    const by = Object.fromEntries((r.body?.items || []).map((i) => [i.id, i]));
    eq('เจ้าหน้าที่เรียกได้', r.status, 200);
    eq('ขาดหลายช่อง → ครบทุกช่องที่ขาด', by[many.id]?.missing, ['thaiId', 'phone', 'birthDate', 'province', 'education', 'batch', 'disability']);
    eq('ขาดเบอร์ (มีแต่เว้นวรรค) → เบอร์โทร · เลขบัตรไม่ครบ 13 หลัก → เลขบัตร', [by[phone.id]?.missing, by[badId.id]?.missing], [['phone'], ['thaiId']]);
    eq('เสียชีวิตไม่มีเบอร์ / ครบทุกช่อง → ไม่อยู่ในรายการ', [!!by[dead.id], !!by[ok.id]], [false, false]);
    eq('ส่งรุ่นมาด้วย (ไม่มีรุ่น = null)', [by[phone.id]?.batch, by[many.id]?.batch], [{ batchNumber: batch.batchNumber, year: batch.year }, null]);
    const ids = r.body.items.map((i) => i.id);
    eq('ขาดหลายช่องขึ้นก่อน', ids.indexOf(many.id) < ids.indexOf(phone.id), true);
    eq('ตัวเลขแต่ละช่อง = จำนวนคนที่ขาดช่องนั้นจริง', r.body.checks.map((c) => c.count), CHECKS.map((c) => r.body.items.filter((i) => i.missing.includes(c.key)).length));

    // ตรงกับการตรวจทั้งฐาน (ไม่ใช่แค่คนที่เทสต์นี้สร้าง)
    const all = await prisma.person.findMany({ include: { _count: { select: { disabilityInfos: true } } } });
    const expect = all.filter((p) => missingFields({ ...p, disabilityCount: p._count.disabilityInfos }).length > 0).length;
    eq('จำนวนคนที่ขาด + จำนวนทั้งหมด ตรงกับฐานข้อมูล', [r.body.items.length, r.body.total], [expect, all.length]);

    eq('ผู้ดูข้อมูลดูได้', (await get(viewer)).status, 200);
    eq('ไม่มีตั๋ว → 401', (await get(null)).status, 401);
  } catch (e) { console.log('ERROR', e.message); eq('สคริปต์รันจบ', false, true); }
  await prisma.disabilityInfo.deleteMany({ where: { personId: { in: made } } });
  await prisma.person.deleteMany({ where: { id: { in: made } } });
  await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
