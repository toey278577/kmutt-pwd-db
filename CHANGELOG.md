# บันทึกการพัฒนา — ระบบฐานข้อมูลคนพิการ มจธ.

> ผู้พัฒนา: Suthat Srisawat  
> URL ระบบ: https://kmutt-pwd-db.vercel.app

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

### คำสั่งที่ใช้
```bash
# migrate database (เพิ่ม training_batches + person_assessments)
cd backend && npx prisma migrate dev --name add_training_batch_assessment

# รัน frontend / backend
cd frontend && npm run dev
cd backend && npm run dev
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
