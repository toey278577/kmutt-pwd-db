const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// รหัสลับสำหรับเซ็นตั๋วเข้าระบบ (JWT) — ใครรู้ค่านี้ปลอมตั๋วเป็นแอดมินได้ทันที
// เดิมถ้าไม่ได้ตั้ง JWT_SECRET จะใช้ค่าที่เขียนไว้ในโค้ด (ใครเห็นโค้ดก็รู้) → เลิกใช้แล้ว
//   มี JWT_SECRET ใน .env (และไม่ใช่ค่าเก่าที่หลุด) → ใช้ค่านั้น
//   ไม่มี → สุ่มค่ายาว 64 ตัวอักษร เก็บในไฟล์ backend/.jwt-secret (ไม่ขึ้น git) เปิดเครื่องใหม่ก็ใช้ค่าเดิม
//   เขียนไฟล์ไม่ได้ → ใช้ค่าสุ่มในหน่วยความจำ (ระบบยังทำงาน แค่ทุกคนต้องล็อกอินใหม่เมื่อรีสตาร์ท)
const LEAKED = new Set(['kmutt_pwd_secret_2024']);   // ค่าที่เคยอยู่ในโค้ด — ถือว่าไม่ลับแล้ว
const FILE = process.env.JWT_SECRET_FILE ? path.resolve(process.env.JWT_SECRET_FILE) : path.join(__dirname, '..', '..', '.jwt-secret');

function load() {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && !LEAKED.has(fromEnv)) {
    if (fromEnv.length < 16) console.warn('[SECURITY] JWT_SECRET สั้นเกินไป (ควรยาว 32 ตัวอักษรขึ้นไป)');
    return { secret: fromEnv, source: 'env' };
  }
  if (fromEnv) console.warn('[SECURITY] JWT_SECRET ใน .env เป็นค่าเก่าที่อยู่ในโค้ด (ไม่ลับ) — ไม่ใช้ เปลี่ยนไปใช้ค่าสุ่มแทน');
  try {
    const saved = fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8').trim() : '';
    if (saved.length >= 32) return { secret: saved, source: 'file' };
    const fresh = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(FILE, fresh + '\n', { mode: 0o600 });
    console.warn(`[SECURITY] ไม่ได้ตั้ง JWT_SECRET — สร้างรหัสลับสุ่มเก็บไว้ที่ ${FILE} แล้ว (ผู้ใช้ที่ล็อกอินค้างไว้ต้องล็อกอินใหม่ 1 ครั้ง)`);
    return { secret: fresh, source: 'file' };
  } catch (e) {
    console.error(`[SECURITY] เขียนไฟล์รหัสลับไม่ได้ (${e.message}) — ใช้ค่าสุ่มชั่วคราว รีสตาร์ทแล้วทุกคนต้องล็อกอินใหม่`);
    return { secret: crypto.randomBytes(32).toString('hex'), source: 'memory' };
  }
}

const { secret: JWT_SECRET, source: JWT_SECRET_SOURCE } = load();
module.exports = { JWT_SECRET, JWT_SECRET_SOURCE, LEAKED_SECRETS: LEAKED };
