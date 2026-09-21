# บันทึกการพัฒนา — ระบบฐานข้อมูลคนพิการ มจธ.

> ผู้พัฒนา: Suthat Srisawat  
> URL ระบบ: https://kmutt-pwd.duckdns.org  (VPS Vultr สิงคโปร์)

---

## เทคโนโลยีที่ใช้พัฒนา

### Frontend
| เทคโนโลยี | หน้าที่ |
|-----------|---------|
| React 19 | Framework หลัก |
| Vite | Build tool |
| Tailwind CSS 4 | Styling |
| DaisyUI 5 | UI Component library |
| React Router 7 | Routing |
| Axios | HTTP client เรียก API |
| Recharts | กราฟใน Dashboard |
| Lucide React | Icons |
| Google Fonts (Sarabun) | ฟอนต์ภาษาไทย |

### Backend
| เทคโนโลยี | หน้าที่ |
|-----------|---------|
| Node.js + Express 5 | Web server |
| Prisma 7 | ORM จัดการ database |
| PostgreSQL | ฐานข้อมูลหลัก |
| JWT (jsonwebtoken) | Authentication |
| bcryptjs | เข้ารหัสรหัสผ่าน |
| CORS | จัดการ cross-origin |

### Deploy / Infrastructure
| บริการ | ใช้ทำอะไร |
|--------|----------|
| Vercel | Host frontend |
| Render | Host backend + PostgreSQL |
| GitHub | Source code + auto deploy |

---

## 21 กันยายน 2569

### ตัวเฝ้าระบบ — ตรวจทุก 5 นาที กู้เองได้ แจ้งเตือนเมื่อกู้ไม่ได้

> เดิมถ้าเว็บล่มตอนดึกจะรู้ก็ต่อเมื่อมีคนเปิดไม่ได้แล้วโทรบอก

- `healthcheck.sh` รันทุก 5 นาทีผ่าน cron ตรวจ 4 อย่าง:
  1. เว็บตอบ 200 ไหม — ถ้าไม่ตอบจะ **restart ตัวที่ตาย** (backend / nginx / postgresql) แล้วเช็คซ้ำใน 15 วินาที
  2. ต่อฐานข้อมูลติดไหม
  3. ดิสก์ใช้ไปเกิน 85% หรือยัง
  4. สำรองข้อมูลอัตโนมัติยังทำงานอยู่ไหม (ไม่มีไฟล์ใหม่ใน 2 วัน = cron พัง)
- **กู้เองได้ก็ไม่กวน** — ถ้า restart แล้วกลับมาปกติ แค่แจ้งว่าล่มไปครู่หนึ่งและกู้แล้ว
- **ไม่สแปม** — จำสถานะไว้ใน state file แจ้งครั้งเดียวตอนเริ่มมีปัญหา และแจ้งอีกครั้งตอนกลับมาปกติ
- log เฉพาะตอนมีปัญหา (`/var/log/kmutt-health.log`) + ตั้ง logrotate เก็บ 4 สัปดาห์
- ช่องทางแจ้งเตือนรองรับ Telegram — ใส่ token ที่ `/opt/kmutt/.alert` เมื่อไหร่ก็เริ่มส่งทันที (ยังไม่ได้ตั้ง)
- เก็บสคริปต์ฝั่งเซิร์ฟเวอร์เข้า repo ที่ `docs/deploy/` (healthcheck.sh, backup.sh, nginx-kmutt.conf) กันหาย

> หมายเหตุ: ตัว backend มี `Restart=always` ของ systemd อยู่แล้ว (โปรแกรมตายเด้งกลับใน 5 วิ)
> ตัวนี้เพิ่มมาเพื่อจับกรณีที่ systemd จับไม่ได้ เช่น nginx ล่ม ฐานข้อมูลล่ม ดิสก์เต็ม หรือ crash loop

### คำสั่งที่ใช้
```bash
scp healthcheck.sh root@66.42.63.65:/opt/kmutt/healthcheck.sh
ssh root@66.42.63.65 "chmod +x /opt/kmutt/healthcheck.sh && bash /opt/kmutt/healthcheck.sh"

# verify: จำลองเว็บล่มโดยชี้ URL ไปพอร์ตที่ไม่มีอะไร (ไม่กระทบผู้ใช้จริง)
sed 's|^URL=.*|URL=http://127.0.0.1:59999/api/health|' healthcheck.sh > /tmp/hc-test.sh && bash /tmp/hc-test.sh
# ได้: ตรวจจับได้, พยายามกู้, เขียน log, สร้าง state กันแจ้งซ้ำ, ไม่ไปแตะ service จริง (NRestarts=0)

crontab -l   # */5 * * * * /opt/kmutt/healthcheck.sh
```

---

### ความปลอดภัย — จำกัดการเดารหัสผ่าน + security headers

> ตรวจภาพรวมระบบแล้วพบว่าหน้าล็อกอินยิงเดารหัสได้ไม่จำกัด ระบบนี้เก็บข้อมูลคนพิการซึ่งเป็นข้อมูลอ่อนไหวตาม PDPA

- **จำกัดการล็อกอินผิด** — ผิดเกิน 8 ครั้งใน 15 นาที (ต่อ IP) โดนบล็อก 15 นาที
  - ล็อกอินถูกต้อง **ไม่นับ** (`skipSuccessfulRequests`) คนพิมพ์ผิด 3-4 ครั้งยังใช้งานได้ปกติ
- **จำกัดการเรียก API ทั้งระบบ** — 2000 ครั้ง/15 นาที/IP (ตั้งหลวมเพราะทั้งสำนักงานอาจออกเน็ต IP เดียวกัน) ยกเว้น `/health`
- **helmet** — X-Frame-Options กัน clickjacking, X-Content-Type-Options กัน MIME sniffing, ซ่อน X-Powered-By
  (ปิด CSP เพราะหน้าเว็บเสิร์ฟจาก nginx ไม่ได้ผ่าน express)
- **`trust proxy`** — สำคัญมาก เพราะอยู่หลัง nginx ถ้าไม่ตั้งจะเห็นทุกคนเป็น 127.0.0.1 แล้วบล็อกทุกคนพร้อมกัน
  - ทดสอบบน production แล้ว: IP A เดาผิด 9 ครั้งโดนบล็อก แต่ IP B ยังล็อกอินได้ปกติ
  - คนนอกปลอม X-Forwarded-For เพื่อหนีบล็อกไม่ได้ (เชื่อแค่ proxy ชั้นเดียว)

### ย้ายรูปถ่ายออกจากฐานข้อมูล ไปเก็บเป็นไฟล์

> เดิมรูปถูกแปลงเป็น base64 ยัดลงตาราง `person_photos` — รูป 1 ใบ ~200KB กลายเป็นข้อความ ~270KB ใน DB
> ยิ่งมีรูปเยอะ DB ยิ่งบวม ไฟล์สำรองรายวันใหญ่ตาม และดึงรายชื่อทีต้องลากข้อความก้อนใหญ่ออกมาด้วย
> (ทำตอนนี้เพราะยังไม่มีใครอัปโหลดรูปเลยสักใบ ย้ายได้สะอาด ไม่ต้อง migrate ของเก่า)

