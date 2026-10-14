const prisma = require('../prismaClient');

// รายการย่อยของคนพิการ (อบรม/งาน/ติดตามผล/ทักษะ/รูป/ความพิการ/ผลประเมิน/สถานประกอบการ)
// เดิมแก้/ลบด้วยเลขรายการอย่างเดียว ไม่ดูว่าเป็นของคนใน URL — ยิง /persons/1/training/99 ก็ลบรายการของคนอื่นได้
// และประวัติการใช้งานจะบันทึกว่าแก้ข้อมูลคนที่ 1 ทั้งที่จริงเป็นคนอื่น

const NOT_FOUND = 'ไม่พบรายการนี้ อาจถูกลบไปแล้ว ลองรีเฟรชหน้า';

// คืน true ถ้ารายการ id เป็นของคน personId — ไม่ใช่ก็ตอบ 404 ให้เลย
async function ensureOwned(res, model, id, personId) {
  if (!Number.isInteger(id) || !Number.isInteger(personId)) {
    res.status(404).json({ error: NOT_FOUND });
    return false;
  }
  const found = await prisma[model].findFirst({ where: { id, personId }, select: { id: true } });
  if (!found) {
    res.status(404).json({ error: NOT_FOUND });
    return false;
  }
  return true;
}

// เอาเฉพาะช่องที่อนุญาต — เดิม spread req.body เข้า DB ตรงๆ ใครแนบ personId/id มาก็ย้ายรายการไปคนอื่นได้
const pick = (body, fields) => Object.fromEntries(fields.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

module.exports = { ensureOwned, pick, NOT_FOUND };
