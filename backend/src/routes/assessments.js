const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

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

    const assessment = await prisma.personAssessment.upsert({
      where: { personId_batchId: { personId, batchId: Number(batchId) } },
      create: {
        personId,
        batchId: Number(batchId),
        preTestScore: preTestScore != null ? Number(preTestScore) : null,
        postTestScore: postTestScore != null ? Number(postTestScore) : null,
        softSkillComm: softSkillComm != null ? Number(softSkillComm) : null,
        softSkillTime: softSkillTime != null ? Number(softSkillTime) : null,
        softSkillMotiv: softSkillMotiv != null ? Number(softSkillMotiv) : null,
        softSkillDuty: softSkillDuty != null ? Number(softSkillDuty) : null,
      },
      update: {
        preTestScore: preTestScore != null ? Number(preTestScore) : null,
        postTestScore: postTestScore != null ? Number(postTestScore) : null,
        softSkillComm: softSkillComm != null ? Number(softSkillComm) : null,
        softSkillTime: softSkillTime != null ? Number(softSkillTime) : null,
        softSkillMotiv: softSkillMotiv != null ? Number(softSkillMotiv) : null,
        softSkillDuty: softSkillDuty != null ? Number(softSkillDuty) : null,
      },
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