- **เก็บเป็นไฟล์จริง** ที่ `backend/uploads/photos/` — DB เก็บแค่ path สั้น ๆ (~56 ตัวอักษร)
- **ชื่อไฟล์เป็นรหัสสุ่ม 32 ตัว** (`crypto.randomBytes`) คนนอกเดา URL ไม่ได้ เพราะรูปเป็นข้อมูลส่วนบุคคล
- **ตรวจไฟล์ก่อนรับ** — เฉพาะ JPG/PNG/WebP และไม่เกิน 5MB ส่งอย่างอื่นมาถูกปฏิเสธพร้อมบอกเหตุผล
- **ไม่ทิ้งขยะ** — เปลี่ยนรูป/ลบรูป/รีเซ็ตระบบ ลบไฟล์บนดิสก์ตามไปด้วยทุกกรณี
- **แก้บั๊กที่เจอระหว่างทำ** — เปิดแก้ไขคนที่มีรูปอยู่แล้วกดบันทึก ระบบจะส่ง path ของรูปเดิมไปอัปโหลดซ้ำ
  ทำให้บันทึกไม่ผ่าน → อัปโหลดเฉพาะรูปที่เพิ่งเลือกใหม่ (ค่าที่ขึ้นต้นด้วย `data:`) เท่านั้น
- **สำรองข้อมูล** — `backup.sh` เพิ่ม tar โฟลเดอร์รูป (ทำเฉพาะตอนมีรูปจริง) เก็บย้อนหลัง 14 วันเท่าฐานข้อมูล
- **dev** — เพิ่ม proxy `/api` ใน `vite.config.js` ไม่งั้นรูปไม่ขึ้นตอนรันเครื่องตัวเอง
- `backend/uploads/` เข้า .gitignore — ไฟล์รูปเป็นข้อมูลส่วนบุคคล ห้ามขึ้น repo

### คำสั่งที่ใช้
```bash
cd backend && npm install express-rate-limit helmet
node test_ratelimit.cjs   # verify 8 เคส: headers ครบ, เดาผิด 9 ครั้งโดนบล็อก, API อื่นไม่โดนหางเลข
node test_photos.cjs      # verify 14 เคส: อัปโหลด/เปิดดู/เปลี่ยนรูป/ลบ/ไฟล์ขยะ/ไฟล์ผิดประเภท
cd frontend && npm run build
scp backup.sh root@66.42.63.65:/opt/kmutt/backup.sh && bash /opt/kmutt/backup.sh
ssh -i ~/.ssh/kmutt_vps root@66.42.63.65 "/opt/kmutt/deploy.sh"
```

---

## 14 กันยายน 2569

### ฟีเจอร์ใหม่ — ปุ่มรีเซ็ตระบบ (เฉพาะผู้ดูแลระบบ)

> ล้างข้อมูลทั้งหมดให้เหมือนเพิ่งติดตั้งระบบใหม่ ใช้ตอนเริ่มโครงการใหม่หรือเลิกใช้ข้อมูลทดลอง

- **ที่อยู่:** ท้ายหน้า "จัดการผู้ใช้" เป็นการ์ด **โซนอันตราย** (หน้านี้เปิดให้ ADMIN เท่านั้นอยู่แล้ว)
- **ลบ:** คนพิการ (cascade ไปรูป/ความพิการ/อบรม/ทักษะ/งาน/ติดตามผล/ผลประเมิน) • รุ่น • หลักสูตร • สถานประกอบการ
- **ไม่ลบ:** บัญชีผู้ใช้งาน + ประเภทความพิการ 7 ประเภท (ติ๊กเลือกลบผู้ใช้คนอื่นได้ แต่บัญชีคนกดจะอยู่เสมอ)
- **4 ด่านกันมือลั่น:**
  1. พิมพ์คำว่า "ล้างข้อมูลทั้งหมด" ให้ตรงเป๊ะ (ตัดช่องว่างหัวท้ายให้)
  2. ใส่รหัสผ่านของตัวเอง (ตรวจด้วย bcrypt ฝั่ง server)
  3. กล่องยืนยันถามย้ำอีกครั้ง พร้อมบอกจำนวนรายการที่จะลบ
  4. มีช่องติ๊ก **สำรองข้อมูลก่อนลบ** ให้เลือกเอง (ค่าเริ่มต้น = ไม่สำรอง ลบเลย) ถ้าติ๊กจะได้ไฟล์ `backups/before-reset-<เวลา>.json` และระบบเก็บไว้แค่ 5 ไฟล์ล่าสุด
- **ความปลอดภัย 2 ชั้น:** frontend `ProtectedRoute adminOnly` + backend `requireRole('ADMIN')` — STAFF ยิง API ตรงก็ได้ 403
- ลบใน transaction เรียงจากลูกไปแม่ + log ลง console ว่าใครกดและสำรองไว้ที่ไฟล์ไหน
- ไฟล์ใหม่: `backend/src/routes/system.js` (GET `/api/system/stats`, POST `/api/system/reset`), `frontend/src/components/DangerZone.jsx`
- อัปเดตคู่มือบทที่ 12 ให้มีหัวข้อโซนอันตราย (ยังพอดี 16 หน้าเท่าเดิม)

### คำสั่งที่ใช้
```bash
# verify: ทดสอบ API ครบทุกด่าน 16 เคส — ผ่านหมด
node test_reset.cjs      # ไม่มี token 401 / STAFF 403 / คำยืนยันผิด 400 / รหัสผิด 401
                         # ยิงผิด 4 ครั้งข้อมูลยังครบ / รีเซ็ตจริงลบหมด / users ยังอยู่ / backup กู้คืนได้

# กู้ข้อมูลทดสอบใน DB เครื่องกลับ (พิสูจน์ว่าไฟล์สำรองใช้ได้จริง)
cd backend && node scripts/restore-db.cjs backups/before-reset-2026-09-14T04-09.json

cd frontend && npm run build
ssh -i ~/.ssh/kmutt_vps root@66.42.63.65 "/opt/kmutt/deploy.sh"
```

### แก้บั๊ก — กดดินสอแก้ไขคนพิการ แล้วที่อยู่หายหมด

> อาการ: นำเข้า Excel มาพร้อมที่อยู่ครบ → กดดินสอในหน้ารายชื่อ → ฟอร์มว่างทุกช่องที่อยู่ เหลือแต่จังหวัด → กดบันทึกแล้วที่อยู่ในฐานข้อมูลหายจริง

- **สาเหตุ:** `openModal()` ใน `PersonList.jsx` เอา **แถวจากหน้ารายชื่อ** มาใส่ฟอร์มตรงๆ แต่ `GET /api/persons` ดึงมาแค่บางช่อง (ตั้งแต่ปรับให้โหลดเร็ว มิ.ย. 69) ช่องที่ขาดเลยตกเป็นค่าว่างของฟอร์ม พอกดบันทึกก็ส่งค่าว่างไปเขียนทับของจริง
- **ช่องที่โดนทับ:** ที่อยู่ทุกช่อง (ยกเว้นจังหวัด) • อีเมล • สถานที่ใกล้เคียง • **หลักสูตร** (หลุดจากหลักสูตร) • สัญชาติ/ศาสนา/สถานภาพ ถูกรีเซ็ตเป็น ไทย/พุทธ/โสด
- **ไม่ใช่บั๊กของการนำเข้า** — นำเข้าบันทึกครบทุกช่อง แค่มาเห็นชัดตอนนี้เพราะคนนำเข้าแล้วกดแก้ไขต่อทันที
- **แก้:** กดดินสอแล้วดึงข้อมูลเต็มของคนนั้น (`GET /api/persons/:id`) ก่อนเปิดฟอร์ม ถ้าโหลดไม่ได้ขึ้นแจ้งเตือน ไม่เปิดฟอร์มเปล่า
- เพิ่มล้าง cache `person:<id>` ตอนเพิ่ม/ลบประเภทความพิการ กันเปิดฟอร์มซ้ำเร็วๆ แล้วเห็นอันที่ลบไปแล้ว

