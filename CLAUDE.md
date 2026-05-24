# CLAUDE.md — ระบบฐานข้อมูลคนพิการ มจธ.

> สรุปสำหรับ Sabastian เพื่อทำความเข้าใจ project นี้อย่างรวดเร็ว

---

## คือ project อะไร?

**ระบบฐานข้อมูลคนพิการ มจธ. (PWDs Database)**
ระบบ web app เต็มรูปแบบสำหรับจัดการข้อมูลคนพิการในโครงการฝึกอบรม-ฝึกงาน มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี (มจธ.)

---

## โครงสร้าง project

```
project/
├── backend/          ← Node.js + Express + Prisma + PostgreSQL
│   ├── src/
│   │   ├── index.js            ← entry point ของ server
│   │   └── routes/
│   │       ├── persons.js      ← CRUD ข้อมูลคนพิการ
│   │       ├── training.js     ← ประวัติการอบรม
│   │       ├── workexp.js      ← ประสบการณ์ทำงาน
│   │       ├── followup.js     ← ติดตามผล
│   │       ├── skills.js       ← ทักษะ
│   │       ├── organizations.js← สถานประกอบการ
│   │       └── dashboard.js    ← สถิติภาพรวม
│   ├── prisma/
│   │   ├── schema.prisma       ← โมเดล database ทั้งหมด
│   │   ├── migrations/         ← migration files
│   │   └── seed.js             ← เพิ่มข้อมูลเริ่มต้น (ประเภทความพิการ 7 ประเภท)
│   └── .env                    ← DATABASE_URL, PORT
│
├── frontend/         ← React 19 + Vite + Tailwind CSS + DaisyUI
│   └── src/
│       ├── App.jsx             ← router หลัก
│       ├── index.css           ← global style + DaisyUI theme (สีส้ม)
│       ├── api/                ← axios API client
│       ├── components/
│       │   └── Layout.jsx      ← sidebar + layout หลัก
│       └── pages/
│           ├── Dashboard.jsx   ← หน้าแรก สถิติ + กราฟ
│           ├── PersonList.jsx  ← รายชื่อ + จัดการคนพิการ
│           ├── PersonDetail.jsx← รายละเอียดคนพิการ (5 tabs)
│           ├── OrganizationList.jsx ← สถานประกอบการ
│           └── FollowUpList.jsx← ติดตามผลรวมทุกคน
│
└── CLAUDE.md         ← ไฟล์นี้
```

---

## วิธีรัน project

```bash
# 1. รัน Backend (port 5000)
cd backend
npm run dev

# 2. รัน Frontend (port 5173 หรือ 5174 ถ้า port ถูกใช้อยู่)
cd frontend
npm run dev

# 3. ถ้าต้องการ seed ข้อมูลเริ่มต้น (ประเภทความพิการ)
cd backend
npm run seed
```

**URL:**
- Frontend: http://localhost:5173 (หรือ 5174)
- Backend API: http://localhost:5000/api
- Health check: http://localhost:5000/api/health

---

## Database

- **ชนิด:** PostgreSQL
- **ชื่อ DB:** `kmutt_pwd_db`
- **Connection:** `postgresql://postgres:postgres123@localhost:5432/kmutt_pwd_db`
- **ORM:** Prisma 7.x

### โมเดลหลักใน database (11 ตาราง)

| ตาราง | ความหมาย |
|-------|----------|
| `persons` | ข้อมูลส่วนตัวคนพิการ (ชื่อ, บัตร, เพศ, วันเกิด, ที่อยู่) |
| `disability_types` | ประเภทความพิการ (7 ประเภท) |
| `disability_infos` | ข้อมูลความพิการของแต่ละคน (ระดับ, อุปกรณ์) |
| `training_records` | ประวัติการอบรม/ฝึกงาน |
| `work_experiences` | ประวัติการทำงาน |
| `skills` | ทักษะ (BEGINNER/INTERMEDIATE/ADVANCED) |
| `follow_ups` | ติดตามผลหลังอบรม (มีงานทำ/ว่างงาน/ศึกษาต่อ) |
| `organizations` | สถานประกอบการ/นายจ้าง |
| `person_organizations` | ความสัมพันธ์คน ↔ องค์กร |
| `person_photos` | รูปภาพของคนพิการ |

---

## API Endpoints หลัก

