#!/bin/bash
# ตรวจสุขภาพระบบทุก 5 นาที — ถ้าเว็บล่มให้กู้เองก่อน แล้วค่อยแจ้งเตือน
# log: /var/log/kmutt-health.log   (เฉพาะตอนมีปัญหา ไม่เขียนรัว ๆ ให้ไฟล์บวม)

LOG=/var/log/kmutt-health.log
URL=https://kmutt-pwd.duckdns.org/api/health
STATE=/tmp/kmutt-health.state          # จำสถานะล่าสุด กันแจ้งซ้ำทุก 5 นาที
ALERT_CONF=/opt/kmutt/.alert           # ถ้ามีไฟล์นี้ = ตั้งค่าแจ้งเตือนไว้แล้ว

log() { echo "[$(date '+%F %T')] $1" >> "$LOG"; }

# ส่งแจ้งเตือนเข้า Telegram (ถ้ายังไม่ตั้งค่าก็ข้ามไป เขียน log อย่างเดียว)
notify() {
  [ -f "$ALERT_CONF" ] || return 0
  # shellcheck disable=SC1090
  . "$ALERT_CONF"
  [ -n "$TG_TOKEN" ] && [ -n "$TG_CHAT" ] || return 0
  curl -s -m 10 -o /dev/null \
    --data-urlencode "chat_id=$TG_CHAT" \
    --data-urlencode "text=$1" \
    "https://api.telegram.org/bot${TG_TOKEN}/sendMessage"
}

problems=""

# ── 1. เว็บตอบไหม ──
code=$(curl -s -m 15 -o /dev/null -w "%{http_code}" "$URL")
if [ "$code" != "200" ]; then
  log "เว็บไม่ตอบ (HTTP $code) — กำลังกู้"

  systemctl is-active --quiet kmutt-backend || { systemctl restart kmutt-backend; log "restart kmutt-backend"; }
  systemctl is-active --quiet nginx         || { systemctl restart nginx;         log "restart nginx"; }
  systemctl is-active --quiet postgresql    || { systemctl restart postgresql;    log "restart postgresql"; }

  sleep 15
  code2=$(curl -s -m 15 -o /dev/null -w "%{http_code}" "$URL")
  if [ "$code2" = "200" ]; then
    log "กู้สำเร็จ เว็บกลับมาแล้ว"
    notify "⚠️ ระบบฐานข้อมูลคนพิการ มจธ. ล่มไปครู่หนึ่ง (HTTP $code) แต่กู้คืนอัตโนมัติแล้ว ตอนนี้ใช้งานได้ปกติ"
  else
    log "กู้ไม่สำเร็จ ยังได้ HTTP $code2"
    problems="${problems}• เว็บเข้าไม่ได้ (HTTP $code2) กู้อัตโนมัติแล้วยังไม่กลับมา\n"
  fi
fi

# ── 2. ฐานข้อมูลต่อติดไหม ──
if ! sudo -u postgres psql -d kmutt_pwd_db -c 'select 1' >/dev/null 2>&1; then
  log "ต่อฐานข้อมูลไม่ได้"
  problems="${problems}• ต่อฐานข้อมูลไม่ได้\n"
fi

# ── 3. ดิสก์ใกล้เต็มไหม ──
disk=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$disk" -ge 85 ]; then
  log "ดิสก์ใช้ไป ${disk}%"
  problems="${problems}• ดิสก์ใกล้เต็มแล้ว (ใช้ไป ${disk}%)\n"
fi

# ── 4. สำรองข้อมูลล่าสุดเกิน 2 วันหรือยัง (cron ตี 2 อาจพัง) ──
newest=$(find /opt/kmutt/backend/backups -name 'backup-*.json' -mtime -2 2>/dev/null | head -1)
if [ -z "$newest" ]; then
  log "ไม่มีไฟล์สำรองใหม่ใน 2 วัน"
  problems="${problems}• ระบบสำรองข้อมูลอัตโนมัติไม่ทำงาน (ไม่มีไฟล์ใหม่ใน 2 วัน)\n"
fi

# ── สรุป: แจ้งเตือนเฉพาะตอนเปลี่ยนสถานะ ไม่สแปมทุก 5 นาที ──
if [ -n "$problems" ]; then
  if [ ! -f "$STATE" ]; then
    notify "🔴 ระบบฐานข้อมูลคนพิการ มจธ. มีปัญหา:\n\n$(echo -e "$problems")\nดูรายละเอียด: ssh root@66.42.63.65 แล้วดู $LOG"
    touch "$STATE"
  fi
else
  if [ -f "$STATE" ]; then
    log "กลับมาปกติทุกอย่าง"
    notify "✅ ระบบฐานข้อมูลคนพิการ มจธ. กลับมาปกติแล้ว"
    rm -f "$STATE"
  fi
fi
