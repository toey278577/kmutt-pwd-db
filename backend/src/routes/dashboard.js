const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { REGION_ORDER, getRegion } = require('../utils/province');
const { cleanText, groupKey } = require('../utils/text');

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
// ล้าง cache ทันทีที่มีการเพิ่ม/แก้/ลบข้อมูล (เรียกจาก index.js) — ไม่งั้นเพิ่มคนแล้ว Dashboard ไม่ขยับไป 1 นาที
const invalidateStats = () => { statsCache = null; };

router.get('/stats', async (req, res) => {
  if (statsCache && Date.now() - statsCacheAt < STATS_TTL) {
    return res.json(statsCache);
  }
  try {
    const [totalPersons, byGender, byDisabilityType, allFollowUps, totalOrgs, totalTraining, allPersons, disabilityTypes] =
      await Promise.all([
        prisma.person.count(),
        prisma.person.groupBy({ by: ['gender'], _count: true }),
        prisma.disabilityInfo.groupBy({ by: ['disabilityTypeId'], _count: true }),
        prisma.followUp.findMany({ select: { personId: true, employmentStatus: true, followUpDate: true, id: true } }),
        prisma.organization.count(),
        // ผู้เข้าอบรม = คนที่อยู่ในรุ่น หรือมีประวัติอบรมรายคน (เดิมนับแค่ประวัติรายคน → คนในรุ่นไม่ถูกนับ การ์ดขึ้น 0)
        prisma.person.count({ where: { OR: [{ batchId: { not: null } }, { trainingRecords: { some: {} } }] } }),
        prisma.person.findMany({ select: { birthDate: true, educationLevel: true, province: true } }),
        prisma.disabilityType.findMany(),
      ]);
    const typeMap = Object.fromEntries(disabilityTypes.map((t) => [t.id, t.typeName]));

    // สถานะการมีงานทำ — นับเป็น "คน" จากผลติดตามล่าสุดของแต่ละคน
    // (เดิม groupBy ทุกบันทึก → คนที่ตามไป 3 รอบถูกนับ 3 ครั้ง ตัวเลขเกินจริง)
    const latest = new Map();
    for (const f of allFollowUps) {
      const cur = latest.get(f.personId);
      if (!cur || f.followUpDate > cur.followUpDate || (+f.followUpDate === +cur.followUpDate && f.id > cur.id)) {
        latest.set(f.personId, f);
      }
    }
    const empCount = {};
    for (const f of latest.values()) empCount[f.employmentStatus] = (empCount[f.employmentStatus] || 0) + 1;

    // วุฒิการศึกษา — จัดกลุ่มด้วย groupKey ข้อความที่หน้าตาเหมือนกันแต่มีตัวล่องหน/ช่องว่างต่างกัน จะรวมเป็นแถวเดียว
    // ชื่อที่โชว์ใช้แบบที่เจอบ่อยสุดในกลุ่มนั้น
    const eduGroups = {};
    for (const p of allPersons) {
      const name = cleanText(p.educationLevel) || 'ไม่ระบุ';
      const g = (eduGroups[groupKey(name)] ||= { value: 0, names: {} });
      g.value++;
      g.names[name] = (g.names[name] || 0) + 1;
    }
    const byEducation = Object.values(eduGroups)
      .map((g) => ({ name: Object.entries(g.names).sort((a, b) => b[1] - a[1])[0][0], value: g.value }))
      .sort((a, b) => b.value - a.value);

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
      byEmployment: Object.entries(empCount)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value })),
      followedUpPersons: latest.size,
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
module.exports.invalidateStats = invalidateStats;
