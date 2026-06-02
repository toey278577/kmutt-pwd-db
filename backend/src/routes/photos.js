const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// GET รูปทั้งหมดของคนพิการ
router.get('/:id/photos', async (req, res) => {
  try {
    const photos = await prisma.personPhoto.findMany({
      where: { personId: parseInt(req.params.id) },
      orderBy: { id: 'desc' },
    });
    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST อัปโหลดรูป (base64)
router.post('/:id/photos', async (req, res) => {
  try {
    const { filePath, photoType, description } = req.body;
    if (!filePath) return res.status(400).json({ error: 'ไม่มีข้อมูลรูปภาพ' });

    // ถ้าคนนี้มีรูปอยู่แล้ว ให้ลบก่อน (1 คน 1 รูป)
    await prisma.personPhoto.deleteMany({
      where: { personId: parseInt(req.params.id), photoType: photoType || 'profile' },
    });

    const photo = await prisma.personPhoto.create({
      data: {
        personId: parseInt(req.params.id),
        filePath,
        photoType: photoType || 'profile',
        description: description || null,
      },
    });
    res.status(201).json(photo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE ลบรูป
router.delete('/:id/photos/:pid', async (req, res) => {
  try {
    await prisma.personPhoto.delete({ where: { id: parseInt(req.params.pid) } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
