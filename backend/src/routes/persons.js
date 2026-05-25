const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

const toDate = (val) => (val && String(val).trim() !== '') ? new Date(val) : null;
const toEnum = (val) => (val && String(val).trim() !== '') ? val : null;
const MARITAL_ENUMS = ['SINGLE', 'MARRIED', 'OTHER'];
const toMarital = (val) => {
  if (!val || String(val).trim() === '') return null;
  return MARITAL_ENUMS.includes(val) ? val : 'OTHER';
};

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
      data: { ...rest, birthDate: toDate(birthDate), maritalStatus: toMarital(maritalStatus), gender, lifeStatus },
    });
    res.status(201).json(person);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { fullName, thaiId, phone, email, address, province, nationality, religion, educationLevel,
            birthDate, maritalStatus, gender, lifeStatus } = req.body;
    const data = { fullName, phone, email, address, province, nationality, religion, educationLevel,
                   birthDate: toDate(birthDate), maritalStatus: toMarital(maritalStatus), gender, lifeStatus };
    if (thaiId) data.thaiId = thaiId;
    const person = await prisma.person.update({
      where: { id: parseInt(req.params.id) },
      data,
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
