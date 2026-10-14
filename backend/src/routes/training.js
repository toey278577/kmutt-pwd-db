const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { ensureOwned, pick } = require('../utils/owned');

const toDate = (val) => (val && String(val).trim() !== '') ? new Date(val) : null;
const toEnum = (val) => (val && String(val).trim() !== '') ? val : null;
const TEXT = ['courseName', 'organizer', 'skillsGained', 'evaluationResult'];

router.get('/:id/training', async (req, res) => {
  try {
    const records = await prisma.trainingRecord.findMany({
      where: { personId: parseInt(req.params.id) },
      orderBy: { startDate: 'desc' },
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/training', async (req, res) => {
  try {
    const { startDate, endDate, trainingType } = req.body;
    const rest = pick(req.body, TEXT);
    const record = await prisma.trainingRecord.create({
      data: { ...rest, personId: parseInt(req.params.id), startDate: toDate(startDate), endDate: toDate(endDate), trainingType: toEnum(trainingType) },
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id/training/:tid', async (req, res) => {
  try {
    if (!(await ensureOwned(res, 'trainingRecord', parseInt(req.params.tid), parseInt(req.params.id)))) return;
    const { startDate, endDate, trainingType } = req.body;
    const rest = pick(req.body, TEXT);
    const record = await prisma.trainingRecord.update({
      where: { id: parseInt(req.params.tid) },
      data: { ...rest, startDate: toDate(startDate), endDate: toDate(endDate), trainingType: toEnum(trainingType) },
    });
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id/training/:tid', async (req, res) => {
  try {
    if (!(await ensureOwned(res, 'trainingRecord', parseInt(req.params.tid), parseInt(req.params.id)))) return;
    await prisma.trainingRecord.delete({ where: { id: parseInt(req.params.tid) } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
