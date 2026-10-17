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
│   ├── prisma/              ← schema.prisma, migrations/, seed.js (ประเภทความพิการ 7 ประเภท เฉพาะตอนตารางว่าง + แอดมิน)
│   ├── scripts/             ← backup-db, restore-db + สคริปต์ซ่อมข้อมูล fix-* / cleanup-orphan-photos (ดูก่อน, --apply แก้จริง)
│   ├── uploads/photos/      ← ไฟล์รูปถ่าย (ไม่ได้เก็บใน DB แล้ว)
│   └── backups/             ← ไฟล์สำรอง (ไม่ขึ้น git)
│
├── frontend/                ← React 19 + Vite + Tailwind 4 + DaisyUI 5 (PWA)
│   └── src/
│       ├── App.jsx          ← router (lazy load ทุกหน้า)
│       ├── api/index.js     ← axios client + cache เล็กๆ (utils/apiCache)
│       ├── context/         ← AuthContext, ThemeContext (dark mode), ToastContext
│       ├── components/      ← Layout (sidebar), ErrorBoundary, DangerZone (ปุ่มรีเซ็ตระบบ), MobileCard (การ์ดแทนตารางบนมือถือ)
│       └── pages/           ← ดูตารางหน้าเว็บด้านล่าง
│
├── tests/                   ← ชุดทดสอบ (npm test): run.cjs ตัวรัน · lib.cjs ตัวช่วย · fixtures/seed.cjs ข้อมูลตั้งต้น
│                              unit/ (ฟังก์ชันล้วน) · api/ (ยิง API จริง) · e2e/ (กดหน้าเว็บจริงผ่าน Chrome headless)
│                              ผล + ภาพหน้าจอ → tests/.output/ (ไม่ขึ้น git)
│
└── docs/deploy/             ← ย้ายเครื่อง.md (ย้ายเซิร์ฟเวอร์ทีละขั้น) · กู้ข้อมูล.md · deploy.sh · backup.sh (ตี 2 ทุกวัน เก็บ 14 วัน)
                               healthcheck.sh (ทุก 5 นาที กู้เอง + แจ้ง Telegram) · kmutt-backend.service · 10-hardening.conf
                               nginx-kmutt.conf (ของจริงหลัง certbot) · nginx-kmutt-start.conf (เครื่องใหม่ก่อนมี https)
                               ⚠️ แก้ deploy.sh ที่นี่แล้วต้องก๊อปขึ้น /opt/kmutt/deploy.sh บนเครื่องด้วย (ตัวบนเครื่องไม่ได้อยู่ใน git)
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
- **ชุดทดสอบ:** `cd backend && npm test` (ทั้งหมด ~5 นาที) · `npm test -- unit|api|e2e|<ชื่อไฟล์บางส่วน>` → ดู `tests/` ด้านล่าง

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

**กู้ข้อมูลระบบจริง:** ทีละขั้นที่ `docs/deploy/กู้ข้อมูล.md` · ซ้อมกู้อัตโนมัติใน `npm test` (api/backup-restore) · โฟลเดอร์สำรองตั้งได้ด้วย `BACKUP_DIR` (`src/utils/backupDir.js`)

**สำคัญ:** เพิ่มตารางใหม่ต้องเพิ่มใน `scripts/backup-db.cjs` + `scripts/restore-db.cjs` (และ `MODELS` ใน `tests/api/backup-restore.test.cjs`) และพิจารณา `WIPE_ORDER` ใน `routes/system.js` ด้วย (audit_logs ตั้งใจไม่ล้างตอนรีเซ็ต)

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
POST   /api/auth/login · GET /api/auth/me · GET /api/auth/refresh (ต่อเวลาอีก 8 ชม. ต้องมีตั๋วที่ยังไม่หมด)

GET/POST       /api/persons              ← รายชื่อ / เพิ่ม · ?search= (ชื่อ ชื่อเล่น เลขบัตร เบอร์) &batchId= &gender= &province=
                                            &disabilityTypeId= &employment=EMPLOYED|UNEMPLOYED|STUDYING|NONE (ผลติดตามล่าสุด) · ส่ง followUps ล่าสุด 1 รายการมาด้วย
POST           /api/persons/import       ← นำเข้า Excel (เทมเพลต v3 24 คอลัมน์ — รุ่น/หลักสูตร/ความพิการ/จังหวัด ไม่ตรง = ไม่นำเข้าทั้งไฟล์)
GET/PUT/DELETE /api/persons/:id
GET            /api/persons/disability-types

/api/persons/:id/{disability|training|workexp|followup|skills|personorg|photos|assessments}[/:subId]   ← รายการย่อย แก้ (PUT) ได้ทุกอย่างยกเว้นรูป/ผลประเมิน
GET            /api/persons/batch/:batchId/assessments

