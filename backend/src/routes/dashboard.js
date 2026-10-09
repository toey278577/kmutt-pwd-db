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
  'กรุงเทพมหานคร': 'กรุงเทพฯ',
  'นนทบุรี': 'กรุงเทพฯ', 'ปทุมธานี': 'กรุงเทพฯ', 'สมุทรปราการ': 'กรุงเทพฯ',
  // ภาคกลาง
  'พระนครศรีอยุธยา': 'ภาคกลาง', 'อ่างทอง': 'ภาคกลาง', 'ลพบุรี': 'ภาคกลาง',
  'สิงห์บุรี': 'ภาคกลาง', 'ชัยนาท': 'ภาคกลาง', 'สระบุรี': 'ภาคกลาง',
  'นครนายก': 'ภาคกลาง', 'สุพรรณบุรี': 'ภาคกลาง', 'กาญจนบุรี': 'ภาคกลาง',
  'ราชบุรี': 'ภาคกลาง', 'นครปฐม': 'ภาคกลาง', 'สมุทรสาคร': 'ภาคกลาง',
  'สมุทรสงคราม': 'ภาคกลาง', 'เพชรบุรี': 'ภาคกลาง', 'ประจวบคีรีขันธ์': 'ภาคกลาง',
  'อุทัยธานี': 'ภาคกลาง',
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

// ลำดับภูมิภาคที่โชว์บน Dashboard เสมอ (แม้ยังไม่มีคน)
const REGION_ORDER = ['กรุงเทพฯ', 'ภาคกลาง', 'ภาคเหนือ', 'ภาคอีสาน', 'ภาคตะวันออก', 'ภาคใต้'];

// ชื่อเรียกสั้น/สะกดเพี้ยน ที่เจอบ่อยตอนนำเข้าจาก Excel
const PROVINCE_ALIASES = {
  'กทม': 'กรุงเทพมหานคร', 'กรุงเทพ': 'กรุงเทพมหานคร', 'บางกอก': 'กรุงเทพมหานคร',
  'อยุธยา': 'พระนครศรีอยุธยา', 'โคราช': 'นครราชสีมา', 'อุบล': 'อุบลราชธานี',
  'อุดร': 'อุดรธานี', 'ศรีษะเกษ': 'ศรีสะเกษ', 'หนองบัวลำพู': 'หนองบัวลำภู',
  'สุราษฏร์ธานี': 'สุราษฎร์ธานี', 'ปราจินบุรี': 'ปราจีนบุรี',
};

// แปลงชื่อจังหวัดที่ผู้ใช้กรอกมาให้เป็นชื่อมาตรฐาน (ตัด "จังหวัด"/"จ."/ช่องว่าง/ไม้ยมก ฯ)
function normalizeProvince(raw) {
  let s = String(raw || '').replace(/\s+/g, '');
  if (!s) return '';
  s = s.replace(/^(จังหวัด|จ\.)/, '');
  s = s.replace(/[.ฯ]+$/, '');
  return PROVINCE_ALIASES[s] || s;
}

function getRegion(raw) {
  const prov = normalizeProvince(raw);
  if (!prov) return 'ไม่ระบุ';
  if (REGION_MAP[prov]) return REGION_MAP[prov];
  // เผื่อกรอกมาทั้งที่อยู่ เช่น "เขตบางรักกรุงเทพมหานคร" → หาชื่อจังหวัดที่ซ่อนอยู่
  const hit = Object.keys(REGION_MAP).find((k) => prov.includes(k));
  return hit ? REGION_MAP[hit] : 'อื่นๆ';
}

// ช่วงอายุที่โชว์เสมอ (นอกเหนือจากนี้โชว์เฉพาะตอนมีคนจริง)
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
