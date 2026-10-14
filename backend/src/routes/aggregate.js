const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { evaluatePerson, todayBangkok } = require('../utils/followupDue');

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

// ใครถึงรอบติดตามผล (3 เดือน / 6 เดือน / 1 ปี หลังจบรุ่น) — ใช้ทั้ง Dashboard และหน้าติดตามผล
router.get('/followup-due', async (req, res) => {
  try {
    const persons = await prisma.person.findMany({
      where: { batchId: { not: null }, lifeStatus: 'ALIVE' },
      select: {
        id: true, fullName: true, nickname: true, mobile: true, phone: true,
        batch: { select: { id: true, batchNumber: true, year: true, endDate: true, status: true } },
        followUps: { select: { followUpDate: true } },
      },
    });

    const today = todayBangkok();
    const items = [];
    const noEndDate = {};   // รุ่นที่จบแล้วแต่ยังไม่ใส่วันสิ้นสุด → คำนวณรอบไม่ได้ ต้องบอกให้ไปใส่
    for (const p of persons) {
      const b = p.batch;
      if (!b.endDate) {
        if (b.status !== 'COMPLETED') continue;   // รุ่นที่ยังอบรมอยู่ ไม่มีวันสิ้นสุดเป็นเรื่องปกติ
        noEndDate[b.id] ||= { batchId: b.id, batchNumber: b.batchNumber, year: b.year, persons: 0 };
        noEndDate[b.id].persons++;
        continue;
      }
      const { rounds, current } = evaluatePerson(b.endDate, p.followUps.map((f) => f.followUpDate), today);
      if (!current) continue;
      items.push({
        personId: p.id, fullName: p.fullName, nickname: p.nickname,
        phone: p.mobile || p.phone || null,
        batch: { batchNumber: b.batchNumber, year: b.year, endDate: b.endDate },
        round: current.months, dueDate: current.due, daysLeft: current.daysLeft, status: current.status,
        rounds: rounds.map((r) => ({ months: r.months, state: r.state })),
      });
    }
    items.sort((a, b) => a.daysLeft - b.daysLeft);   // เลยกำหนดนานสุดขึ้นก่อน แล้วค่อยใกล้ถึง

    res.json({
      items,
      summary: {
        overdue: items.filter((i) => i.status === 'overdue').length,
        upcoming: items.filter((i) => i.status === 'upcoming').length,
      },
      noEndDateBatches: Object.values(noEndDate).sort((a, b) => b.year - a.year || b.batchNumber - a.batchNumber),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