/api/organizations[/:id]  ·  /api/batches[/:id]  ·  /api/batches/:id/courses[/:courseId]
GET  /api/dashboard/stats  ·  /api/data/training-all  ·  /api/data/followup-all
GET  /api/data/followup-due   ← ใครถึงรอบติดตามผล 3ด/6ด/1ปี (คำนวณใน utils/followupDue.js)
GET  /api/data/incomplete     ← ใครข้อมูลยังไม่ครบ (ช่องที่ตรวจอยู่ใน utils/incomplete.js — ตรงกับช่องบังคับในฟอร์มแก้ไข)

ADMIN: /api/users[/:id] · /api/system/stats · POST /api/system/reset · GET /api/audit-logs
/api/disability-types[/:id]   ← อ่านได้ทุกคน (+จำนวนคนที่ใช้) · เพิ่ม/แก้/ลบ เฉพาะ ADMIN (ลบได้เฉพาะที่ไม่มีคนใช้)
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
| `/disability-types` | ประเภทความพิการ เพิ่ม/แก้/ลบ (ADMIN) | `DisabilityTypes.jsx` |
| `/data-check` | ข้อมูลยังไม่ครบ — กดแถวเปิดฟอร์มแก้ไข (`/persons?edit=<id>`) | `DataCheck.jsx` |

---

## ธีม

- **ส้มโลโก้ มจธ. `#E74111`** แบบเดียวกับระบบจองห้องประชุม (17 ต.ค. 69) — ชุดสี `orange-50…950` ถูกตั้งใหม่ใน `@theme` ของ `index.css`
  ใช้คลาส `orange-*` ตามปกติได้เลย · **Primary** `orange-600` = `#d63b0e` · พื้นหลัง `#faf6f2` · การ์ดขอบ `orange-100`
  · สีที่ต้องเขียนรหัสตรงๆ (gradient/inline style): `#f2622b` (สว่าง) → `#e74111` (โลโก้) → `#c9370c` (เข้ม) · โหมดมืดตัวหนังสือส้ม `#ff8a5c`
- **Sidebar:** ไล่ส้มโลโก้ `#f2622b → #c9370c` + ลายจุดจางๆ · โลโก้ = ตรา มจธ. วงกลม `public/logo-seal.png`
- **โหมดมืด (แบบจองห้อง):** เมนูซ้าย/แถบมือถือ/กล่องหัว Dashboard/หน้าเข้าสู่ระบบ เป็นส้มอิฐเข้ม `#9a2f0c → #4a1706` (คลาส `.sidebar-bg` `.hero-bg` `.login-*` ใน `index.css`)
  · พื้น `#151518` · การ์ด `#1f1f23` · เส้น `#34343b` · ช่องกรอก `#19191c`
- รองรับ dark mode (ThemeContext) · ฟอนต์บนจอ **IBM Plex Sans Thai** · รายงาน/ใบประกาศ/ตอนพิมพ์ = **Sarabun** (`.print-area` + `@media print` — ที่จัดพอดี A4 ไว้ไม่เลื่อน)

---

## ข้อควรรู้ / กับดักที่เคยเจอ

