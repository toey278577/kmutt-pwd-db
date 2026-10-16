#!/bin/bash
# อัปเดตระบบจาก GitHub — รันคำสั่งเดียวจบ
# ตัวที่ใช้จริงอยู่ที่ /opt/kmutt/deploy.sh (ก๊อปจากไฟล์นี้) · Sabastian สั่งผ่าน: ssh -i ~/.ssh/kmutt_vps root@<IP> /opt/kmutt/deploy.sh
set -e
cd /opt/kmutt
echo "==> ดึงโค้ดใหม่"
# npm install บนเครื่องนี้แก้ package-lock.json เองทุกครั้ง (npm คนละเวอร์ชันกับเครื่อง dev) — ทิ้งก่อนดึง
# ไม่งั้นวันที่โค้ดใหม่แก้ไฟล์พวกนี้ git pull จะไม่ยอมทับ แล้ว deploy พังทั้งรอบ (16 ต.ค. 69)
git checkout -- frontend/package-lock.json backend/package-lock.json frontend/.env.production 2>/dev/null || true
git pull --ff-only
echo "==> backend"
cd /opt/kmutt/backend
npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1
npx prisma generate >/dev/null 2>&1
npx prisma migrate deploy
echo "==> frontend"
cd /opt/kmutt/frontend
npm install --no-audit --no-fund >/dev/null 2>&1
NODE_OPTIONS="--max-old-space-size=768" npm run build >/dev/null 2>&1
echo "==> รีสตาร์ท"
systemctl restart kmutt-backend
sleep 3
systemctl is-active kmutt-backend
echo "✅ อัปเดตเสร็จ"
