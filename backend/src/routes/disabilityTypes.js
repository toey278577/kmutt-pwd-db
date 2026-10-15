const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { authenticate, requireRole } = require('../middleware/auth');

// ประเภทความพิการ — ใช้ทั้งระบบ (ฟอร์ม ตัวกรอง นำเข้า Excel รายงาน Dashboard)
// ทุกคนที่ล็อกอินอ่านได้ · เพิ่ม/แก้/ลบ เฉพาะผู้ดูแลระบบ
router.use(authenticate);

const MAX = 100;   // ตามขนาดช่องในฐานข้อมูล
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const key = (s) => clean(s).replace(/\s/g, '').toLowerCase();

// ชื่อต้องไม่ว่าง ไม่ยาวเกิน และไม่ซ้ำ (ไม่สนช่องว่าง/ตัวพิมพ์ — กันมี 2 อันที่ต่างกันแค่เว้นวรรค)
async function readName(body, exceptId = null) {
  const name = clean(body?.typeName);
  if (!name) return { error: 'กรุณากรอกชื่อประเภทความพิการ' };
  if (name.length > MAX) return { error: `ชื่อยาวเกิน ${MAX} ตัวอักษร` };
  const all = await prisma.disabilityType.findMany({ select: { id: true, typeName: true } });
  if (all.some((t) => t.id !== exceptId && key(t.typeName) === key(name))) return { error: 'มีประเภทความพิการชื่อนี้อยู่แล้ว' };
  return { name };
}
const idOf = (req) => (/^\d+$/.test(req.params.id) ? parseInt(req.params.id, 10) : null);
const NOT_FOUND = 'ไม่พบประเภทความพิการนี้ อาจถูกลบไปแล้ว ลองรีเฟรชหน้า';

// รายการ + จำนวนคนที่ใช้อยู่ (ใช้เตือนก่อนลบ)
router.get('/', async (req, res) => {
  try {
    res.json(await prisma.disabilityType.findMany({
      orderBy: { id: 'asc' },
      include: { _count: { select: { disabilityInfos: true } } },
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, error } = await readName(req.body);
    if (error) return res.status(400).json({ error });
    res.status(201).json(await prisma.disabilityType.create({ data: { typeName: name } }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// แก้ชื่อ — คนที่ใช้ประเภทนี้อยู่จะเห็นชื่อใหม่ทันที (ไม่ต้องแก้ทีละคน)
router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    const id = idOf(req);
    if (id == null || !(await prisma.disabilityType.findUnique({ where: { id } }))) return res.status(404).json({ error: NOT_FOUND });
    const { name, error } = await readName(req.body, id);
    if (error) return res.status(400).json({ error });
    res.json(await prisma.disabilityType.update({ where: { id }, data: { typeName: name } }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ลบได้เฉพาะประเภทที่ยังไม่มีใครใช้ — มีคนใช้อยู่ให้แก้ชื่อแทน (ลบแล้วข้อมูลความพิการของคนเหล่านั้นจะหาย)
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    const id = idOf(req);
    if (id == null || !(await prisma.disabilityType.findUnique({ where: { id } }))) return res.status(404).json({ error: NOT_FOUND });
    const used = await prisma.disabilityInfo.count({ where: { disabilityTypeId: id } });
    if (used) return res.status(400).json({ error: `มีคนพิการ ${used} คนใช้ประเภทนี้อยู่ ลบไม่ได้ — แก้ชื่อแทน หรือเปลี่ยนประเภทของคนเหล่านั้นก่อน` });
    await prisma.disabilityType.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
