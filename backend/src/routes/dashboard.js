const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

const REGION_MAP = {
  // ภาคเหนือ
  'เชียงใหม่': 'ภาคเหนือ', 'เชียงราย': 'ภาคเหนือ', 'ลำพูน': 'ภาคเหนือ', 'ลำปาง': 'ภาคเหนือ',
  'แพร่': 'ภาคเหนือ', 'น่าน': 'ภาคเหนือ', 'พะเยา': 'ภาคเหนือ', 'แม่ฮ่องสอน': 'ภาคเหนือ',
  'อุตรดิตถ์': 'ภาคเหนือ', 'ตาก': 'ภาคเหนือ', 'สุโขทัย': 'ภาคเหนือ', 'พิษณุโลก': 'ภาคเหนือ',
  'กำแพงเพชร': 'ภาคเหนือ', 'พิจิตร': 'ภาคเหนือ', 'นครสวรรค์': 'ภาคเหนือ', 'เพชรบูรณ์': 'ภาคเหนือ',
  // กรุงเทพและปริมณฑล
  'กรุงเทพมหานคร': 'กรุงเทพฯ', 'กรุงเทพ': 'กรุงเทพฯ',
  'นนทบุรี': 'กรุงเทพฯ', 'ปทุมธานี': 'กรุงเทพฯ', 'สมุทรปราการ': 'กรุงเทพฯ',
  // ภาคกลาง
  'พระนครศรีอยุธยา': 'ภาคกลาง', 'อ่างทอง': 'ภาคกลาง', 'ลพบุรี': 'ภาคกลาง',
  'สิงห์บุรี': 'ภาคกลาง', 'ชัยนาท': 'ภาคกลาง', 'สระบุรี': 'ภาคกลาง',
  'นครนายก': 'ภาคกลาง', 'สุพรรณบุรี': 'ภาคกลาง', 'กาญจนบุรี': 'ภาคกลาง',
  'ราชบุรี': 'ภาคกลาง', 'นครปฐม': 'ภาคกลาง', 'สมุทรสาคร': 'ภาคกลาง',
  'สมุทรสงคราม': 'ภาคกลาง', 'เพชรบุรี': 'ภาคกลาง', 'ประจวบคีรีขันธ์': 'ภาคกลาง',
  // ภาคตะวันออกเฉียงเหนือ
  'นครราชสีมา': 'ภาคอีสาน', 'บุรีรัมย์': 'ภาคอีสาน', 'สุรินทร์': 'ภาคอีสาน',
  'ศรีสะเกษ': 'ภาคอีสาน', 'อุบลราชธานี': 'ภาคอีสาน', 'ยโสธร': 'ภาคอีสาน',
  'ชัยภูมิ': 'ภาคอีสาน', 'อำนาจเจริญ': 'ภาคอีสาน', 'บึงกาฬ': 'ภาคอีสาน',
  'หนองบัวลำภู': 'ภาคอีสาน', 'ขอนแก่น': 'ภาคอีสาน', 'อุดรธานี': 'ภาคอีสาน',
  'เลย': 'ภาคอีสาน', 'หนองคาย': 'ภาคอีสาน', 'มหาสารคาม': 'ภาคอีสาน',
  'ร้อยเอ็ด': 'ภาคอีสาน', 'กาฬสินธุ์': 'ภาคอีสาน', 'สกลนคร': 'ภาคอีสาน',
  'นครพนม': 'ภาคอีสาน', 'มุกดาหาร': 'ภาคอีสาน',
  // ภาคตะวันออก
  'ชลบุรี': 'ภาคตะวันออก', 'ระยอง': 'ภาคตะวันออก', 'จันทบุรี': 'ภาคตะวันออก',
  'ตราด': 'ภาคตะวันออก', 'ฉะเชิงเทรา': 'ภาคตะวันออก', 'ปราจีนบุรี': 'ภาคตะวันออก',
  'สระแก้ว': 'ภาคตะวันออก',
  // ภาคใต้
  'นครศรีธรรมราช': 'ภาคใต้', 'กระบี่': 'ภาคใต้', 'พังงา': 'ภาคใต้',
  'ภูเก็ต': 'ภาคใต้', 'สุราษฎร์ธานี': 'ภาคใต้', 'ระนอง': 'ภาคใต้',
  'ชุมพร': 'ภาคใต้', 'สงขลา': 'ภาคใต้', 'สตูล': 'ภาคใต้',
  'ตรัง': 'ภาคใต้', 'พัทลุง': 'ภาคใต้', 'ปัตตานี': 'ภาคใต้',
  'ยะลา': 'ภาคใต้', 'นราธิวาส': 'ภาคใต้',
};

function getAgeGroup(birthDate) {
  if (!birthDate) return 'ไม่ระบุ';
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age < 19) return 'ต่ำกว่า 19 ปี';
  if (age <= 25) return '19-25 ปี';
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
    const ageOrder = ['ต่ำกว่า 19 ปี', '19-25 ปี', '26-35 ปี', '36-45 ปี', '46 ปีขึ้นไป', 'ไม่ระบุ'];
    const byAgeGroup = ageOrder
      .filter(k => ageCount[k])
      .map(name => ({ name, value: ageCount[name] }));

    // ภูมิภาค
    const regionCount = {};
    for (const p of allPersons) {
      const prov = p.province?.trim() || '';
      const region = REGION_MAP[prov] || (prov ? 'อื่นๆ' : 'ไม่ระบุ');
      regionCount[region] = (regionCount[region] || 0) + 1;
    }
    const byRegion = Object.entries(regionCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

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
