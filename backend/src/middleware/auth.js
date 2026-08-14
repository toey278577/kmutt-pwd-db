const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const JWT_SECRET = process.env.JWT_SECRET || 'kmutt_pwd_secret_2024';

async function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token' });
  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    // อ่านสิทธิ์จาก DB ทุก request ไม่ใช้ role ที่ฝังใน token
    // → แอดมินเปลี่ยนบทบาท/ปิดบัญชี มีผลทันที ไม่ต้องรอ token เดิมหมดอายุ (8 ชม.)
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Account disabled' });
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
