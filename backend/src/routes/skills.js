const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

router.get('/:id/skills', async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      where: { personId: parseInt(req.params.id) },
    });
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/skills', async (req, res) => {
  try {
    const skill = await prisma.skill.create({
      data: { ...req.body, personId: parseInt(req.params.id) },
    });
    res.status(201).json(skill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id/skills/:sid', async (req, res) => {
  try {
    await prisma.skill.delete({ where: { id: parseInt(req.params.sid) } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