### คำสั่งที่ใช้
```bash
# พิสูจน์บั๊กก่อนแก้: นำเข้า → จำลองดินสอแบบเดิม → บันทึก → ที่อยู่หาย (เหลือจังหวัด ตรงกับจอผู้ใช้)
node test-edit-address.cjs
# verify หลังแก้: คุม Edge headless ผ่าน DevTools protocol กดดินสอจริง → ฟอร์มมีที่อยู่ครบ → บันทึก → DB ครบ + แคปจอดู
node browser-edit-test.cjs
cd frontend && npm run build
ssh -i ~/.ssh/kmutt_vps root@66.42.63.65 "/opt/kmutt/deploy.sh"
```

### ปรับปรุง — หน้ารายชื่อจำหน้าเดิมไว้ ไม่เด้งกลับหน้า 1

> อาการ: อยู่หน้า 2 กดดูรายละเอียด/แก้ไขแล้วกลับมา เด้งไปหน้า 1 ทุกครั้ง ถ้าข้อมูลเยอะ (เช่นหน้า 60) ต้องไล่กดกลับไปใหม่ตลอด

- **เลขหน้า คำค้น และรุ่นที่เลือก เก็บไว้ใน URL** — เช่น `/persons?page=60&batch=3&q=สมชาย`
  - กดดูรายละเอียดแล้วกด "กลับ" / กดปุ่ม back ของเบราว์เซอร์ / กด F5 → ยังอยู่หน้าเดิม
  - ส่งลิงก์ให้คนอื่นก็เปิดเจอหน้าเดียวกัน
- **หลังแก้ไข/ลบ อยู่หน้าเดิม** (เดิม `load()` สั่ง `setPage(1)` ทุกครั้ง) — ถ้าลบคนสุดท้ายของหน้าสุดท้าย จะถอยไปหน้าก่อนหน้าให้เอง
- **เริ่มหน้า 1 เฉพาะตอนได้ผลลัพธ์ชุดใหม่:** ค้นหา / เปลี่ยนรุ่น / เพิ่มคนใหม่ (คนใหม่อยู่บนสุด) / นำเข้า Excel
- ปุ่ม "กลับ" ในหน้ารายละเอียด (`PersonDetail.jsx`) เปลี่ยนเป็นย้อนประวัติ (`navigate(-1)`) แทนการเปิด `/persons` ใหม่ — มาจากหน้าติดตามผลก็กลับไปหน้าติดตามผล ถ้าเปิดลิงก์ตรงไม่มีประวัติค่อยไปหน้ารายชื่อ
- เขียน URL เฉพาะตอนผู้ใช้กด ไม่เขียนตอนโหลดข้อมูลเสร็จ กันกรณีกดเข้าหน้าอื่นระหว่างโหลดแล้วโดนดึงกลับมาหน้ารายชื่อ

### คำสั่งที่ใช้
```bash
# verify: คุม Edge headless ด้วยข้อมูลทดสอบ 25 คน (3 หน้า) — ผ่าน 6/6
node browser-paging-test.cjs   # หน้า 2 → ดูรายละเอียด→กลับ / แก้ไข→บันทึก / F5 / ปุ่ม back = ยังหน้า 2
                               # ค้นหาใหม่ = กลับหน้า 1 + รุ่นที่เลือกไม่หาย
cd frontend && npm run build
ssh -i ~/.ssh/kmutt_vps root@66.42.63.65 "/opt/kmutt/deploy.sh"
```

---

## 13 กันยายน 2569

### แก้ปัญหา deploy แล้วผู้ใช้ยังเห็นของเก่า

> อาการ: deploy เทมเพลต 22 คอลัมน์ขึ้นเซิร์ฟเวอร์แล้ว แต่กดดาวน์โหลดจากเว็บยังได้ไฟล์ 10 คอลัมน์เดิม

- **สาเหตุ:** เบราว์เซอร์ยัง cache `index.html` + service worker เก่าไว้ (แอปเป็น PWA) เลยโหลดโค้ดชุดเดิม
  และไฟล์ที่ดาวน์โหลดมาชื่อซ้ำกับตัวเก่าใน Downloads แยกไม่ออกว่าอันไหนใหม่
- **แก้ฝั่งเว็บ:** ตั้ง Cache-Control ใน nginx ให้ถูกหลัก
  - `index.html` + `sw.js` → `no-cache, no-store, must-revalidate` (เปลือกแอป ต้องได้ตัวใหม่เสมอ)
  - `/assets/` → `max-age=31536000, immutable` (ไฟล์มี hash ในชื่ออยู่แล้ว cache ยาวได้ปลอดภัย)
  - เก็บสำเนา config ไว้ใน repo ที่ `docs/deploy/nginx-kmutt.conf` (ของจริงอยู่ที่ `/etc/nginx/sites-enabled/kmutt`)
- **แก้ฝั่งไฟล์:** เปลี่ยนชื่อไฟล์เทมเพลตเป็น `เทมเพลตนำเข้าคนพิการ-v2-มีที่อยู่.xlsx` เห็นปุ๊บรู้ปั๊บว่าตัวใหม่
- **บทเรียน:** แก้ config บนเซิร์ฟเวอร์ อย่ายิง `sed` ที่มี `# บันทึกการพัฒนา — ระบบฐานข้อมูลคนพิการ มจธ.

> ผู้พัฒนา: Suthat Srisawat  
> URL ระบบ: https://kmutt-pwd.duckdns.org  (VPS Vultr สิงคโปร์)

---

## เทคโนโลยีที่ใช้พัฒนา

### Frontend
| เทคโนโลยี | หน้าที่ |
|-----------|---------|
| React 19 | Framework หลัก |
| Vite | Build tool |
| Tailwind CSS 4 | Styling |
| DaisyUI 5 | UI Component library |
| React Router 7 | Routing |
| Axios | HTTP client เรียก API |
| Recharts | กราฟใน Dashboard |
| Lucide React | Icons |
| Google Fonts (Sarabun) | ฟอนต์ภาษาไทย |

### Backend
| เทคโนโลยี | หน้าที่ |
|-----------|---------|
| Node.js + Express 5 | Web server |
| Prisma 7 | ORM จัดการ database |
| PostgreSQL | ฐานข้อมูลหลัก |
| JWT (jsonwebtoken) | Authentication |
| bcryptjs | เข้ารหัสรหัสผ่าน |
| CORS | จัดการ cross-origin |

### Deploy / Infrastructure
| บริการ | ใช้ทำอะไร |
|--------|----------|
| Vercel | Host frontend |
| Render | Host backend + PostgreSQL |
| GitHub | Source code + auto deploy |

---

 ผ่าน ssh (shell กิน $ จน config พัง)
  ให้ `scp` ไฟล์ทั้งไฟล์ขึ้นไปแทน แล้ว `nginx -t` ก่อน reload เสมอ

### คำสั่งที่ใช้
```bash
# deploy (ตอนนี้มี SSH key แล้ว รันจากเครื่องตัวเองได้เลย)
ssh -i ~/.ssh/kmutt_vps root@66.42.63.65 "/opt/kmutt/deploy.sh"

