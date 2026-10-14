# CLAUDE.md — ระบบฐานข้อมูลคนพิการ มจธ.

> สรุปสำหรับ Sabastian เพื่อทำความเข้าใจ project นี้อย่างรวดเร็ว

---

## คือ project อะไร?

**ระบบฐานข้อมูลคนพิการ มจธ. (PWDs Database)**
web app สำหรับจัดการข้อมูลคนพิการในโครงการฝึกอบรม-ฝึกงาน มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี (มจธ.)

- **ระบบจริง:** https://kmutt-pwd.duckdns.org (VPS Vultr สิงคโปร์ — nginx + node)
- **บันทึกการพัฒนา:** `CHANGELOG.md` · **คู่มือผู้ใช้:** `docs/คู่มือการใช้งาน.pdf/.html`

---

## โครงสร้าง project

```
├── backend/                 ← Node.js + Express 5 + Prisma 7 + PostgreSQL
│   ├── src/
│   │   ├── index.js         ← entry point (helmet, rate limit, ผูก route ทั้งหมด)
│   │   ├── prismaClient.js
│   │   ├── reset-admin.js   ← npm run reset-admin (ลืมรหัสแอดมิน)
│   │   ├── middleware/
│   │   │   ├── auth.js      ← authenticate (JWT + อ่าน role จาก DB ทุก request), requireRole
│   │   │   └── audit.js     ← บันทึกทุกการเพิ่ม/แก้/ลบลง audit_logs อัตโนมัติ
│   │   ├── utils/province.js← ตรวจชื่อจังหวัด/ภูมิภาค
│   │   └── routes/          ← persons, training, workexp, followup, skills, personorg,
│   │                          photos, assessments, organizations, batches, dashboard,
│   │                          aggregate, auth, users, system, audit
│   ├── prisma/              ← schema.prisma, migrations/, seed.js (ประเภทความพิการ 7 ประเภท + แอดมิน)
│   ├── scripts/             ← backup-db, restore-db + สคริปต์ซ่อมข้อมูล fix-* / cleanup-orphan-photos (ดูก่อน, --apply แก้จริง)
│   ├── uploads/photos/      ← ไฟล์รูปถ่าย (ไม่ได้เก็บใน DB แล้ว)
│   └── backups/             ← ไฟล์สำรอง (ไม่ขึ้น git)
│
├── frontend/                ← React 19 + Vite + Tailwind 4 + DaisyUI 5 (PWA)
│   └── src/
│       ├── App.jsx          ← router (lazy load ทุกหน้า)
│       ├── api/index.js     ← axios client + cache เล็กๆ (utils/apiCache)
│       ├── context/         ← AuthContext, ThemeContext (dark mode), ToastContext
│       ├── components/      ← Layout (sidebar), ErrorBoundary, DangerZone (ปุ่มรีเซ็ตระบบ)
│       └── pages/           ← ดูตารางหน้าเว็บด้านล่าง
│
└── docs/deploy/             ← nginx-kmutt.conf, backup.sh (ตี 2 ทุกวัน เก็บ 14 วัน),
                               healthcheck.sh (ทุก 5 นาที กู้เอง + แจ้ง Telegram)
```

---

## วิธีรัน (เครื่อง dev)

```bash
cd backend && npm run dev      # port 5000 (รัน prisma generate ให้ด้วย)
cd frontend && npm run dev     # port 5173 (หรือ 5174)
cd backend && npm run seed     # ข้อมูลเริ่มต้น
cd backend && npx prisma migrate dev --name <ชื่อ>   # เปลี่ยน schema
```

- Backend API: http://localhost:5000/api · Health: `/api/health` (เช็ค DB ด้วย) · `/api/ping` (ไม่แตะ DB)
- DB dev: `postgresql://postgres:postgres123@localhost:5432/kmutt_pwd_db`
- ยังไม่มีชุดเทสต์อัตโนมัติ — ทดสอบโดยรัน server แล้วยิง API จริง

---

## ผู้ใช้ & สิทธิ์

- ล็อกอินด้วยอีเมล + รหัสผ่าน → JWT อายุ 8 ชม. เก็บใน `sessionStorage`
- role: `ADMIN` (ผู้ดูแลระบบ) · `STAFF` (เจ้าหน้าที่) · `VIEWER` (ผู้ดูข้อมูล)
- เฉพาะ ADMIN: จัดการผู้ใช้ (`/users`), ประวัติการใช้งาน (`/audit`), รีเซ็ตระบบ (`/api/system`)
- ล็อกอินผิดเกิน 8 ครั้ง / 15 นาที โดนบล็อก
- VIEWER อ่านอย่างเดียว — กันที่ `authenticate` (POST/PUT/PATCH/DELETE → 403) ไม่ต้องใส่เองทีละ route

