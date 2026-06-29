const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// แปลงคะแนนให้ปลอดภัย: ค่าว่าง/ไม่ใช่ตัวเลข → null, นอกช่วง → clamp อยู่ใน [0, max]
const score = (val, max) => {
  if (val == null || val === '') return null;
  const n = Number(val);
  if (Number.isNaN(n)) return null;
  return Math.min(Math.max(n, 0), max);
};

// GET /api/persons/:id/assessments — ดึงผลประเมินทุกรุ่นของคนนี้
router.get('/:id/assessments', async (req, res) => {
  try {
    const assessments = await prisma.personAssessment.findMany({
      where: { personId: Number(req.params.id) },
      include: { batch: true },
      orderBy: { batch: { year: 'desc' } },
    });
    res.json(assessments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/persons/:id/assessments — สร้างหรืออัปเดต (upsert) ผลประเมินตามรุ่น
router.post('/:id/assessments', async (req, res) => {
  try {
    const personId = Number(req.params.id);
    const { batchId, preTestScore, postTestScore, softSkillComm, softSkillTime, softSkillMotiv, softSkillDuty } = req.body;
    if (!batchId) return res.status(400).json({ error: 'batchId จำเป็นต้องมี' });

    const fields = {
      preTestScore: score(preTestScore, 100),
      postTestScore: score(postTestScore, 100),
      softSkillComm: score(softSkillComm, 5),
      softSkillTime: score(softSkillTime, 5),
      softSkillMotiv: score(softSkillMotiv, 5),
      softSkillDuty: score(softSkillDuty, 5),
    };
    const assessment = await prisma.personAssessment.upsert({
      where: { personId_batchId: { personId, batchId: Number(batchId) } },
      create: { personId, batchId: Number(batchId), ...fields },
      update: fields,
      include: { batch: true },
    });
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/persons/:id/assessments/:aid
router.delete('/:id/assessments/:aid', async (req, res) => {
  try {
    await prisma.personAssessment.delete({ where: { id: Number(req.params.aid) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/batches/:batchId/assessments — ดึงผลประเมินทุกคนในรุ่นนี้ (ใช้ใน Report)
router.get('/batch/:batchId/assessments', async (req, res) => {
  try {
    const assessments = await prisma.personAssessment.findMany({
      where: { batchId: Number(req.params.batchId) },
      include: {
        person: {
          select: {
            id: true,
            fullName: true,
            birthDate: true,
            educationLevel: true,
            disabilityInfos: { include: { disabilityType: true } },
            photos: { take: 1 },
          },
        },
        batch: true,
      },
    });
    res.json(assessments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