- วันเกิดจาก Excel อาจมาเป็นปี พ.ศ. → ต้องแปลงเป็น ค.ศ. (เคยเพี้ยนเป็นปี 3082)
- จังหวัดใน Excel ต้องสะกดตรง ไม่งั้นนำเข้าไม่ได้ (ดู `utils/province.js`)
- server อยู่หลัง nginx → ตั้ง `trust proxy` แล้ว `req.ip` เป็น IP จริงของผู้ใช้
- audit log ไม่เก็บ body ของ request (กันข้อมูลส่วนตัว/รหัสผ่านค้างใน log)
- eslint สะอาด **0 จุด** (16 ต.ค. 69) — แก้หน้าเว็บแล้วรัน `cd frontend && npx eslint .` ให้ยังเป็น 0 · โหลดครั้งเดียวตอนเปิดหน้า/ตอน id เปลี่ยน ใช้ `useEffectEvent` (ไม่ต้องใส่ deps ปลอม) · ค่าที่คำนวณจาก state ได้ อย่า copy ใส่ state ใน effect
- หมดเวลาเข้าระบบ (8 ชม.): `components/SessionGuard.jsx` + `utils/session.js` — เหลือ <10 นาทีแถบเตือน "ใช้งานต่อ" · หมดระหว่างใช้งาน api เจอ 401 → กล่องใส่รหัสผ่าน (dialog showModal ทับฟอร์ม) แล้วส่งคำขอเดิมซ้ำ ข้อมูลไม่หาย · เปิดหน้าใหม่ตอนตั๋วหมด = ไปหน้าเข้าสู่ระบบเลย
- Dashboard: "ผู้เข้าอบรม" = คนในรุ่นหรือมีประวัติอบรม · "สถานะการมีงานทำ" นับคนจากผลติดตามล่าสุด · cache สถิติถูกล้างทุกครั้งที่เขียนข้อมูลสำเร็จ
- error จาก Prisma ถูกแปลงเป็นข้อความไทยกลางที่ `index.js` (ของจริงอยู่ใน log `[DB ERROR]`)
- route รายการย่อยของคน (`/persons/:id/<sub>/:subId`) ต้องเช็คเจ้าของด้วย `ensureOwned` + รับช่องด้วย `pick` (`utils/owned.js`) — อย่า spread `req.body` เข้า DB
- หน้าเว็บ: ชื่อ/คำนำหน้า/ตัวย่อ → `utils/name.js` · ช่องวันที่ พ.ศ. → `utils/useThaiDate.js` (ตรวจวันจริง/ปี ค.ศ.) · รูป → `utils/resizeImage.js` ย่อก่อนส่ง · โหลดพัง → `components/LoadError.jsx`
- ตารางใหม่ทุกอัน: จอคอมเป็นตาราง มือถือใช้ `components/MobileCard.jsx` (`hidden md:block` / `md:hidden`) · ชื่อ/สีประวัติการใช้งาน → `utils/auditLabels.js`
- แถวตารางที่กดเข้าไปดูได้: ใส่คลาส `row-link` ที่ `<tr>` + `row-link-name` ที่ชื่อ (`index.css` — ชี้แล้วพื้นส้มทั้งแถว+แถบซ้าย+ชื่อส้ม ทั้งโหมดสว่าง/มืด) อย่าใช้ `hover:bg-orange-50/..` เพราะโหมดมืดจับคลาสนี้ไปทาสีทุกแถว
- หน้ารายละเอียด: แท็บ "ประวัติการแก้ไข" (ท้ายสุด) เห็นเฉพาะ ADMIN — ใช้ `/api/audit-logs?personId=` ซึ่งเปิดให้แอดมินเท่านั้น
- ฟอร์มใหม่ทุกอัน: ใส่ตัวถามก่อนปิดเมื่อยังไม่บันทึก `utils/useDiscardGuard.js` + `components/DiscardBar.jsx` (arm ตอนเปิด, request ตอนปิด/Esc/คลิกนอกฟอร์ม)
- สีเทา `gray-400/500` ถูกปรับเข้มขึ้นใน `@theme` ของ `index.css` (ให้ตัวหนังสืออ่านง่าย ≥4.5:1) — **ห้ามปรับ `gray-300`** เพราะใช้เป็นเส้นขอบ 71 จุด · ตัวหนังสือห้ามใช้ gray-200/300
- **ชุดทดสอบใช้ฐาน `kmutt_pwd_db_test` ของมันเอง** ล้างใหม่ทุกครั้งที่รัน (พี่เต้ยอนุญาตแล้ว เฉพาะ *_test) + เปิดหลังบ้าน :5055 / หน้าเว็บ :5180 / Chrome :9341 เองแล้วปิดให้
  · ไม่แตะฐาน dev / รูปในเครื่อง (ใช้ `UPLOAD_ROOT` แยก) · ไฟล์ทดสอบรันตรงๆ ไม่ได้ (กันเผลอเขียนฐาน dev)
  · e2e สั่ง Chrome ผ่าน CDP ใส่ token ใน sessionStorage แทนการล็อกอิน · เขียนเทสต์ใหม่: `tests/<กลุ่ม>/<เรื่อง>.test.cjs` ใช้ `require('../lib.cjs')` จบด้วย `process.exit(summary() ? 1 : 0)`
  · **รันเฉพาะที่เกี่ยวข้อง** (พี่เต้ยสั่ง 15 ต.ค. 69 — ไม่ต้องรันทั้งหมดทุกรอบ): งานเล็ก (สี/หน้าเดียว) = เทสต์ของจุดนั้น + `smoke-all-pages` (~40 วิ)
    · รันทั้งหมด (`npm test` ~5 นาที) เฉพาะเมื่อแตะส่วนกลาง: backend/route/middleware, schema/migration, `api/index.js`, `App.jsx`, `AuthContext`, หรือแก้หลายเรื่องในรอบเดียว
    · ห้ามแก้ไฟล์ใน `frontend/` (โดยเฉพาะ `package.json`) ระหว่างเทสต์รัน — หน้าเว็บทดสอบจะรีสตาร์ทกลางคัน เทสต์พังหลอก

---

## สิ่งที่อาจทำต่อ

- แจ้งเตือนรอบติดตามผลทาง Telegram ทุกเช้าวันจันทร์ (มีระบบส่ง Telegram ใน healthcheck แล้ว) — พี่เต้ยบอกพักไว้ก่อน (15 ต.ค. 69)