# แก้ nginx อย่างปลอดภัย: backup -> scp ไฟล์ใหม่ -> test -> reload
scp -i ~/.ssh/kmutt_vps nginx-kmutt.conf root@66.42.63.65:/tmp/kmutt-new.conf
ssh -i ~/.ssh/kmutt_vps root@66.42.63.65 "cp /tmp/kmutt-new.conf /etc/nginx/sites-enabled/kmutt && nginx -t && systemctl reload nginx"

# verify: เช็ค header ที่เสิร์ฟจริง
curl -sI https://kmutt-pwd.duckdns.org/ | grep -i cache-control          # ต้องได้ no-store
curl -sI https://kmutt-pwd.duckdns.org/assets/<file>.js | grep -i cache  # ต้องได้ immutable
```

---

### นำเข้า Excel — เพิ่มที่อยู่ปัจจุบันและข้อมูลติดต่อ

> เดิมนำเข้าได้แค่ 10 ช่อง ที่อยู่ต้องมานั่งกรอกเองทีละคน

- **เทมเพลตเพิ่มเป็น 22 คอลัมน์** — ของเดิม + โทรศัพท์บ้าน, อีเมล และที่อยู่ครบทุกช่องตามฟอร์ม:
  เลขที่, หมู่ที่, อาคาร/หมู่บ้าน, ชั้นที่, ซอย, ถนน, แขวง/ตำบล, เขต/อำเภอ, จังหวัด, รหัสไปรษณีย์, สถานที่ใกล้เคียง
- **รับชื่อหัวคอลัมน์ได้หลายแบบ** — เช่น "เลขที่" หรือ "บ้านเลขที่", "แขวง/ตำบล" หรือ "ตำบล" กันคนแก้หัวตารางแล้วข้อมูลหาย
- **backend** (`persons.js` → `POST /import`) บันทึกฟิลด์ใหม่ทั้งหมด พร้อมตัดความยาวตาม VarChar ของ schema กันแถวเดียวพังทั้งไฟล์
- **ตารางตัวอย่างก่อนนำเข้า** เปลี่ยนคอลัมน์ "จังหวัด" เป็น **"ที่อยู่"** (ย่อ + hover ดูเต็ม) จะได้เห็นว่าอ่านที่อยู่จากไฟล์ได้ครบจริงไหม
- รหัสไปรษณีย์กรองเฉพาะตัวเลขให้อัตโนมัติ

### คำสั่งที่ใช้
```bash
node test_import.cjs      # verify: สร้าง .xlsx ตามเทมเพลตใหม่ แล้วอ่านกลับ — ที่อยู่เข้าครบ 11 ช่อง
                          #         ทดสอบทั้งแถวกรอกครบ และแถวกรอกไม่ครบ + วันเกิดแบบ Date จาก Excel
cd frontend && npm run build
```

---

## 28 สิงหาคม 2569

### แก้บั๊ก — นำเข้า Excel แล้ววันเกิด/อายุเพี้ยน

> อาการ: นำเข้าคนที่เกิด 15/5/2539 แล้วระบบขึ้น "14/05/3082 (-513 ปี)"

- **สาเหตุ:** `parseBirth()` ใน `PersonList.jsx` มีทางลัด `if (v instanceof Date) return v.toISOString()...`
  - Excel ไม่รู้จัก พ.ศ. — พิมพ์ 15/5/2539 มันเก็บเป็นวันที่ **ค.ศ. 2539** แล้ว SheetJS (`cellDates: true`) ส่งมาเป็น Date
  - ทางลัดนี้ไม่ได้ลบ 543 (ต่างจากทางที่รับเป็นข้อความซึ่งลบให้) → เก็บปี 2539 เป็น ค.ศ. พอหน้าเว็บบวก 543 ตอนแสดงจึงได้ 3082 และอายุติดลบ
  - `toISOString()` แปลงเป็น UTC ด้วย → วันถอยไป 1 วันจากเวลาไทย (+7) เลยกลายเป็น 14 แทน 15
- **แก้:** รวมการแปลงไว้ที่ `toISO()` ตัวเดียว ลบ 543 เมื่อปี > 2400 ทุกทางเข้า และเคส Date อ่านค่าตามเวลาเครื่อง (`getFullYear/getMonth/getDate`) ไม่ใช้ `toISOString()`
- **กันพลาดซ้ำ:** ตารางตัวอย่างก่อนนำเข้าเพิ่มคอลัมน์ **วันเกิด** (แสดงเป็น พ.ศ.) ถ้าอ่านวันเกิดไม่ได้จะขึ้น "—" สีแดงให้เห็นก่อนกดนำเข้า
- **ข้อมูลเดิมที่นำเข้าผิดไปแล้ว:** เพิ่มสคริปต์ `backend/scripts/fix-buddhist-birthdates.cjs` — หาคนที่ปีเกิดเป็นอนาคตแล้วลบ 543 (ดูก่อนได้ ไม่ใส่ `--apply` จะไม่แก้จริง)

### คำสั่งที่ใช้
```bash
node test_birth.cjs                                    # verify: 11 เคส (Date/ข้อความ/ISO, พ.ศ.+ค.ศ.) ผ่านหมด
cd frontend && npm run build
cd backend && node scripts/fix-buddhist-birthdates.cjs           # ดูรายชื่อที่ปีเพี้ยน
cd backend && node scripts/fix-buddhist-birthdates.cjs --apply   # แก้จริง
```

---

### เอกสาร — คู่มือการใช้งานฉบับใหม่ (PDF 16 หน้า)

> รื้อคู่มือเดิม (ฉบับ 30 มิ.ย.) ทำใหม่ทั้งเล่ม ทั้งเนื้อหาและดีไซน์

- **เนื้อหาตรงกับระบบปัจจุบัน** — เดิมยังชี้ URL Vercel และไม่มีฟีเจอร์ที่เพิ่มหลังจากนั้น
  - แก้ URL เป็น `https://kmutt-pwd.duckdns.org`
  - เพิ่มบท **นำเข้าข้อมูลจากไฟล์ Excel**, **หลักสูตรต่อรุ่น (สูงสุด 4)**, **Export Excel (.xlsx)**, ช่องชื่อเล่น, จังหวัดแบบ dropdown 77 จังหวัด
  - เพิ่มบท **รู้จักหน้าจอและเมนู** (ภาพจำลอง sidebar + สัญญาณแจ้งเตือน + dark mode)
  - เพิ่ม **ภาคผนวก ข — ปัญหาที่พบบ่อย** 12 อาการพร้อมวิธีแก้
  - รวม 12 บท + 2 ภาคผนวก = 16 หน้า A4
