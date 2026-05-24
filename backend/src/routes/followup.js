const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

const toDate = (val) => (val && String(val).trim() !== '') ? new Date(val) : null;
const toNum = (val) => (val !== '' && val != null) ? parseFloat(val) : null;
const toEnum = (val) => (val && String(val).trim() !== '') ? val : null;

router.get('/:id/followup', async (req, res) => {
  try {
    const records = await prisma.followUp.findMany({
      where: { personId: parseInt(req.params.id) },
      orderBy: { followUpDate: 'desc' },
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/followup', async (req, res) => {
  try {
    const { followUpDate, income, skillMatch, employmentStatus, ...rest } = req.body;
    const record = await prisma.followUp.create({
      data: { ...rest, personId: parseInt(req.params.id), followUpDate: toDate(followUpDate), income: toNum(income), skillMatch: toEnum(skillMatch), employmentStatus },
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id/followup/:fid', async (req, res) => {
  try {
    const { followUpDate, income, skillMatch, employmentStatus, ...rest } = req.body;
    const record = await prisma.followUp.update({
      where: { id: parseInt(req.params.fid) },
      data: { ...rest, followUpDate: toDate(followUpDate), income: toNum(income), skillMatch: toEnum(skillMatch), employmentStatus },
    });
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id/followup/:fid', async (req, res) => {
  try {
    await prisma.followUp.delete({ where: { id: parseInt(req.params.fid) } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
