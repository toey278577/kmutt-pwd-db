const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate, requireRole('ADMIN'));

const ROLES = ['ADMIN', 'STAFF', 'VIEWER'];
const MIN_PASSWORD = 8;
const SELECT = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true };

// อีเมลเก็บเป็นตัวเล็กเสมอ — เดิมสร้าง "Staff@..." แล้วพิมพ์ตัวเล็กตอนล็อกอินเข้าไม่ได้
const normEmail = (e) => String(e || '').trim().toLowerCase();
const badPassword = (p) => (String(p).length < MIN_PASSWORD ? `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร` : null);

// อีเมลซ้ำแบบไม่สนตัวใหญ่-เล็ก (บัญชีเก่าอาจเก็บตัวใหญ่ไว้)
const emailTaken = (email, exceptId) => prisma.user.findFirst({
  where: { email: { equals: email, mode: 'insensitive' }, ...(exceptId && { id: { not: exceptId } }) },
  select: { id: true },
});
const activeAdminCount = () => prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
const LAST_ADMIN = 'ต้องมีผู้ดูแลระบบที่ใช้งานได้อย่างน้อย 1 คน — เพิ่มผู้ดูแลระบบคนอื่นก่อน';

router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: SELECT, orderBy: { createdAt: 'desc' } });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, password, role } = req.body;
    const email = normEmail(req.body.email);
    if (!name || !email || !password) return res.status(400).json({ error: 'กรุณากรอกชื่อ อีเมล และรหัสผ่าน' });
    const pwErr = badPassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    if (role && !ROLES.includes(role)) return res.status(400).json({ error: 'บทบาทไม่ถูกต้อง' });
    if (await emailTaken(email)) return res.status(400).json({ error: 'อีเมลนี้มีผู้ใช้แล้ว' });

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hash, role: role || 'STAFF' },
      select: SELECT,
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'อีเมลนี้มีผู้ใช้แล้ว' });
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, password, role, isActive } = req.body;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'ไม่พบผู้ใช้นี้ อาจถูกลบไปแล้ว' });

    const isSelf = id === req.user.id;
    const roleChange = role !== undefined && role !== target.role;
    const deactivate = isActive === false && target.isActive;

    // หน้าเว็บกันไว้แล้ว แต่ยิง API ตรงได้ — กันที่หลังบ้านด้วย ไม่งั้นแอดมินลดสิทธิ์ตัวเองแล้วไม่มีใครเข้าหน้าจัดการได้
    if (isSelf && roleChange) return res.status(400).json({ error: 'เปลี่ยนบทบาทของตัวเองไม่ได้' });
    if (isSelf && deactivate) return res.status(400).json({ error: 'ปิดบัญชีของตัวเองไม่ได้' });
    if (role !== undefined && !ROLES.includes(role)) return res.status(400).json({ error: 'บทบาทไม่ถูกต้อง' });
    if (target.role === 'ADMIN' && target.isActive && ((roleChange && role !== 'ADMIN') || deactivate) && (await activeAdminCount()) <= 1) {
      return res.status(400).json({ error: LAST_ADMIN });
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) {
      data.email = normEmail(email);
      if (!data.email) return res.status(400).json({ error: 'กรุณากรอกอีเมล' });
      if (await emailTaken(data.email, id)) return res.status(400).json({ error: 'อีเมลนี้มีผู้ใช้แล้ว' });
    }
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) {
      const pwErr = badPassword(password);
      if (pwErr) return res.status(400).json({ error: pwErr });
      data.password = await bcrypt.hash(password, 10);
    }
    const user = await prisma.user.update({ where: { id }, data, select: SELECT });
    res.json(user);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'อีเมลนี้มีผู้ใช้แล้ว' });
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'ลบบัญชีของตัวเองไม่ได้' });
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'ไม่พบผู้ใช้นี้ อาจถูกลบไปแล้ว' });
    if (target.role === 'ADMIN' && target.isActive && (await activeAdminCount()) <= 1) {
      return res.status(400).json({ error: LAST_ADMIN });
    }
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