- **ดีไซน์ใหม่** — ปกโลโก้ มจธ. บนพื้นไล่สีส้ม, หัวบทเลขกลม gradient, running head/footer + เลขหน้าทุกหน้า, การ์ด tip/warn/note, ตารางหัวส้ม, flow diagram
- **คุมให้ 1 บท = 1 หน้าพอดี** — วัดความสูงจริงทุกหน้าในเบราว์เซอร์จนได้ 1123px เท่ากันหมด ไม่มีหน้าไหนล้นไปหน้าถัดไป (PDF ออกมา 16 หน้าเป๊ะ)
- ไฟล์: `docs/คู่มือการใช้งาน.pdf` + `.html` และวางสำเนาไว้ที่ Desktop

### คำสั่งที่ใช้
```bash
# ประกอบ HTML (CSS + body + โลโก้ base64) แล้ว render เป็น PDF
node build.cjs
msedge --headless=new --no-pdf-header-footer --print-to-pdf=manual.pdf file:///.../manual.html

# verify ก่อนบอกเสร็จ: ดูด้วยตาทีละหน้า + วัดความสูงจริง + นับหน้า PDF
node preview.cjs                                             # แตกไฟล์ preview ทีละหน้า
msedge --headless=new --window-size=794,1123 --screenshot=shot_N.png file:///.../pv_N.html
msedge --headless=new --dump-dom file:///.../measure.html    # วัดความสูงทุกหน้า
```

---

## 14 สิงหาคม 2569

### แก้บั๊ก — เปลี่ยนบทบาทเป็น Admin แล้วไม่ได้สิทธิ์

> อาการ: ตั้งผู้ใช้เป็น "ผู้ดูแลระบบ" แล้ว แต่เจ้าตัวไม่เห็นเมนู "จัดการผู้ใช้" และเพิ่มผู้ใช้ไม่ได้

- **สาเหตุ:** สิทธิ์ถูกจำไว้ตั้งแต่ตอนล็อกอิน 2 ที่ — role ฝังใน JWT (อายุ 8 ชม.) และ role ใน `sessionStorage` ของหน้าเว็บ เปลี่ยนบทบาทใน DB ทีหลังจึงไม่มีผลจนกว่าจะล็อกอินใหม่
- **Backend** (`middleware/auth.js`) — อ่าน role จาก database ทุก request แทนการเชื่อ token
  - เปลี่ยนบทบาท/ปิดบัญชี **มีผลทันที** ไม่ต้องรอ token หมดอายุ
  - บัญชีที่ถูกปิดใช้งาน (`isActive = false`) โดนตัดสิทธิ์กลางคัน ตอบ 401 (เดิมยังใช้ระบบต่อได้จนกว่า token หมดอายุ — ช่องโหว่ความปลอดภัย)
- **Frontend** (`context/AuthContext.jsx`) — เปิดแอปพร้อม session เดิมจะ sync ข้อมูลตัวเองจาก `/auth/me` (แทน `/health` ที่เรียกไว้ warm server) → รีเฟรชหน้าเดียวเมนูตามสิทธิ์ใหม่ขึ้นเลย

### คำสั่งที่ใช้
```bash
cd backend && npm run dev                       # รันทดสอบ local
node scratchpad/test-role.cjs                   # verify: STAFF→403, เลื่อนเป็น ADMIN ด้วย token เดิม→200, ปิดบัญชี→401
cd frontend && npm run build
git add -A && git commit -m "..." && git push
/opt/kmutt/deploy.sh                            # บน VPS
```

---

## 11 กรกฎาคม 2568

> ปรับระบบตามเอกสาร "ข้อมูลให้ปรับระบบ ณ วันที่ 10 กรกฎาคม 2569" (5 ข้อ)

### ฟีเจอร์ใหม่
- **นำเข้าข้อมูลคนพิการจากไฟล์ Excel** — ปุ่ม "นำเข้า Excel" ในหน้าข้อมูลคนพิการ
  - ดาวน์โหลดเทมเพลต (.xlsx) → กรอก → อัปโหลด → ดูตัวอย่าง → นำเข้าทีละหลายคน
  - รองรับคอลัมน์: ชื่อ-นามสกุล, ชื่อเล่น, เลขบัตร, เพศ, วันเกิด, เบอร์โทร, จังหวัด, ระดับการศึกษา, รุ่นที่, ปี
  - แปลงวันเกิด พ.ศ.→ค.ศ., แมปเพศ/รุ่นอัตโนมัติ, รายงานแถวที่ผิด (บัตรซ้ำ/ไม่ครบ 13)
  - endpoint `POST /api/persons/import`
- **ระบบหลักสูตรต่อรุ่น (1-4 หลักสูตร/รุ่น)** — ที่หน้าจัดการรุ่น แต่ละรุ่นแสดง/จัดการ:
  - จำนวนคนรวมทั้งรุ่น, จำนวนหลักสูตร, ชื่อหลักสูตร, จำนวนคนแต่ละหลักสูตร
  - เพิ่ม/แก้/ลบหลักสูตรได้ (สูงสุด 4), assign คนเข้าหลักสูตรผ่านฟอร์มคนพิการ
  - model ใหม่ `Course` + `Person.courseId` (migration `add_courses_per_batch`)

### ปรับ UI
- **แยกรุ่นเป็น Dropdown** — เปลี่ยนปุ่มยาวๆ ในหน้าข้อมูลคนพิการเป็น dropdown
- **จังหวัดเป็น Dropdown** — เลือกจาก 77 จังหวัด (เดิมพิมพ์เอง) เก็บค่าเดิมที่ไม่ตรง list ไว้ กันข้อมูลหาย
- **Report แบบประเมินรายวิชา** — เปลี่ยนชื่อเป็น "แบบประเมินรายวิชา / Transcript" + การ์ดกรอบเทาจาง (ยังไม่เปิดใช้ สำหรับอนาคต)

### คำสั่งที่ใช้
```bash
cd backend && npx prisma migrate dev --name add_courses_per_batch && npx prisma generate
cd frontend && npm run build
# verify: Edge headless screenshot/print-to-pdf ทุกงาน UI ก่อน push
git add -A && git commit -m "..." && git push
```

---

## 6 กรกฎาคม 2568

### ฟีเจอร์ใหม่
- **Export Excel (.xlsx)** — ปุ่ม "Excel" ในหน้าออกรายงาน สร้างไฟล์ Excel จริงด้วย SheetJS (`xlsx`)
  - รองรับ 3 รายงาน: รายชื่อคนพิการ / แบบสังเกตพฤติกรรม / แบบประเมินรายวิชา (แต่ละอันคอลัมน์ของตัวเอง)
  - ตั้งชื่อไฟล์ตามวันที่อัตโนมัติ
- **ช่องชื่อเล่น (nickname)** — เพิ่มในฟอร์มเพิ่ม/แก้ไขคนพิการ (ไม่บังคับ) แสดงในรายงานรายชื่อ + แบบสังเกต
  - full-stack: migration `add_person_nickname` (คอลัมน์ nullable) + backend (GET/POST/PUT) + frontend
- **Certificate เลือกกรองรุ่นได้** — เพิ่มปุ่มกรอง "แยกตามรุ่น" เหมือนหน้ารายชื่อ เลือกทั้งรุ่นออก Certificate ในคลิกเดียว

