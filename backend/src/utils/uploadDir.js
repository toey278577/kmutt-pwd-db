const path = require('path');

// โฟลเดอร์เก็บไฟล์ที่ผู้ใช้อัปโหลด — ปกติ backend/uploads (ระบบจริงไม่ต้องตั้งอะไร)
// ชุดทดสอบตั้ง UPLOAD_ROOT เป็นโฟลเดอร์ของมันเอง ไม่งั้นสคริปต์ล้างรูปไม่มีเจ้าของ/ปุ่มรีเซ็ต
// ที่รันกับฐานข้อมูลทดสอบ จะเห็นรูปจริงในเครื่องเป็น "ไม่มีเจ้าของ" แล้วลบทิ้งหมด
const UPLOAD_ROOT = process.env.UPLOAD_ROOT
  ? path.resolve(process.env.UPLOAD_ROOT)
  : path.join(__dirname, '..', '..', 'uploads');

module.exports = { UPLOAD_ROOT, PHOTO_DIR: path.join(UPLOAD_ROOT, 'photos') };
