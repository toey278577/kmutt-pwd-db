const path = require('path');

// โฟลเดอร์เก็บไฟล์สำรองฐานข้อมูล — ปกติ backend/backups (ระบบจริงไม่ต้องตั้งอะไร)
// ชุดทดสอบตั้ง BACKUP_DIR เป็นโฟลเดอร์ของมันเอง ไม่ให้ไฟล์สำรองจากการซ้อมกู้ไปปนกับไฟล์สำรองจริง
const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.join(__dirname, '..', '..', 'backups');

module.exports = { BACKUP_DIR };