### ปรับดีไซน์รายงาน
- **สไตล์เอกสารราชการทุกรายงาน (ตอนพิมพ์)** — เส้นตารางดำคม หัวตารางพื้นเทาตัวหนา
  - รายชื่อ + แบบสังเกต = แนวตั้ง (บีบฟอนต์พอดีหน้า ครบทุกคอลัมน์ ไม่ตกขอบ)
  - แบบประเมินรายวิชา = แนวนอน (`@page landscape` เฉพาะรายงานนี้), ตารางสัดส่วน `table-fixed` %, แถวสูงพอเขียนคะแนน
- **ตัวอย่างบนจอ** — ทุกรายงานจัดกึ่งกลางพอดี ไม่ยืดเต็มจอ (ใช้ `@media screen` เฉพาะจอ ไม่แตะ print)
- **เอาขีด "—" ออก** — ช่องที่ไม่มีข้อมูลปล่อยว่างสะอาดตา ทุกรายงาน (รวมรายงานส่งบริษัท)

### เบื้องหลัง / วิธีทำงาน
- ปรับตารางรายชื่อตอนพิมพ์วนหลายรอบ → revert กลับจุดเริ่มต้นวันนี้แล้วค่อยทำใหม่ทีละอย่าง
- เริ่มใช้ **Edge headless render PDF/screenshot ตรวจงานพิมพ์ด้วยตาก่อน push ทุกครั้ง**

### คำสั่งที่ใช้
```bash
cd frontend && npm install xlsx        # SheetJS
cd backend && npx prisma migrate dev --name add_person_nickname
cd backend && npx prisma generate
cd frontend && npm run build
# ตรวจงานพิมพ์: msedge --headless=new --print-to-pdf=out.pdf file:///<html>
git add -A && git commit -m "..." && git push
```

---

## 30 มิถุนายน 2568

### ฟีเจอร์ใหม่ / UI
- **ระบบ Toast กลางทั้งเว็บ** — เลิกใช้ `alert()`/`confirm()` ของ browser เปลี่ยนเป็น toast เด้งกลางบนจอ
  - 🟢 เขียว = สำเร็จ (เพิ่ม/แก้/ลบ/อัปโหลด/บันทึกประเมิน)
  - 🔴 แดง = ไม่ผ่าน (กรอกไม่ครบ บอกชัดว่าขาดช่องไหน / บันทึก-ลบไม่สำเร็จ / ไฟล์ใหญ่เกิน)
  - 🗑️ Popup ยืนยันลบสวยๆ พร้อมไอคอน + ปุ่มแดง + ข้อความเตือน "กู้คืนไม่ได้" แทน `confirm()`
  - ครอบคลุม: PersonList, PersonDetail (อบรม/งาน/ทักษะ/ติดตามผล/ประเมิน/รูป/องค์กร/ความพิการ), BatchPage, OrganizationList, UserManagement
  - ไฟล์ใหม่ `context/ToastContext.jsx` + animation `pop-in`/`fade-in` ใน index.css
  - เพิ่ม confirm ให้จุดที่เดิมลบทันทีไม่ถาม (อบรม/ทักษะ/งาน/ติดตามผล/องค์กร/ความพิการ)
- **คู่มือการใช้งานอัปเดต** — เพิ่มหัวข้อ "จัดการรุ่น" + "ประเมินทักษะ", อัปเดตข้อมูลคนพิการ (รุ่นบังคับ + 7 แท็บ), Dashboard (รุ่นปัจจุบัน), รายงาน 4→5 ประเภท (เพิ่มแบบประเมินรายวิชา)

### เสถียรภาพ / ความเร็ว
- **เพิ่ม Database Index 13 ตัว** — เดิม foreign key ไม่มี index เลย (Postgres ไม่สร้างให้อัตโนมัติ) ทำให้ดึง training/skill/followup/ฯลฯ ของแต่ละคนต้อง scan ทั้งตาราง
  - เพิ่ม index บน `person_id` ทุกตารางลูก + `disability_type_id`, `employment_status`, `org_id`, `batch_id`, `province`
  - ผล: query เร็วขึ้นมาก (โดยเฉพาะเมื่อข้อมูลเยอะ) + การลบแบบ cascade เร็วขึ้น
  - migration `add_performance_indexes` (CREATE INDEX ล้วน ไม่แตะข้อมูล — ปลอดภัย 100%) จะ apply เข้า Neon อัตโนมัติตอน deploy
- **Light mode ลดความสว่าง** — พื้นหลัง `#fff7ed` → `#f4ede3` (ครีมอุ่น) + การ์ดขาว `#fff` → `#fffdfa` ลดอาการแสบตา

### คำสั่งที่ใช้
```bash
# เพิ่ม index ใน schema.prisma แล้วสร้าง migration
cd backend
npx prisma migrate dev --name add_performance_indexes

# build frontend ทดสอบ
cd frontend
npm run build

# commit + push (ทำหลายรอบตามแต่ละงาน)
git add -A && git commit -m "..." && git push origin main
```

---

## 29 มิถุนายน 2568

### ฟีเจอร์ใหม่
- **ระบบรุ่น (Training Batch)** — หน้า "จัดการรุ่น" (`/batches`) CRUD รุ่นการฝึกอบรม ระบุรุ่นที่, ปี, วันเริ่ม-สิ้นสุด, สถานะ Active/Completed
- **ระบบประเมินทักษะ** — Tab ที่ 7 ใน PersonDetail บันทึกผลประเมินแยกตามรุ่น ประกอบด้วย:
  - Pre-test / Post-test (คะแนน 0–100)
  - Soft Skills 4 ด้าน: การสื่อสาร, การบริหารเวลา, การจูงใจตนเอง, การทำงานตามหน้าที่ (0–5 คะแนน)
  - แสดง progress bar + สรุปคะแนนรวมทุกรุ่น
- **แบบประเมินรายวิชา (Report ใหม่)** — ตารางกรอกคะแนน 5 หัวข้อ รวม 25 คะแนน พร้อมรูปถ่ายของผู้เข้ารับการอบรม
- **Filter แยกรุ่น** — ในหน้าออกรายงาน สามารถ filter รายชื่อตามรุ่นได้
- **Dashboard Status รุ่น** — แสดงรายการรุ่นทั้งหมด + สถานะ บน Dashboard พร้อมลิงก์ไปจัดการรุ่น
- **แก้รูปไม่แสดงตอนพิมพ์** — เพิ่ม `print-color-adjust: exact` ให้รูปถ่ายแสดงครบทุกหน้าเวลาพิมพ์/บันทึก PDF
- **ผูกคนพิการกับรุ่น (Batch Enrollment)** — เพิ่ม `batchId` ใน Person, เลือกรุ่นได้ในฟอร์มเพิ่ม/แก้ไขคนพิการ
- **รายชื่อแยกรุ่นใช้ได้จริง** — ปุ่มกรองรุ่นในหน้ารายชื่อคนพิการ + หน้ารายงาน (เดิม filter รายงานกดแล้วไม่ทำงาน), แท็บประเมินเลือกรุ่นที่คนสังกัดให้อัตโนมัติ
- **พัฒนาการ Pre→Post** — ประวัติประเมินแสดงส่วนต่างคะแนน (เพิ่มขึ้น/ลดลงกี่คะแนน) พร้อมไอคอน

