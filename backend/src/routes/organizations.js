const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

router.get('/', async (req, res) => {
  try {
    const orgs = await prisma.organization.findMany({
      orderBy: { orgName: 'asc' },
    });
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { persons: { include: { person: true } } },
    });
    if (!org) return res.status(404).json({ error: 'Not found' });
    res.json(org);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const org = await prisma.organization.create({ data: req.body });
    res.status(201).json(org);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const org = await prisma.organization.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(org);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.personOrganization.deleteMany({ where: { orgId: id } });
    await prisma.organization.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
