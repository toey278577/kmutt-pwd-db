// ข้อ 15: แก้/ลบรายการย่อยผ่าน URL ของคนอื่นต้องไม่ได้ + แนบ personId มาย้ายรายการไม่ได้
const path = require('path');
const fs = require('fs');
const { prisma, eq, summary, API, SECRET, jwt, UPLOAD_DIR } = require('../lib.cjs');
(async () => {
  for (let i = 0; i < 30; i++) { try { await fetch(API + '/ping'); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: admin.id }, SECRET, { expiresIn: '5m' }) };
  const call = async (m, p, body) => { const r = await fetch(API + p, { method: m, headers: H, body: body && JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const A = await prisma.person.create({ data: { fullName: 'ทดสอบเจ้าของ ก', gender: 'MALE', thaiId: '9999999920001' } });
  const Bp = await prisma.person.create({ data: { fullName: 'ทดสอบเจ้าของ ข', gender: 'FEMALE', thaiId: '9999999920002' } });
  const batch = await prisma.trainingBatch.create({ data: { batchNumber: 995, year: 2569, courseName: 'x' } });
  const org = await prisma.organization.create({ data: { orgName: 'ทดสอบเจ้าของ องค์กร' } });
  const dtype = await prisma.disabilityType.findFirst();
  const startAudit = (await prisma.auditLog.aggregate({ _max: { id: true } }))._max.id || 0;
  // รายการทั้งหมดเป็นของคน ข
  const rec = {
    training: await prisma.trainingRecord.create({ data: { personId: Bp.id, courseName: 'ของ ข' } }),
    workexp: await prisma.workExperience.create({ data: { personId: Bp.id, organizationName: 'ของ ข' } }),
    followup: await prisma.followUp.create({ data: { personId: Bp.id, followUpDate: new Date('2026-05-01'), employmentStatus: 'EMPLOYED' } }),
    skills: await prisma.skill.create({ data: { personId: Bp.id, skillName: 'ของ ข', skillLevel: 'BEGINNER' } }),
    personorg: await prisma.personOrganization.create({ data: { personId: Bp.id, orgId: org.id, roleType: 'OTHER' } }),
    disability: await prisma.disabilityInfo.create({ data: { personId: Bp.id, disabilityTypeId: dtype.id } }),
    assessments: await prisma.personAssessment.create({ data: { personId: Bp.id, batchId: batch.id, preTestScore: 10 } }),
  };
  const photoRes = await call('POST', `/persons/${Bp.id}/photos`, { filePath: 'data:image/jpeg;base64,' + Buffer.alloc(500, 1).toString('base64'), photoType: 'profile' });
  rec.photos = { id: photoRes.body.id };
  const model = { training: 'trainingRecord', workexp: 'workExperience', followup: 'followUp', skills: 'skill', personorg: 'personOrganization', disability: 'disabilityInfo', assessments: 'personAssessment', photos: 'personPhoto' };
  const putBody = { training: { courseName: 'แก้ผ่านคนอื่น' }, workexp: { organizationName: 'แก้ผ่านคนอื่น' }, followup: { followUpDate: '2026-06-01', employmentStatus: 'UNEMPLOYED' }, personorg: { orgId: org.id, roleType: 'EMPLOYMENT' } };
  try {
    console.log('── ใช้ URL ของคน ก ไปยุ่งกับรายการของคน ข → ต้องไม่ได้');
    for (const [k, r] of Object.entries(rec)) {
      if (putBody[k]) {
        const res = await call('PUT', `/persons/${A.id}/${k}/${r.id}`, putBody[k]);
        eq(`แก้ ${k} ผ่านคนอื่น → 404`, res.status, 404);
      }
      const del = await call('DELETE', `/persons/${A.id}/${k}/${r.id}`);
      eq(`ลบ ${k} ผ่านคนอื่น → 404 + รายการยังอยู่`, [del.status, !!(await prisma[model[k]].findUnique({ where: { id: r.id } }))], [404, true]);
    }
    eq('ข้อความไทย', (await call('DELETE', `/persons/${A.id}/training/${rec.training.id}`)).body?.error, 'ไม่พบรายการนี้ อาจถูกลบไปแล้ว ลองรีเฟรชหน้า');
    eq('ไฟล์รูปของ ข ยังอยู่', fs.existsSync(path.join(UPLOAD_DIR, path.basename(photoRes.body.filePath))), true);

    console.log('── แนบ personId มาเพื่อย้ายรายการไปคนอื่น → ไม่ได้');
    const mv = await call('PUT', `/persons/${Bp.id}/training/${rec.training.id}`, { courseName: 'แก้ถูกคน', personId: A.id, id: 999999 });
    const tr = await prisma.trainingRecord.findUnique({ where: { id: rec.training.id } });
    eq('แก้ได้ แต่รายการยังเป็นของ ข เลขเดิม', [mv.status, tr.courseName, tr.personId], [200, 'แก้ถูกคน', Bp.id]);
    const sk = await call('POST', `/persons/${Bp.id}/skills`, { skillName: 'ใหม่', skillLevel: 'ADVANCED', personId: A.id });
    eq('เพิ่มทักษะแนบ personId คนอื่น → ยังเป็นของ ข', (await prisma.skill.findUnique({ where: { id: sk.body.id } })).personId, Bp.id);
    const fu = await call('PUT', `/persons/${Bp.id}/followup/${rec.followup.id}`, { followUpDate: '2026-07-01', employmentStatus: 'STUDYING', personId: A.id, jobType: 'ทดลอง' });
    eq('แก้ติดตามผลแนบ personId → ยังเป็นของ ข', [fu.status, (await prisma.followUp.findUnique({ where: { id: rec.followup.id } })).personId], [200, Bp.id]);

    console.log('── เจ้าของตัวจริงยังทำได้ปกติ');
    for (const [k, r] of Object.entries(rec)) {
      const del = await call('DELETE', `/persons/${Bp.id}/${k}/${r.id}`);
      eq(`ลบ ${k} ของตัวเอง → 200`, del.status, 200);
    }
    const logs = await prisma.auditLog.findMany({ where: { id: { gt: startAudit } } });
    eq('ประวัติการใช้งาน: ไม่มีรายการไหนบันทึกว่าแตะคน ก', logs.filter((l) => l.personId === A.id).length, 0);
  } finally {
    await prisma.person.deleteMany({ where: { id: { in: [A.id, Bp.id] } } });
    await prisma.trainingBatch.delete({ where: { id: batch.id } });
    await prisma.organization.delete({ where: { id: org.id } });
    await prisma.auditLog.deleteMany({ where: { id: { gt: startAudit } } });
    const f = summary(); await prisma.$disconnect(); process.exit(f ? 1 : 0);
  }
})().catch((e) => { console.error(e); process.exit(1); });
