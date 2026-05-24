const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

const toDate = (val) => (val && String(val).trim() !== '') ? new Date(val) : null;
const toNum = (val) => (val !== '' && val != null) ? parseFloat(val) : null;
const toEnum = (val) => (val && String(val).trim() !== '') ? val : null;

router.get('/:id/personorg', async (req, res) => {
  try {
    const records = await prisma.personOrganization.findMany({
      where: { personId: parseInt(req.params.id) },
      include: { organization: true },
      orderBy: { startDate: 'desc' },
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/personorg', async (req, res) => {
  try {
    const { orgId, roleType, startDate, endDate, amount, supportDetail, note } = req.body;
    const record = await prisma.personOrganization.create({
      data: {
        personId: parseInt(req.params.id),
        orgId: parseInt(orgId),
        roleType: toEnum(roleType),
        startDate: toDate(startDate),
        endDate: toDate(endDate),
        amount: toNum(amount),
        supportDetail,
        note,
      },
      include: { organization: true },
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id/personorg/:pid', async (req, res) => {
  try {
    const { orgId, roleType, startDate, endDate, amount, supportDetail, note } = req.body;
    const record = await prisma.personOrganization.update({
      where: { id: parseInt(req.params.pid) },
      data: {
        orgId: parseInt(orgId),
        roleType: toEnum(roleType),
        startDate: toDate(startDate),
        endDate: toDate(endDate),
        amount: toNum(amount),
        supportDetail,
        note,
      },
      include: { organization: true },
    });
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id/personorg/:pid', async (req, res) => {
  try {
    await prisma.personOrganization.delete({ where: { id: parseInt(req.params.pid) } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
