const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { REGION_ORDER, getRegion } = require('../utils/province');

const AGE_ORDER = ['ต่ำกว่า 15 ปี', '15-25 ปี', '26-35 ปี', '36-45 ปี', '46 ปีขึ้นไป'];
const AGE_ALWAYS = ['15-25 ปี', '26-35 ปี', '36-45 ปี', '46 ปีขึ้นไป'];

function getAgeGroup(birthDate) {
  if (!birthDate) return 'ไม่ระบุ';
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return 'ไม่ระบุ';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age < 15) return 'ต่ำกว่า 15 ปี';
  if (age <= 25) return '15-25 ปี';
  if (age <= 35) return '26-35 ปี';
  if (age <= 45) return '36-45 ปี';
  return '46 ปีขึ้นไป';
}

let statsCache = null;
let statsCacheAt = 0;
const STATS_TTL = 60_000; // 60 วิ

router.get('/stats', async (req, res) => {
  if (statsCache && Date.now() - statsCacheAt < STATS_TTL) {
    return res.json(statsCache);
  }
  try {
    const [totalPersons, byGender, byDisabilityType, byEmployment, totalOrgs, totalTraining, allPersons, disabilityTypes] =
      await Promise.all([
        prisma.person.count(),
        prisma.person.groupBy({ by: ['gender'], _count: true }),
        prisma.disabilityInfo.groupBy({ by: ['disabilityTypeId'], _count: true }),
        prisma.followUp.groupBy({ by: ['employmentStatus'], _count: true }),
        prisma.organization.count(),
        prisma.trainingRecord.count(),
        prisma.person.findMany({ select: { birthDate: true, educationLevel: true, province: true } }),
        prisma.disabilityType.findMany(),
      ]);
    const typeMap = Object.fromEntries(disabilityTypes.map((t) => [t.id, t.typeName]));

    // วุฒิการศึกษา
    const eduCount = {};
    for (const p of allPersons) {
      const key = p.educationLevel?.trim() || 'ไม่ระบุ';
      eduCount[key] = (eduCount[key] || 0) + 1;
    }
    const byEducation = Object.entries(eduCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    // ช่วงอายุ
    const ageCount = {};
    for (const p of allPersons) {
      const group = getAgeGroup(p.birthDate);
      ageCount[group] = (ageCount[group] || 0) + 1;
    }
    const byAgeGroup = [
      ...AGE_ORDER
        .filter((k) => ageCount[k] || AGE_ALWAYS.includes(k))
        .map((name) => ({ name, value: ageCount[name] || 0 })),
      ...(ageCount['ไม่ระบุ'] ? [{ name: 'ไม่ระบุ', value: ageCount['ไม่ระบุ'] }] : []),
    ];

    // ภูมิภาค
    const regionCount = {};
    for (const p of allPersons) {
      const region = getRegion(p.province);
      regionCount[region] = (regionCount[region] || 0) + 1;
    }
    const byRegion = [
      ...REGION_ORDER.map((name) => ({ name, value: regionCount[name] || 0 })),
      // 2 กลุ่มนี้โชว์เฉพาะตอนมีคนตกค้างจริง (จังหวัดสะกดไม่ตรง / ไม่ได้กรอก)
      ...['อื่นๆ', 'ไม่ระบุ'].filter((k) => regionCount[k]).map((name) => ({ name, value: regionCount[name] })),
    ];

    const result = {
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
      byEducation,
      byAgeGroup,
      byRegion,
    };
    statsCache = result;
    statsCacheAt = Date.now();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
