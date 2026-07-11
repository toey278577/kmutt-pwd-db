const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// GET /api/batches — รายการรุ่นทั้งหมด
router.get('/', async (req, res) => {
  try {
    const batches = await prisma.trainingBatch.findMany({
      orderBy: [{ year: 'desc' }, { batchNumber: 'desc' }],
      include: {
        _count: { select: { assessments: true, persons: true } },
        courses: {
          orderBy: { id: 'asc' },
          include: { _count: { select: { persons: true } } },
        },
      },
    });
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/batches/:id
router.get('/:id', async (req, res) => {
  try {
    const batch = await prisma.trainingBatch.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        assessments: {
          include: { person: { select: { id: true, fullName: true, photos: { take: 1 } } } },
        },
      },
    });
    if (!batch) return res.status(404).json({ error: 'Not found' });
    res.json(batch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/batches
router.post('/', async (req, res) => {
  try {
    const { batchNumber, year, courseName, startDate, endDate, status } = req.body;
    if (!batchNumber || !year || !courseName) {
      return res.status(400).json({ error: 'batchNumber, year และ courseName จำเป็นต้องมี' });
    }
    const batch = await prisma.trainingBatch.create({
      data: {
        batchNumber: Number(batchNumber),
        year: Number(year),
        courseName,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: status || 'ACTIVE',
      },
    });
    res.status(201).json(batch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/batches/:id
router.put('/:id', async (req, res) => {
  try {
    const { batchNumber, year, courseName, startDate, endDate, status } = req.body;
    const batch = await prisma.trainingBatch.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(batchNumber !== undefined && { batchNumber: Number(batchNumber) }),
        ...(year !== undefined && { year: Number(year) }),
        ...(courseName !== undefined && { courseName }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status !== undefined && { status }),
      },
    });
    res.json(batch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/batches/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.trainingBatch.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── หลักสูตร (Course) ในแต่ละรุ่น — 1-4 หลักสูตร/รุ่น ──

// POST /api/batches/:id/courses — เพิ่มหลักสูตร
router.post('/:id/courses', async (req, res) => {
  try {
    const batchId = Number(req.params.id);
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'กรุณากรอกชื่อหลักสูตร' });
    const count = await prisma.course.count({ where: { batchId } });
    if (count >= 4) return res.status(400).json({ error: 'แต่ละรุ่นมีได้สูงสุด 4 หลักสูตร' });
    const course = await prisma.course.create({ data: { batchId, name } });
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/batches/:id/courses/:courseId — แก้ชื่อหลักสูตร
router.put('/:id/courses/:courseId', async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'กรุณากรอกชื่อหลักสูตร' });
    const course = await prisma.course.update({
      where: { id: Number(req.params.courseId) },
      data: { name },
    });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/batches/:id/courses/:courseId — ลบหลักสูตร (คนที่อยู่หลักสูตรนี้ course_id → null)
router.delete('/:id/courses/:courseId', async (req, res) => {
  try {
    await prisma.course.delete({ where: { id: Number(req.params.courseId) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
