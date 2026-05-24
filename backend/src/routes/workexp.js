const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

const toDate = (val) => (val && String(val).trim() !== '') ? new Date(val) : null;
const toNum = (val) => (val !== '' && val != null) ? parseFloat(val) : null;
const toEnum = (val) => (val && String(val).trim() !== '') ? val : null;

router.get('/:id/workexp', async (req, res) => {
  try {
    const records = await prisma.workExperience.findMany({
      where: { personId: parseInt(req.params.id) },
      orderBy: { startDate: 'desc' },
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/workexp', async (req, res) => {
  try {
    const { startDate, endDate, income, workMode, ...rest } = req.body;
    const record = await prisma.workExperience.create({
      data: { ...rest, personId: parseInt(req.params.id), startDate: toDate(startDate), endDate: toDate(endDate), income: toNum(income), workMode: toEnum(workMode) },
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id/workexp/:wid', async (req, res) => {
  try {
    const { startDate, endDate, income, workMode, ...rest } = req.body;
    const record = await prisma.workExperience.update({
      where: { id: parseInt(req.params.wid) },
      data: { ...rest, startDate: toDate(startDate), endDate: toDate(endDate), income: toNum(income), workMode: toEnum(workMode) },
    });
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id/workexp/:wid', async (req, res) => {
  try {
    await prisma.workExperience.delete({ where: { id: parseInt(req.params.wid) } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
