const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../prismaClient');

// รูปเก็บเป็นไฟล์จริง ไม่ยัด base64 ลงฐานข้อมูล
// (DB เก็บแค่ path สั้น ๆ → สำรองข้อมูลเล็กลงมาก และโหลดรายชื่อเร็วขึ้น)
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'photos');
const PUBLIC_PREFIX = '/api/uploads/photos';   // nginx proxy /api/ → backend อยู่แล้ว

const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const MAX_BYTES = 5 * 1024 * 1024;   // 5MB เท่าเดิม

// แปลง data URL (base64) เป็นไฟล์จริง คืน path ที่เก็บลง DB
function saveDataUrl(dataUrl) {
  const m = /^data:([^;,]+);base64,(.+)$/s.exec(String(dataUrl).trim());
  if (!m) throw new Error('รูปภาพไม่ถูกต้อง (ต้องเป็นไฟล์รูป)');

  const ext = MIME_EXT[m[1].toLowerCase()];
  if (!ext) throw new Error('รองรับเฉพาะไฟล์ JPG / PNG / WebP');

  const buf = Buffer.from(m[2], 'base64');
  if (buf.length === 0) throw new Error('ไฟล์รูปว่างเปล่า');
  if (buf.length > MAX_BYTES) throw new Error('ไฟล์ใหญ่เกิน 5MB');

  // ชื่อไฟล์สุ่ม 32 ตัว — คนนอกเดา URL ไม่ได้ (รูปเป็นข้อมูลส่วนบุคคล)
  const name = crypto.randomBytes(16).toString('hex') + ext;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return `${PUBLIC_PREFIX}/${name}`;
}

// ลบไฟล์รูปออกจากดิสก์ (ข้ามให้เงียบ ๆ ถ้าเป็นรูปเก่าที่ยังเก็บเป็น base64 ใน DB)
function removeFile(storedPath) {
  if (!storedPath || !storedPath.startsWith(PUBLIC_PREFIX)) return;
  const name = path.basename(storedPath);
  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, name));
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('ลบไฟล์รูปไม่สำเร็จ:', err.message);
  }
}

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

// POST อัปโหลดรูป (รับ base64 จากหน้าเว็บ แล้วเขียนลงดิสก์)
router.post('/:id/photos', async (req, res) => {
  try {
    const { filePath, photoType, description } = req.body;
    if (!filePath) return res.status(400).json({ error: 'ไม่มีข้อมูลรูปภาพ' });

    const personId = parseInt(req.params.id);
    const type = photoType || 'profile';
    const stored = saveDataUrl(filePath);

    // 1 คน 1 รูปต่อประเภท — ลบรูปเดิมทั้งใน DB และบนดิสก์
    const olds = await prisma.personPhoto.findMany({ where: { personId, photoType: type } });
    await prisma.personPhoto.deleteMany({ where: { personId, photoType: type } });
    olds.forEach((o) => removeFile(o.filePath));

    const photo = await prisma.personPhoto.create({
      data: { personId, filePath: stored, photoType: type, description: description || null },
    });
    res.status(201).json(photo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE ลบรูป (ลบไฟล์บนดิสก์ด้วย ไม่ให้เหลือขยะ)
router.delete('/:id/photos/:pid', async (req, res) => {
  try {
    const pid = parseInt(req.params.pid);
    const photo = await prisma.personPhoto.findUnique({ where: { id: pid } });
    await prisma.personPhoto.delete({ where: { id: pid } });
    if (photo) removeFile(photo.filePath);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
module.exports.UPLOAD_DIR = UPLOAD_DIR;
