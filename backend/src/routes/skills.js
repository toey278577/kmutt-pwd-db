const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { ensureOwned, pick } = require('../utils/owned');

router.get('/:id/skills', async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      where: { personId: parseInt(req.params.id) },
    });
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
// ชื่อทักษะต้องไม่ว่าง + ระดับต้องเป็นค่าที่ระบบรู้จัก (เดิมส่งชื่อว่างมาก็บันทึก)
function readSkill(body) {
  const { skillName, skillLevel } = pick(body, ['skillName', 'skillLevel']);
  const name = String(skillName ?? '').trim();
  if (!name) return { error: 'กรุณากรอกชื่อทักษะ' };
  if (!LEVELS.includes(skillLevel)) return { error: 'กรุณาเลือกระดับทักษะ' };
  return { data: { skillName: name.slice(0, 100), skillLevel } };
}

router.post('/:id/skills', async (req, res) => {
  try {
    const { data, error } = readSkill(req.body);
    if (error) return res.status(400).json({ error });
    const skill = await prisma.skill.create({ data: { ...data, personId: parseInt(req.params.id) } });
    res.status(201).json(skill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id/skills/:sid', async (req, res) => {
  try {
    if (!(await ensureOwned(res, 'skill', parseInt(req.params.sid), parseInt(req.params.id)))) return;
    const { data, error } = readSkill(req.body);
    if (error) return res.status(400).json({ error });
    res.json(await prisma.skill.update({ where: { id: parseInt(req.params.sid) }, data }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id/skills/:sid', async (req, res) => {
  try {
    if (!(await ensureOwned(res, 'skill', parseInt(req.params.sid), parseInt(req.params.id)))) return;
    await prisma.skill.delete({ where: { id: parseInt(req.params.sid) } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