---

## Database (15 ตาราง)

| ตาราง | ความหมาย |
|-------|----------|
| `persons` | ข้อมูลส่วนตัวคนพิการ (ชื่อ, บัตร 13 หลัก, ที่อยู่แยกช่อง, รุ่น/หลักสูตรที่สังกัด) |
| `disability_types` | ประเภทความพิการ (7 ประเภท) |
| `disability_infos` | ความพิการของแต่ละคน (ระดับ, อุปกรณ์, ข้อจำกัด) |
| `training_records` | ประวัติการอบรม/ฝึกงาน |
| `work_experiences` | ประวัติการทำงาน |
| `skills` | ทักษะ (BEGINNER/INTERMEDIATE/ADVANCED) |
| `follow_ups` | ติดตามผลหลังอบรม |
| `organizations` | สถานประกอบการ/นายจ้าง |
| `person_organizations` | คน ↔ องค์กร (ฝึกงาน/จ้างงาน + เงินสนับสนุน) |
| `person_photos` | รูปถ่าย (เก็บแค่ path ไฟล์) |
| `training_batches` | รุ่นอบรม (เลขรุ่น/ปี, สถานะ) |
| `courses` | หลักสูตรในแต่ละรุ่น (1-4 หลักสูตร) |
| `person_assessments` | คะแนน pre/post test + soft skill ต่อรุ่น |
| `users` | บัญชีผู้ใช้งานระบบ |
| `audit_logs` | ประวัติว่าใครเพิ่ม/แก้/ลบอะไร + ล็อกอิน (ไม่ผูก FK เก็บไว้แม้ข้อมูลถูกลบ) |

**สำคัญ:** เพิ่มตารางใหม่ต้องเพิ่มใน `scripts/backup-db.cjs` + `scripts/restore-db.cjs` และพิจารณา `WIPE_ORDER` ใน `routes/system.js` ด้วย (audit_logs ตั้งใจไม่ล้างตอนรีเซ็ต)

### Enum
```
Gender: MALE|FEMALE|OTHER          MaritalStatus: SINGLE|MARRIED|OTHER
LifeStatus: ALIVE|DECEASED         TrainingType: TRAIN|LEARN|EARN
WorkMode: INTERNSHIP|EMPLOYMENT|FREELANCE
SkillLevel: BEGINNER|INTERMEDIATE|ADVANCED
EmploymentStatus: EMPLOYED|UNEMPLOYED|STUDYING
SkillMatch: MATCH|NOT_MATCH        RoleType: INTERNSHIP|EMPLOYMENT|OTHER
BatchStatus: ACTIVE|COMPLETED      UserRole: ADMIN|STAFF|VIEWER
```

---

## API Endpoints หลัก (ทุกตัวต้องมี token ยกเว้น login/health/ping)

```
POST   /api/auth/login · GET /api/auth/me

GET/POST       /api/persons              ← รายชื่อ (filter/แบ่งหน้า) / เพิ่ม
POST           /api/persons/import       ← นำเข้า Excel (เทมเพลต v3 24 คอลัมน์ — รุ่น/หลักสูตร/ความพิการ/จังหวัด ไม่ตรง = ไม่นำเข้าทั้งไฟล์)
GET/PUT/DELETE /api/persons/:id
GET            /api/persons/disability-types

/api/persons/:id/{disability|training|workexp|followup|skills|personorg|photos|assessments}[/:subId]
GET            /api/persons/batch/:batchId/assessments

/api/organizations[/:id]  ·  /api/batches[/:id]  ·  /api/batches/:id/courses[/:courseId]
GET  /api/dashboard/stats  ·  /api/data/training-all  ·  /api/data/followup-all
GET  /api/data/followup-due   ← ใครถึงรอบติดตามผล 3ด/6ด/1ปี (คำนวณใน utils/followupDue.js)

ADMIN: /api/users[/:id] · /api/system/stats · POST /api/system/reset · GET /api/audit-logs
```

---

## หน้าเว็บ (Frontend)

