#!/bin/bash
# สำรองฐานข้อมูลอัตโนมัติ — เก็บย้อนหลัง 14 วัน
cd /opt/kmutt/backend || exit 1
/usr/bin/node scripts/backup-db.cjs >> /var/log/kmutt-backup.log 2>&1

# สำรองไฟล์รูปถ่าย (ย้ายออกจาก DB มาเก็บเป็นไฟล์ตั้งแต่ 21 ก.ย. 69)
# ทำเฉพาะตอนมีรูปจริง จะได้ไม่มีไฟล์ tar เปล่า ๆ กองไว้
if [ -d /opt/kmutt/backend/uploads ] && [ -n "$(ls -A /opt/kmutt/backend/uploads/photos 2>/dev/null)" ]; then
  tar -czf "/opt/kmutt/backend/backups/photos-$(date '+%Y-%m-%d').tar.gz" \
      -C /opt/kmutt/backend uploads >> /var/log/kmutt-backup.log 2>&1
fi

# ลบไฟล์สำรองที่เก่ากว่า 14 วัน
find /opt/kmutt/backend/backups -name "backup-*.json" -type f -mtime +14 -delete
find /opt/kmutt/backend/backups -name "photos-*.tar.gz" -type f -mtime +14 -delete
# ลบไฟล์สำรองก่อนรีเซ็ตระบบที่เก่ากว่า 90 วัน (ปกติโค้ดเก็บไว้แค่ 5 ไฟล์ล่าสุดอยู่แล้ว อันนี้กันเหนียว)
find /opt/kmutt/backend/backups -name "before-reset-*.json" -type f -mtime +90 -delete
echo "[$(date '+%F %T')] backup done" >> /var/log/kmutt-backup.log
