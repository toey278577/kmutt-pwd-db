const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

router.get('/stats', async (req, res) => {
  try {
    const [totalPersons, byGender, byDisabilityType, byEmployment, totalOrgs, totalTraining] =
      await Promise.all([
        prisma.person.count(),
        prisma.person.groupBy({ by: ['gender'], _count: true }),
        prisma.disabilityInfo.groupBy({
          by: ['disabilityTypeId'],
          _count: true,
        }),
        prisma.followUp.groupBy({ by: ['employmentStatus'], _count: true }),
        prisma.organization.count(),
        prisma.trainingRecord.count(),
      ]);

    const disabilityTypes = await prisma.disabilityType.findMany();
    const typeMap = Object.fromEntries(disabilityTypes.map((t) => [t.id, t.typeName]));

    res.json({
      totalPersons,
      totalOrgs,
      totalTraining,
      byGender: byGender.map((g) => ({ name: g.gender, value: g._count })),
      byDisabilityType: byDisabilityType.map((d) => ({
        name: typeMap[d.disabilityTypeId] || 'ไม่ระบุ',
        value: d._count,
      })),
      byEmployment: byEmployment.map((e) => ({
        name: e.employmentStatus,
        value: e._count,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
