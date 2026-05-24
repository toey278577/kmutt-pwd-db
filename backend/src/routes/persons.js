const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

const toDate = (val) => (val && String(val).trim() !== '') ? new Date(val) : null;
const toEnum = (val) => (val && String(val).trim() !== '') ? val : null;

router.get('/', async (req, res) => {
  try {
    const { search, province, gender } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { thaiId: { contains: search } },
      ];
    }
    if (province) where.province = province;
    if (gender) where.gender = gender;

    const persons = await prisma.person.findMany({
      where,
      include: { disabilityInfos: { include: { disabilityType: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(persons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const person = await prisma.person.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        disabilityInfos: { include: { disabilityType: true } },
        trainingRecords: true,
        workExperiences: true,
        skills: true,
        followUps: true,
        organizations: { include: { organization: true } },
      },
    });
    if (!person) return res.status(404).json({ error: 'Not found' });
    res.json(person);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { birthDate, maritalStatus, gender, lifeStatus, ...rest } = req.body;
    const person = await prisma.person.create({
      data: { ...rest, birthDate: toDate(birthDate), maritalStatus: toEnum(maritalStatus), gender, lifeStatus },
    });
    res.status(201).json(person);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { birthDate, maritalStatus, gender, lifeStatus, ...rest } = req.body;
    const person = await prisma.person.update({
      where: { id: parseInt(req.params.id) },
      data: { ...rest, birthDate: toDate(birthDate), maritalStatus: toEnum(maritalStatus), gender, lifeStatus },
    });
    res.json(person);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.person.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
