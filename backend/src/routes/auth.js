const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');
const { writeAudit } = require('../middleware/audit');

const JWT_SECRET = process.env.JWT_SECRET || 'kmutt_pwd_secret_2024';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });

    const user = await prisma.user.findUnique({ where: { email } });
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