| Route | หน้า | ไฟล์ |
|-------|------|------|
| `/login` | เข้าสู่ระบบ | `Login.jsx` |
| `/` | Dashboard สถิติ + กราฟ | `Dashboard.jsx` |
| `/persons` | รายชื่อคนพิการ + CRUD + นำเข้า Excel | `PersonList.jsx` |
| `/persons/:id` | รายละเอียดคนพิการ (หลายแท็บ + รูปถ่าย) | `PersonDetail.jsx` |
| `/training` | การอบรม & ฝึกงาน รวมทุกคน | `TrainingList.jsx` |
| `/followup` | ติดตามผลทุกคน | `FollowUpList.jsx` |
| `/organizations` | สถานประกอบการ | `OrganizationList.jsx` |
| `/batches` | จัดการรุ่น + หลักสูตร + ผลประเมิน | `BatchPage.jsx` |
| `/report` | ออกรายงาน (พิมพ์/PDF) | `ReportPage.jsx` |
| `/help` | คู่มือการใช้งาน | `Help.jsx` |
| `/users` | จัดการผู้ใช้ (ADMIN) | `UserManagement.jsx` |
| `/audit` | ประวัติการใช้งาน (ADMIN) | `AuditLog.jsx` |

---

## ธีม

- **Primary:** สีส้ม `orange-600` (#ea580c) · พื้นหลัง `orange-50` · การ์ดขอบ `orange-100`
- **Sidebar:** ไล่ส้มสว่าง `#fb923c → #c2410c` + ลายจุดจางๆ
- รองรับ dark mode (ThemeContext) · ฟอนต์ Sarabun

---

## ข้อควรรู้ / กับดักที่เคยเจอ

- วันเกิดจาก Excel อาจมาเป็นปี พ.ศ. → ต้องแปลงเป็น ค.ศ. (เคยเพี้ยนเป็นปี 3082)
- จังหวัดใน Excel ต้องสะกดตรง ไม่งั้นนำเข้าไม่ได้ (ดู `utils/province.js`)
- server อยู่หลัง nginx → ตั้ง `trust proxy` แล้ว `req.ip` เป็น IP จริงของผู้ใช้
- audit log ไม่เก็บ body ของ request (กันข้อมูลส่วนตัว/รหัสผ่านค้างใน log)
- eslint ยังมี error เก่าค้าง ~18 จุดใน PersonList / ReportPage ฯลฯ (setState ใน effect, ตัวแปรไม่ได้ใช้) — ทำงานปกติ แก้ทีละไฟล์พร้อมทดสอบ
- Dashboard: "ผู้เข้าอบรม" = คนในรุ่นหรือมีประวัติอบรม · "สถานะการมีงานทำ" นับคนจากผลติดตามล่าสุด · cache สถิติถูกล้างทุกครั้งที่เขียนข้อมูลสำเร็จ
- error จาก Prisma ถูกแปลงเป็นข้อความไทยกลางที่ `index.js` (ของจริงอยู่ใน log `[DB ERROR]`)
- route รายการย่อยของคน (`/persons/:id/<sub>/:subId`) ต้องเช็คเจ้าของด้วย `ensureOwned` + รับช่องด้วย `pick` (`utils/owned.js`) — อย่า spread `req.body` เข้า DB
- หน้าเว็บ: ชื่อ/คำนำหน้า/ตัวย่อ → `utils/name.js` · ช่องวันที่ พ.ศ. → `utils/useThaiDate.js` (ตรวจวันจริง/ปี ค.ศ.) · รูป → `utils/resizeImage.js` ย่อก่อนส่ง · โหลดพัง → `components/LoadError.jsx`
- ฟอร์มใหม่ทุกอัน: ใส่ตัวถามก่อนปิดเมื่อยังไม่บันทึก `utils/useDiscardGuard.js` + `components/DiscardBar.jsx` (arm ตอนเปิด, request ตอนปิด/Esc/คลิกนอกฟอร์ม)
- สีเทา `gray-400/500` ถูกปรับเข้มขึ้นใน `@theme` ของ `index.css` (ให้ตัวหนังสืออ่านง่าย ≥4.5:1) — **ห้ามปรับ `gray-300`** เพราะใช้เป็นเส้นขอบ 71 จุด · ตัวหนังสือห้ามใช้ gray-200/300
- ทดสอบหน้าเว็บจริง: backend :5000 + vite :5173 + Chrome `--headless=new --remote-debugging-port` แล้วสั่งผ่าน CDP (ใส่ token ใน sessionStorage แทนการล็อกอิน)

---

## สิ่งที่อาจทำต่อ

- ชุดเทสต์อัตโนมัติ (นำเข้า Excel, CRUD คนพิการ, สิทธิ์ผู้ใช้)
- ค้นหาขั้นสูง (กรองหลายเงื่อนไขพร้อมกัน)
- Export Excel
- แท็บ "ประวัติการแก้ไข" ในหน้ารายละเอียดคนพิการ (API รองรับ `?personId=` แล้ว)
- ย้ายสคริปต์ทดสอบ (scratchpad) เข้าโปรเจกต์ให้รันด้วย `npm test`
- เพิ่ม/แก้ประเภทความพิการผ่าน UI
