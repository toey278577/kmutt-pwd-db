const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// รายการอบรมทั้งหมดพร้อมชื่อคน — 1 query แทนที่จะเป็น N+1
router.get('/training-all', async (req, res) => {
  try {
    const records = await prisma.trainingRecord.findMany({
      include: {
        person: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });
    res.json(records.map(t => ({
      ...t,
      personId:   t.person.id,
      personName: t.person.fullName,
      person: undefined,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ติดตามผลทั้งหมดพร้อมชื่อคน — 1 query แทนที่จะเป็น N+1
router.get('/followup-all', async (req, res) => {
  try {
    const records = await prisma.followUp.findMany({
      include: {
        person: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { followUpDate: 'desc' },
    });
    res.json(records.map(f => ({
      ...f,
      personId:   f.person.id,
      personName: f.person.fullName,
      person: undefined,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