### แก้ไข / เสถียรภาพ
- **Validation คะแนนฝั่ง backend** — Pre/Post จำกัด 0–100, Soft Skills 0–5, ค่าที่ไม่ใช่ตัวเลข → null กันข้อมูลเพี้ยน
- **แก้ dev script** — `npx prisma generate --no-engine` ใช้ไม่ได้กับ Prisma 7 (server ไม่ start) → ตัด `--no-engine` ออก
- **แก้บั๊ก Tailwind dynamic class** — การ์ด Soft Skills ใช้ `bg-${color}-50` ที่ JIT ไม่ generate → เปลี่ยนเป็น static class
- **Dark mode หน้าใหม่** — เพิ่ม override การ์ดสีพาสเทล (blue/emerald/violet/pink/cyan) ให้เข้าธีมมืด
- **UI ลื่นขึ้น** — BatchPage reload แบบ silent (ไม่ขึ้น spinner กระพริบตอนแก้ข้อมูล)
- **Build สะอาด** — ย้าย `@import` ฟอนต์ขึ้นบนสุด แก้ CSS warning ตอน build

### การทดสอบ
- ทดสอบ backend API ครบ 15 เคส (batch CRUD, person+batch filter, assessment upsert, cascade delete) — ผ่านทั้งหมด
- ทดสอบ validation/clamp คะแนน 5 เคส (999→100, 99→5, -50→0, "abc"→null, 75→75) — ผ่านทั้งหมด
- frontend build ผ่าน ไม่มี error/warning

### คำสั่งที่ใช้
```bash
# migrate database (รอบนี้เพิ่ม 2 migration)
cd backend && npx prisma migrate dev --name add_training_batch_assessment
cd backend && npx prisma migrate dev --name add_person_batch_enrollment
npx prisma generate   # สำคัญ: migrate dev ในโปรเจกต์นี้ไม่ได้ regenerate client อัตโนมัติ

# รัน frontend / backend
cd frontend && npm run dev
cd backend && npm run dev

# build ตรวจสอบ
cd frontend && npm run build
```

---

## 9 มิถุนายน 2568

### แก้ไขและปรับปรุง
- **แก้คำผิด** `สายตาความพิการ` → `สาเหตุความพิการ` ในรายงาน + Help page
- **Performance** — เพิ่ม in-memory cache (frontend + backend), axios timeout 20s, singleton rewarm interceptor
- **Backend always-awake** — GitHub Actions cron ping `/api/health` ทุก 10 นาที
- **ErrorBoundary + ReconnectingBanner** — แสดง banner เหลือง-ส้มเมื่อเชื่อมต่อใหม่
- **Post-login stuck fix** — health endpoint ตรวจสอบ DB (`SELECT 1`) ก่อน navigate
- **Dark mode** — แก้ขอบขาวบน chart cards, ลาก Recharts grid/axis สี dark ด้วย CSS
- **Print fix** — `* { color: black !important }` ใน `@media print` แก้ตัวหนังสือสีเทาเวลาพิมพ์
- **Certificate logo** — เปลี่ยนเป็น `logo_kmutt_กลม.jpg` (โลโก้วงกลม)
- **จัดโครงสร้างไฟล์** — ลบไฟล์ Vite template เดิม (`App.css`, `assets/`), ย้าย PDF + logo เข้า `docs/`

### คำสั่งที่ใช้
```bash
# รัน frontend / backend
cd frontend && npm run dev
cd backend && npm run dev
```

---

## 28 พฤษภาคม 2568

### ฟีเจอร์ใหม่
- **ข้อมูลความพิการ (Disability Info CRUD)** — เพิ่ม/ลบประเภทความพิการในหน้า PersonDetail tab "ข้อมูลพื้นฐาน" และใน modal เพิ่ม/แก้ไขคนพิการ รองรับทั้ง 7 ประเภทความพิการ
- **คำนำหน้าชื่อ** — เพิ่ม dropdown นาย/นาง/นางสาว/เด็กชาย/เด็กหญิง ในฟอร์มเพิ่ม/แก้ไขคนพิการ ไม่ต้องพิมพ์คำนำหน้าเอง
- **บังคับเลือกประเภทความพิการ** — ฟอร์มเพิ่มคนพิการใหม่ต้องเลือกประเภทความพิการทุกครั้ง
- **Toast Notification Login** — popup แจ้งเตือนเมื่อ login สำเร็จ (สีเขียว) และ login ผิด (สีแดง) พร้อม animation bounce-in

### Mobile Responsive
- **OrganizationList** — เปลี่ยนเป็น horizontal scroll table (เลื่อนซ้าย-ขวาได้)
- **UserManagement** — เพิ่ม horizontal scroll table
- **FollowUpList** — เพิ่ม horizontal scroll table

### Bug fixes
- **VITE_API_URL ไม่ถูกต้องใน production** — เพิ่มไฟล์ `.env.production` ชี้ไปที่ Render backend
- **CORS ไม่อนุญาต Vercel** — เพิ่ม `https://kmutt-pwd-db.vercel.app` ใน allowedOrigins
- **Toast ไม่ขึ้นเมื่อ login ผิด** — แก้ interceptor ให้ข้าม redirect เมื่อเป็น `/auth/login` endpoint
- **Dashboard กราฟ "ประเภทความพิการ" ว่างเปล่า** — เพิ่ม API + UI ให้กรอกข้อมูลความพิการได้

### ไฟล์ที่เปลี่ยน
| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `backend/src/routes/persons.js` | เพิ่ม routes disability-types, /:id/disability (GET/POST/DELETE) |
| `backend/src/index.js` | เพิ่ม Vercel origin ใน CORS |
| `backend/src/reset-admin.js` | **สร้างใหม่** — script reset password admin |
| `backend/package.json` | เพิ่ม script `reset-admin` |
| `frontend/.env.production` | **สร้างใหม่** — VITE_API_URL สำหรับ production |
| `frontend/src/api/index.js` | เพิ่ม disability API functions, fix interceptor |
| `frontend/src/pages/PersonDetail.jsx` | เพิ่ม disability CRUD UI ใน tab 0 |
| `frontend/src/pages/PersonList.jsx` | เพิ่ม name prefix dropdown, disability dropdown ใน modal |
| `frontend/src/pages/OrganizationList.jsx` | Horizontal scroll table |
| `frontend/src/pages/UserManagement.jsx` | Horizontal scroll table |
| `frontend/src/pages/FollowUpList.jsx` | Horizontal scroll table |
| `frontend/src/pages/Login.jsx` | Toast notification component |
| `frontend/src/index.css` | เพิ่ม `@keyframes bounce-in` animation |

---

## 26 พฤษภาคม 2568

### ฟีเจอร์ใหม่
- **หน้าคู่มือการใช้งาน** — เพิ่มเมนู "คู่มือการใช้งาน" ในระบบ layout 2 คอลัมน์ พร้อมเนื้อหา 8 หัวข้อครบถ้วน (ภาพรวม, เข้าสู่ระบบ, สิทธิ์ 3 ระดับ, ข้อมูลคนพิการ, อบรม, ติดตามผล, สถานประกอบการ, จัดการผู้ใช้)
- **ช่วงเวลา pill style** — ปรับการแสดงวันที่ช่วงเวลาในทุกแท็บของ PersonDetail และ TrainingList ให้เป็น pill ส้ม → pill เทา พร้อมแสดงปีเป็น พ.ศ. (เช่น 01/05/2568 → 31/10/2568)
- **Viewport fit** — ปรับ PersonList ให้พอดีหน้าจอโดยไม่มี scroll ใช้ `height: calc(100vh - 56px)` flex column, header/search compact ขึ้น, ใช้ `table-sm`
- **Pagination** — เพิ่มการแบ่งหน้าหน้าละ 10 รายการใน PersonList พร้อมปุ่มเลขหน้า, ← →, ellipsis
- **Gender badge พาสเทล** — ชาย = ฟ้าพาสเทล, หญิง = ชมพูพาสเทล
- **Thai date input (พ.ศ.)** — ทุก popup ที่มีฟิลด์วันที่ พิมพ์เป็น วว/ดด/ปปปป (พ.ศ.) แปลง BE↔AD อัตโนมัติ

