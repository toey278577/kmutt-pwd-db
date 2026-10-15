// ตัวกรองรายชื่อ GET /api/persons: เพศ / จังหวัด / รุ่น / ประเภทความพิการ / สถานะงานล่าสุด — ใช้เดี่ยวและพร้อมกัน + ร่วมกับคำค้น
// คำตอบที่ถูกคำนวณจากฐานข้อมูลตรงๆ แล้วเทียบกับที่ API ส่งมา · ค่าตัวกรองมั่วต้องไม่ทำให้พัง
const { prisma, jwt, API, SECRET, eq, summary } = require('../lib.cjs');

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const H = { Authorization: 'Bearer ' + jwt.sign({ id: admin.id }, SECRET, { expiresIn: '5m' }) };
  const get = async (qs) => { const r = await fetch(`${API}/persons?${new URLSearchParams(qs)}`, { headers: H }); return [r.status, r.status === 200 ? (await r.json()).map((p) => p.id).sort((a, b) => a - b) : null]; };

  // ข้อมูลทุกคน + ผลติดตามล่าสุด (วันล่าสุด ถ้าวันเดียวกันเอาที่บันทึกทีหลัง)
  const all = await prisma.person.findMany({ include: { disabilityInfos: true, followUps: { orderBy: [{ followUpDate: 'desc' }, { id: 'desc' }], take: 1 } } });
  const ids = (fn) => all.filter(fn).map((p) => p.id).sort((a, b) => a - b);
  const latest = (p) => p.followUps[0]?.employmentStatus ?? 'NONE';
  const batch = await prisma.trainingBatch.findFirst({ where: { batchNumber: 813 } });
  const types = await prisma.disabilityType.findMany({ orderBy: { id: 'asc' } });

  try {
    eq('เพศหญิง', await get({ gender: 'FEMALE' }), [200, ids((p) => p.gender === 'FEMALE')]);
    eq('จังหวัด', await get({ province: 'กรุงเทพมหานคร' }), [200, ids((p) => p.province === 'กรุงเทพมหานคร')]);
    eq('รุ่น', await get({ batchId: batch.id }), [200, ids((p) => p.batchId === batch.id)]);
    eq('ประเภทความพิการ', await get({ disabilityTypeId: types[0].id }), [200, ids((p) => p.disabilityInfos.some((d) => d.disabilityTypeId === types[0].id))]);
    for (const emp of ['EMPLOYED', 'UNEMPLOYED', 'STUDYING', 'NONE']) {
      const want = ids((p) => latest(p) === emp);
      eq(`งานล่าสุด ${emp} (${want.length} คน)`, await get({ employment: emp }), [200, want]);
    }
    const combo = ids((p) => p.gender === 'FEMALE' && p.batchId === batch.id && latest(p) === 'UNEMPLOYED');
    eq(`หลายเงื่อนไขพร้อมกัน: หญิง + รุ่น 813 + ว่างงาน (${combo.length} คน)`, await get({ gender: 'FEMALE', batchId: batch.id, employment: 'UNEMPLOYED' }), [200, combo]);
    eq('ตัวกรองไม่ตรงใครเลย → ว่าง', await get({ gender: 'MALE', province: 'นนทบุรี' }), [200, ids((p) => p.gender === 'MALE' && p.province === 'นนทบุรี')]);
    const malee = all.find((p) => p.fullName.includes('มาลี'));
    eq('ร่วมกับคำค้น', await get({ search: 'มาลี', gender: 'FEMALE' }), [200, [malee.id]]);
    eq('ร่วมกับคำค้น แต่เพศไม่ตรง → ว่าง', await get({ search: 'มาลี', gender: 'MALE' }), [200, []]);

    console.log('── ค่ามั่ว (พิมพ์ URL เอง) ต้องไม่พัง');
    eq('เพศมั่ว → ไม่กรอง', await get({ gender: 'XYZ' }), [200, ids(() => true)]);
    eq('รุ่นไม่ใช่ตัวเลข → ไม่เจอใคร', await get({ batchId: 'abc' }), [200, []]);
    eq('ประเภทความพิการไม่ใช่ตัวเลข → ไม่เจอใคร', await get({ disabilityTypeId: '1;drop' }), [200, []]);
    eq('สถานะงานมั่ว → ไม่เจอใคร', await get({ employment: 'BOSS' }), [200, []]);
  } catch (e) { console.log('ERROR', e.message); eq('สคริปต์รันจบ', false, true); }
  await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
