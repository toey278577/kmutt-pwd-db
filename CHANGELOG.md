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

## 28 สิงหาคม 2569

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
