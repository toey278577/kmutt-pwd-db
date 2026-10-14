const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { authenticate, requireRole } = require('../middleware/auth');

// ดูประวัติการใช้งาน — เฉพาะผู้ดูแลระบบ
router.use(authenticate, requireRole('ADMIN'));

// GET /api/audit-logs?page=1&pageSize=50&userId=&action=&entity=&personId=&from=YYYY-MM-DD&to=YYYY-MM-DD&q=
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize) || 50));
    const { userId, action, entity, personId, from, to, q } = req.query;

    const where = {};
    if (userId) where.userId = parseInt(userId);
    if (personId) where.personId = parseInt(personId);
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (q) where.OR = [
      { label: { contains: q, mode: 'insensitive' } },
      { userName: { contains: q, mode: 'insensitive' } },
    ];
    if (from || to) {
      where.createdAt = {};
      // วันที่ที่ส่งมาเป็นเวลาไทย (+07:00) — "ถึงวันที่" นับรวมทั้งวัน
      if (from) where.createdAt.gte = new Date(`${from}T00:00:00+07:00`);
      if (to) where.createdAt.lt = new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 86_400_000);
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ items, total, page, pageSize });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
