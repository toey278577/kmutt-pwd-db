const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');
const { writeAudit } = require('../middleware/audit');

const { JWT_SECRET } = require('../utils/jwtSecret');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });

    // ไม่สนตัวใหญ่-เล็ก — บัญชีเก่าบางบัญชีเก็บอีเมลเป็นตัวใหญ่ไว้ (บัญชีใหม่เก็บตัวเล็กเสมอ)
    const user = await prisma.user.findFirst({
      where: { email: { equals: String(email).trim(), mode: 'insensitive' } },
      orderBy: { id: 'asc' },
    });
    const match = !!user && user.isActive && await bcrypt.compare(password, user.password);
    if (!match) {
      // เก็บไว้ดูว่ามีคนพยายามเดารหัสผ่านไหม (label = อีเมลที่ลองใช้)
      writeAudit({ userId: user?.id ?? null, userName: user?.name ?? '-', action: 'LOGIN_FAILED', entity: 'auth', label: String(email).slice(0, 255), ip: req.ip || null });
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
    writeAudit({ userId: user.id, userName: user.name, action: 'LOGIN', entity: 'auth', label: user.email, ip: req.ip || null });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ต่อเวลาเข้าระบบอีก 8 ชม. (กด "ใช้งานต่อ" ที่แถบเตือนตอนเหลือไม่ถึง 10 นาที) — ต้องมีตั๋วที่ยังไม่หมดอายุ
// ข้อมูลผู้ใช้มาจาก DB (authenticate) · เป็น GET เพราะไม่ได้เปลี่ยนข้อมูล และผู้ดูข้อมูล (VIEWER) ต้องต่อเวลาได้ด้วย (authenticate กัน POST ของ VIEWER)
router.get('/refresh', authenticate, (req, res) => {
  const u = req.user;
  const token = jwt.sign({ id: u.id, email: u.email, name: u.name, role: u.role }, JWT_SECRET, { expiresIn: '8h' });
  res.set('Cache-Control', 'no-store');
  res.json({ token, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    if (!user) return res.status(404).json({ error: 'ไม่พบข้อมูลนี้ อาจถูกลบไปแล้ว' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
