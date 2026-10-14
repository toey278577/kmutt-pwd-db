const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// รับเฉพาะช่องขององค์กร — เดิมส่ง req.body เข้า DB ตรงๆ ใครแนบช่องอื่นมา (id, ความสัมพันธ์) ก็ทะลุเข้าไปได้
const ORG_FIELDS = ['orgName', 'businessType', 'address', 'contactName', 'phone', 'email', 'note'];
const pickOrg = (body) => Object.fromEntries(ORG_FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

router.get('/', async (req, res) => {
  try {
    const orgs = await prisma.organization.findMany({
      orderBy: { orgName: 'asc' },
      include: { _count: { select: { persons: true } } },   // จำนวนคนพิการที่เชื่อมอยู่ — ใช้เตือนก่อนลบ
    });
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { persons: { include: { person: true } } },
    });
    if (!org) return res.status(404).json({ error: 'ไม่พบข้อมูลนี้ อาจถูกลบไปแล้ว' });
    res.json(org);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = pickOrg(req.body);
    if (!String(data.orgName || '').trim()) return res.status(400).json({ error: 'กรุณากรอกชื่อองค์กร' });
    const org = await prisma.organization.create({ data });
    res.status(201).json(org);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const org = await prisma.organization.update({
      where: { id: parseInt(req.params.id) },
      data: pickOrg(req.body),
    });
    res.json(org);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.personOrganization.deleteMany({ where: { orgId: id } });
    await prisma.organization.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
