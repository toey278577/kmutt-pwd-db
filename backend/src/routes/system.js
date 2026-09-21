const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');
const { authenticate, requireRole } = require('../middleware/auth');

// ทั้งไฟล์นี้เฉพาะผู้ดูแลระบบเท่านั้น
router.use(authenticate, requireRole('ADMIN'));

// ข้อความที่ต้องพิมพ์ให้ตรงเป๊ะก่อนล้างข้อมูล
const CONFIRM_TEXT = 'ล้างข้อมูลทั้งหมด';

// ตารางที่ถูกล้าง เรียงจากลูกไปแม่ (กัน foreign key ค้าง แม้ schema จะ cascade ให้อยู่แล้ว)
const WIPE_ORDER = [
  'personAssessment', 'personOrganization', 'followUp', 'skill',
  'workExperience', 'trainingRecord', 'disabilityInfo', 'personPhoto',
  'person', 'course', 'trainingBatch', 'organization',
];

// ตารางที่ "ไม่" ลบ: disabilityType (ข้อมูลตั้งต้น 7 ประเภท) และ user (บัญชีผู้ใช้งาน)

// GET /api/system/stats — จำนวนข้อมูลแต่ละตาราง ใช้โชว์ให้เห็นก่อนกดล้าง
router.get('/stats', async (req, res) => {
  try {
    const [persons, organizations, batches, courses, trainings, followUps, assessments, users] =
      await Promise.all([
        prisma.person.count(),
        prisma.organization.count(),
        prisma.trainingBatch.count(),
        prisma.course.count(),
        prisma.trainingRecord.count(),
        prisma.followUp.count(),
        prisma.personAssessment.count(),
        prisma.user.count(),
      ]);
    res.json({ persons, organizations, batches, courses, trainings, followUps, assessments, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/system/reset — ล้างข้อมูลทั้งหมดให้เหมือนเพิ่งติดตั้งระบบใหม่
// body: { password, confirmText, keepUsers, backup }
router.post('/reset', async (req, res) => {
  try {
    const { password, confirmText, keepUsers = true, backup = false } = req.body;

    // ── ด่านที่ 1: ต้องพิมพ์ข้อความยืนยันให้ตรง ──
    if (String(confirmText || '').trim() !== CONFIRM_TEXT) {
      return res.status(400).json({ error: `กรุณาพิมพ์ "${CONFIRM_TEXT}" ให้ถูกต้อง` });
    }

    // ── ด่านที่ 2: ต้องยืนยันรหัสผ่านของตัวเอง ──
    if (!password) return res.status(400).json({ error: 'กรุณากรอกรหัสผ่านเพื่อยืนยัน' });
    const me = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!me || !(await bcrypt.compare(password, me.password))) {
      return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
    }

    // ── ด่านที่ 3: สำรองข้อมูลก่อนลบ (เฉพาะเมื่อผู้ใช้ติ๊กเลือก) ──
    // ไม่ติ๊ก = ลบเลย ยังมีสำรองรายวันตอนตี 2 เป็นตาข่ายรองอยู่ (แต่เป็นข้อมูลของเมื่อคืน)
    let backupFile = null;
    if (backup) {
      const BACKUP_MODELS = [
        'disabilityType', 'organization', 'user', 'trainingBatch', 'course',
        'person', 'personPhoto', 'disabilityInfo', 'trainingRecord',
        'workExperience', 'skill', 'followUp', 'personOrganization', 'personAssessment',
      ];
      const data = {};
      for (const m of BACKUP_MODELS) data[m] = await prisma[m].findMany();

      const dir = path.join(__dirname, '..', '..', 'backups');
      fs.mkdirSync(dir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
      backupFile = `before-reset-${stamp}.json`;
      fs.writeFileSync(
        path.join(dir, backupFile),
        JSON.stringify({ backupAt: new Date().toISOString(), by: me.email, data }, null, 2),
        'utf8'
      );

      // เก็บไฟล์สำรองก่อนรีเซ็ตแค่ KEEP ไฟล์ล่าสุด ที่เก่ากว่านั้นลบทิ้ง — กันไฟล์กองจนดิสก์เต็ม
      // (คนละชุดกับสำรองรายวัน backup-*.json ซึ่ง backup.sh ลบให้เมื่อเกิน 14 วัน)
      const KEEP = 5;
      try {
        const olds = fs.readdirSync(dir)
          .filter((f) => f.startsWith('before-reset-') && f.endsWith('.json'))
          .sort()              // ชื่อไฟล์ขึ้นต้นด้วยเวลา เรียงชื่อ = เรียงเวลา
          .slice(0, -KEEP);    // เหลือ KEEP ไฟล์ล่าสุดไว้
        for (const f of olds) fs.unlinkSync(path.join(dir, f));
        if (olds.length) console.log(`[RESET] ลบไฟล์สำรองเก่า ${olds.length} ไฟล์ (เก็บล่าสุด ${KEEP} ไฟล์)`);
      } catch (e) {
        console.warn('[RESET] ลบไฟล์สำรองเก่าไม่สำเร็จ:', e.message);
      }
    }

    // ── ล้างข้อมูล ──
    const deleted = {};
    await prisma.$transaction(async (tx) => {
      for (const m of WIPE_ORDER) {
        const r = await tx[m].deleteMany({});
        deleted[m] = r.count;
      }
      // ลบบัญชีผู้ใช้คนอื่นด้วย (ถ้าเลือก) — เหลือบัญชีของคนที่กดไว้เข้าระบบต่อได้
      if (!keepUsers) {
        const r = await tx.user.deleteMany({ where: { id: { not: me.id } } });
        deleted.user = r.count;
      }
    }, { timeout: 60_000 });

    // ลบไฟล์รูปถ่ายบนดิสก์ด้วย (ข้อมูลใน DB ถูกลบไปแล้ว ไฟล์จะกลายเป็นขยะ)
    try {
      const photoDir = path.join(__dirname, '..', '..', 'uploads', 'photos');
      if (fs.existsSync(photoDir)) {
        const imgs = fs.readdirSync(photoDir);
        for (const f of imgs) fs.unlinkSync(path.join(photoDir, f));
        deleted.photoFiles = imgs.length;
      }
    } catch (e) {
      console.warn('[RESET] ลบไฟล์รูปไม่สำเร็จ:', e.message);
    }

    const total = Object.values(deleted).reduce((a, b) => a + b, 0);
    console.log(`[RESET] ${me.email} ล้างข้อมูล ${total} แถว | ${backupFile ? 'สำรองไว้ที่ ' + backupFile : 'ไม่ได้สำรอง'}`);

    res.json({ ok: true, deleted, total, backupFile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
