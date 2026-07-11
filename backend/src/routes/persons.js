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
const handlePrismaError = (err, res) => {
  if (err.code === 'P2002') {
    const field = err.meta?.target?.join(', ') || 'ข้อมูล';
    return res.status(400).json({ error: `${field} นี้มีอยู่ในระบบแล้ว (ซ้ำ)` });
  }
  res.status(400).json({ error: err.message });
};

router.get('/disability-types', async (req, res) => {
  try {
    const types = await prisma.disabilityType.findMany({ orderBy: { id: 'asc' } });
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/disability', async (req, res) => {
  try {
    const infos = await prisma.disabilityInfo.findMany({
      where: { personId: parseInt(req.params.id) },
      include: { disabilityType: true },
    });
    res.json(infos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/disability', async (req, res) => {
  try {
    const { disabilityTypeId, disabilityLevel, assistiveDevice, workLimitation, accommodationNeed } = req.body;
    if (!disabilityTypeId) return res.status(400).json({ error: 'กรุณาเลือกประเภทความพิการ' });
    const info = await prisma.disabilityInfo.create({
      data: {
        personId: parseInt(req.params.id),
        disabilityTypeId: parseInt(disabilityTypeId),
        disabilityLevel: disabilityLevel || null,
        assistiveDevice: assistiveDevice || null,
        workLimitation: workLimitation || null,
        accommodationNeed: accommodationNeed || null,
      },
      include: { disabilityType: true },
    });
    res.status(201).json(info);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id/disability/:did', async (req, res) => {
  try {
    await prisma.disabilityInfo.delete({ where: { id: parseInt(req.params.did) } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { search, province, gender, withPhotos, batchId } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { thaiId: { contains: search } },
      ];
    }
    if (province) where.province = province;
    if (gender) where.gender = gender;
    if (batchId) where.batchId = parseInt(batchId);

    const select = {
      id: true, fullName: true, nickname: true, thaiId: true, gender: true,
      birthDate: true, phone: true, mobile: true, province: true,
      educationLevel: true, lifeStatus: true, createdAt: true, batchId: true,
      disabilityInfos: { select: { id: true, disabilityType: { select: { typeName: true } } } },
    };
    if (withPhotos === 'true') {
      select.photos = { select: { filePath: true }, take: 1 };
    }
    const persons = await prisma.person.findMany({
      where,
      select,
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
        batch: true,
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
    const {
      birthDate, maritalStatus, gender, lifeStatus,
      thaiId, phone, email, address, province, nationality, religion, educationLevel,
      mobile, landmark, houseNo, moo, building, floor, soi, road, subDistrict, district, postalCode,
      fullName, nickname, batchId, courseId,
    } = req.body;
    const data = {
      fullName,
      nickname: nickname || null,
      courseId: courseId ? parseInt(courseId) : null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      province: province || null,
      nationality: nationality || null,
      religion: religion || null,
      educationLevel: educationLevel || null,
      birthDate: toDate(birthDate),
      maritalStatus: toMarital(maritalStatus),
      gender, lifeStatus,
      mobile: mobile || null,
      landmark: landmark || null,
      houseNo: houseNo || null,
      moo: moo || null,
      building: building || null,
      floor: floor || null,
      soi: soi || null,
      road: road || null,
      subDistrict: subDistrict || null,
      district: district || null,
      postalCode: postalCode || null,
      batchId: batchId ? parseInt(batchId) : null,
    };
    if (!thaiId || thaiId.trim().length !== 13) {
      return res.status(400).json({ error: 'กรุณากรอกเลขบัตรประชาชน / บัตรคนพิการ ให้ครบ 13 หลัก' });
    }
    data.thaiId = thaiId.trim();
    const person = await prisma.person.create({ data });
    res.status(201).json(person);
  } catch (err) {
    return handlePrismaError(err, res);
  }
});

// POST /api/persons/import — นำเข้าหลายคนจากไฟล์ Excel (frontend map ฟิลด์มาแล้ว)
router.post('/import', async (req, res) => {
  try {
    const rows = Array.isArray(req.body.persons) ? req.body.persons : [];
    if (rows.length === 0) return res.status(400).json({ error: 'ไม่มีข้อมูลให้นำเข้า' });
    let created = 0;
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNo = r.__row || (i + 1);
      const fullName = String(r.fullName || '').trim();
      if (!fullName) { errors.push({ row: rowNo, error: 'ไม่มีชื่อ-นามสกุล' }); continue; }
      const thaiId = r.thaiId ? String(r.thaiId).replace(/\D/g, '') : '';
      if (thaiId && thaiId.length !== 13) { errors.push({ row: rowNo, error: 'เลขบัตรไม่ครบ 13 หลัก' }); continue; }
      const gender = ['MALE', 'FEMALE', 'OTHER'].includes(r.gender) ? r.gender : 'MALE';
      try {
        await prisma.person.create({
          data: {
            fullName,
            nickname: r.nickname ? String(r.nickname).trim() : null,
            thaiId: thaiId || null,
            gender,
            birthDate: toDate(r.birthDate),
            mobile: r.mobile ? String(r.mobile).trim() : null,
            province: r.province ? String(r.province).trim() : null,
            educationLevel: r.educationLevel ? String(r.educationLevel).trim() : null,
            batchId: r.batchId ? parseInt(r.batchId) : null,
          },
        });
        created++;
      } catch (err) {
        errors.push({ row: rowNo, error: err.code === 'P2002' ? 'เลขบัตรนี้มีในระบบแล้ว (ซ้ำ)' : err.message });
      }
    }
    res.json({ created, failed: errors.length, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      fullName, nickname, thaiId, phone, mobile, email, landmark,
      houseNo, moo, building, floor, soi, road, subDistrict, district, province, postalCode,
      address, nationality, religion, educationLevel, birthDate, maritalStatus, gender, lifeStatus, batchId, courseId,
    } = req.body;
    const data = {
      fullName, nickname: nickname || null, courseId: courseId ? parseInt(courseId) : null,
      phone, mobile: mobile || null, email, landmark: landmark || null,
      houseNo: houseNo || null, moo: moo || null, building: building || null, floor: floor || null,
      soi: soi || null, road: road || null, subDistrict: subDistrict || null, district: district || null,
      province, postalCode: postalCode || null, address, nationality, religion, educationLevel,
      birthDate: toDate(birthDate), maritalStatus: toMarital(maritalStatus), gender, lifeStatus,
      batchId: batchId ? parseInt(batchId) : null,
    };
    if (thaiId) data.thaiId = thaiId;
    const person = await prisma.person.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    res.json(person);
  } catch (err) {
    return handlePrismaError(err, res);
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