### ไฟล์ที่เปลี่ยน
| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `frontend/src/pages/Help.jsx` | **สร้างใหม่** — หน้าคู่มือการใช้งาน |
| `frontend/src/components/Layout.jsx` | เพิ่มเมนู "คู่มือการใช้งาน" |
| `frontend/src/App.jsx` | เพิ่ม route `/help` |
| `frontend/src/pages/PersonDetail.jsx` | เพิ่ม `fmtDate`, `DateRange` component, แทนที่ช่วงเวลาทุกแท็บ |
| `frontend/src/pages/TrainingList.jsx` | เพิ่ม `fmtDate`, `DateRange` แทนที่ช่วงเวลา |
| `frontend/src/pages/PersonList.jsx` | Viewport fit layout, pagination, gender badge สี, Thai date input |

---

## 25 พฤษภาคม 2568

### ฟีเจอร์ใหม่
- **หน้าการอบรม & ฝึกงาน (TrainingList)** — สร้างหน้าใหม่แสดงเฉพาะคนที่มีข้อมูลอบรมจริงๆ แทนการแสดงรายชื่อคนพิการทั้งหมด
- **Form validation ใน PersonDetail** — แสดงข้อความแจ้งเตือนภาษาไทยแทน Prisma raw error ครบทุก form (training, workexp, followup, skill, personorg)
- **สถานภาพ "อื่นๆ" พิมพ์เองได้** — เลือก "อื่นๆ" ในช่องสถานภาพแล้วพิมพ์ระบุเองได้ เช่น หย่าร้าง, หม้าย
- **Validation เลขบัตร/เบอร์โทร** — เลขบัตรประชาชนใส่ได้เฉพาะตัวเลข max 13 หลัก / เบอร์โทร max 10 หลัก
- **Hero Banner Header** — ปรับ header ทุกหน้าให้เหมือน Dashboard (PersonList, OrganizationList, FollowUpList, UserManagement)
- **Deploy บน Cloud** — Frontend บน Vercel, Backend+DB บน Render

### Bug fixes
- แก้ `backend/src/routes/persons.js` PUT route — destructure เฉพาะ field ที่รู้จักแทน `...rest` กัน `id`, `createdAt`, `disabilityInfos` ปนไปใน Prisma data
- แก้ `frontend/src/pages/PersonList.jsx` `handleSave` — ส่งเฉพาะ field ของ form ไม่ส่ง field แปลกปลอมจาก API response

### ไฟล์ที่เปลี่ยน
| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `frontend/src/pages/TrainingList.jsx` | **สร้างใหม่** — หน้าการอบรม & ฝึกงาน |
| `frontend/src/pages/PersonDetail.jsx` | เพิ่ม validation ก่อน save ทุก form |
| `frontend/src/pages/PersonList.jsx` | Validation, hero banner, marital custom input, fix handleSave |
| `frontend/src/pages/OrganizationList.jsx` | Hero banner |
| `frontend/src/pages/FollowUpList.jsx` | Hero banner |
| `frontend/src/pages/UserManagement.jsx` | Hero banner |
| `backend/src/routes/persons.js` | Fix PUT route ไม่ส่ง field แปลกปลอมไป Prisma |
| `frontend/src/App.jsx` | เปลี่ยน route /training ใช้ TrainingList |
| `frontend/vercel.json` | **สร้างใหม่** — fix React Router refresh 404 |

---

## 24 พฤษภาคม 2568

### ฟีเจอร์ใหม่
- **ระบบ Login / JWT / Authentication** — เพิ่ม User model, middleware authenticate, route /auth/login และ /auth/me
- **สิทธิ์ผู้ใช้ 3 ระดับ** — ADMIN (ทุกอย่าง), STAFF (CRUD ข้อมูล), VIEWER (ดูอย่างเดียว)
- **หน้า Login** — ดีไซน์ธีมส้ม KMUTT พร้อมเครดิต "Developed by Suthat Srisawat 2026"
- **หน้าจัดการผู้ใช้** — Admin only เพิ่ม/แก้ไข/ลบ/เปิด-ปิดบัญชีผู้ใช้
- **PersonDetail Tab 6 ใหม่** — สถานประกอบการ (PersonOrganization)
- **PersonDetail เพิ่มฟิลด์** — skillsGained (อบรม), outcome (งาน), satisfaction+issues (ติดตามผล)
- **แสดงอายุอัตโนมัติ** — คำนวณจากวันเกิด
- **คู่มือการใช้งาน HTML** — ไฟล์ `คู่มือการใช้งาน.html` พิมพ์เป็น PDF ได้

### Bug fixes
- Organization delete ติด FK constraint → ลบ personOrg ก่อนลบ org
- FollowUpList ขาด satisfaction/issues columns
- PersonList search input style ไม่ตรงกับ app
- PersonList closing tag ผิด

### ไฟล์ที่เปลี่ยน
| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `backend/prisma/schema.prisma` | เพิ่ม User model |
| `backend/src/middleware/auth.js` | **สร้างใหม่** — JWT middleware |
| `backend/src/routes/auth.js` | **สร้างใหม่** — login/me endpoints |
| `backend/src/routes/users.js` | **สร้างใหม่** — CRUD users |
| `backend/src/routes/personorg.js` | **สร้างใหม่** — CRUD person-organization |
| `backend/src/routes/organizations.js` | Fix FK delete order |
| `backend/src/index.js` | เพิ่ม auth middleware, CORS env var |
| `frontend/src/context/AuthContext.jsx` | **สร้างใหม่** — Auth context + hook |
| `frontend/src/pages/Login.jsx` | **สร้างใหม่** — หน้า Login |
| `frontend/src/pages/UserManagement.jsx` | **สร้างใหม่** — จัดการผู้ใช้ |
| `frontend/src/pages/PersonDetail.jsx` | Tab 6, ฟิลด์ใหม่, สิทธิ์ Viewer |
| `frontend/src/pages/FollowUpList.jsx` | Fix columns |
| `frontend/src/components/Layout.jsx` | เพิ่ม user info, logout, admin menu |
| `frontend/src/api/index.js` | เพิ่ม auth API, VITE_API_URL |
| `คู่มือการใช้งาน.html` | **สร้างใหม่** — คู่มือ HTML |

---

## ข้อมูล Deploy

| ส่วน | URL |
|------|-----|
| Frontend (Vercel) | https://kmutt-pwd-db.vercel.app |
| Backend (Render) | https://kmutt-pwd-backend.onrender.com |
| GitHub | https://github.com/toey278577/kmutt-pwd-db |

**Login เริ่มต้น:** admin@kmutt.ac.th / admin123