```
GET/POST   /api/persons                    ← รายชื่อ / เพิ่มคนพิการ
GET/PUT/DELETE /api/persons/:id            ← รายละเอียด / แก้ไข / ลบ

GET/POST   /api/persons/:id/training       ← ประวัติอบรม
DELETE     /api/persons/:id/training/:tid

GET/POST   /api/persons/:id/workexp        ← ประสบการณ์งาน
DELETE     /api/persons/:id/workexp/:wid

GET/POST   /api/persons/:id/followup       ← ติดตามผล
DELETE     /api/persons/:id/followup/:fid

GET/POST   /api/persons/:id/skills         ← ทักษะ
DELETE     /api/persons/:id/skills/:sid

GET/POST   /api/organizations              ← สถานประกอบการ
PUT/DELETE /api/organizations/:id

GET        /api/dashboard                  ← สถิติภาพรวม
```

---

## Tech Stack

| ส่วน | เทคโนโลยี | เวอร์ชัน |
|------|-----------|---------|
| Frontend framework | React | 19.x |
| Build tool | Vite | 8.x |
| CSS | Tailwind CSS + DaisyUI | 4.x / 5.x |
| Charts | Recharts | 3.x |
| Icons | Lucide React | 1.x |
| HTTP client | Axios | 1.x |
| Routing | React Router | 7.x |
| Backend | Express.js | 5.x |
| ORM | Prisma | 7.x |
| Database | PostgreSQL | - |
| Font | Sarabun (Google Fonts) | - |

---

## ธีมสี (อัปเดตล่าสุด)

- **Primary:** สีส้ม (`orange-600` / `#ea580c`)
- **Sidebar:** gradient น้ำตาลส้มเข้ม (`#431407 → #9a3412`)
- **Background:** `orange-50` (#fff7ed)
- **Card border:** `orange-100`
- **Table header:** `orange-50 / text-orange-600`

---

## หน้าเว็บที่มีใน Frontend

| Route | หน้า | ไฟล์ |
|-------|------|------|
| `/` | Dashboard (สถิติ + กราฟ) | `Dashboard.jsx` |
| `/persons` | รายชื่อคนพิการ + CRUD | `PersonList.jsx` |
| `/persons/:id` | รายละเอียดคนพิการ (5 แท็บ) | `PersonDetail.jsx` |
| `/training` | การอบรม (ใช้ PersonList) | `PersonList.jsx` |
| `/followup` | ติดตามผลทุกคน | `FollowUpList.jsx` |
| `/organizations` | สถานประกอบการ + CRUD | `OrganizationList.jsx` |

### PersonDetail มี 5 แท็บ:
1. ข้อมูลพื้นฐาน — ส่วนตัว, ติดต่อ, ความพิการ
2. การอบรม — ประวัติหลักสูตร
3. ประสบการณ์งาน — ประวัติการทำงาน
4. ทักษะ — tag ทักษะพร้อมระดับ
5. ติดตามผล — สถานะงานหลังจบ

---

## Enum ที่ใช้ใน Prisma

```
Gender:           MALE | FEMALE | OTHER
MaritalStatus:    SINGLE | MARRIED | OTHER
LifeStatus:       ALIVE | DECEASED
TrainingType:     TRAIN | LEARN | EARN
WorkMode:         INTERNSHIP | EMPLOYMENT | FREELANCE
SkillLevel:       BEGINNER | INTERMEDIATE | ADVANCED
EmploymentStatus: EMPLOYED | UNEMPLOYED | STUDYING
SkillMatch:       MATCH | NOT_MATCH
RoleType:         INTERNSHIP | EMPLOYMENT | OTHER
```

---

## สิ่งที่ทำไปแล้ว

- [x] สร้าง project fullstack ครบ (backend + frontend)
- [x] ออกแบบ database 11 ตาราง
- [x] CRUD ครบทุก entity
- [x] Dashboard พร้อมกราฟ (Pie + Bar)
- [x] เปลี่ยนธีมจาก indigo → **สีส้มขาว** ทั้ง app

---

## สิ่งที่อาจทำต่อในอนาคต

- อัปโหลดรูปภาพคนพิการ (PersonPhoto มี model แล้ว แต่ยังไม่มี UI)
- Export รายงานเป็น PDF/Excel
- ระบบ login / authentication
- ค้นหาขั้นสูง (filter หลายเงื่อนไข)
- เพิ่มข้อมูลประเภทความพิการผ่าน UI
