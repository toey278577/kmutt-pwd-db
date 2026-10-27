// บทที่ 5 การพัฒนาระบบ (Dev) — โครงสร้าง มาตรฐาน เวอร์ชัน การจัดการโค้ด
const VERSIONS = [
  // [เวอร์ชัน, วันที่, สิ่งที่ส่งมอบ, เทสต์]
  ['ก่อนนับเวอร์ชัน', '23 พ.ค.–11 ก.ค.', 'โครงสร้าง 10 ตาราง · ล็อกอิน 3 สิทธิ์ · หน้ารายละเอียด/การอบรม/ติดตามผล · ฟอร์ม กกจ.พก.1 + รูป · รายงาน 5 แบบ · Dashboard · รุ่น + ประเมิน · ชื่อเล่น · ส่งออก Excel · นำเข้า Excel · หลักสูตรต่อรุ่น (อยู่บน Vercel + Render)', 'ทดสอบด้วยสคริปต์ชั่วคราว'],
  ['v1.1.0', '20 ก.ค.', 'ย้ายขึ้น VPS · ป้ายเวอร์ชันหน้าเข้าสู่ระบบ · สคริปต์สำรอง/กู้ฐานข้อมูล · ต่อมา (ส.ค.–ก.ย.) แก้สิทธิ์มีผลทันที · วันเกิด 3082 · นำเข้าที่อยู่ 22 คอลัมน์ · รีเซ็ตระบบ · เฝ้าระบบ · จำกัดการเดารหัส · รูปเป็นไฟล์ · Dashboard ใหม่', '—'],
  ['v1.2.0', '14 ต.ค.', 'ประวัติการใช้งาน (audit log) · แจ้งรอบติดตามผล · กันผู้ดูข้อมูลเขียนผ่าน API · ตัวเลข Dashboard นับถูก · ข้อความผิดพลาดภาษาไทย', '—'],
  ['v1.3.0', '14 ต.ค.', 'ไล่ตรวจทั้งระบบ แก้ 15 จุด (ชื่อเพี้ยน · รูปค้าง · รูปใหญ่ · วันที่ · แอดมินทำร้ายตัวเอง · รหัสผ่านขั้นต่ำ · แก้รายการย่อย · กล่องโหลดไม่สำเร็จ · หน้าการอบรมตามรุ่น ฯลฯ)', '—'],
  ['v1.4.0', '14 ต.ค.', 'นำเข้า Excel เทมเพลต v3 (+ หลักสูตร + ประเภทความพิการ) ตรวจเข้ม ไม่ตรง = ไม่นำเข้า', '—'],
  ['v1.5.0', '15 ต.ค.', 'UX/UI 6 จุด: มือถือ · ฟอร์มถามก่อนปิด · ตัวหนังสือชัด · หน้ารายละเอียด · ตารางรายชื่อ · ค้นหาทันที · ชุดทดสอบ npm test เข้าโปรเจกต์ (391 เคส)', '391'],
  ['v1.6.0', '15 ต.ค.', 'มือถือการ์ดทุกหน้า · แก้ทักษะ/ความพิการ · ตัวกรองหลายเงื่อนไข · แท็บประวัติการแก้ไข', '499'],
  ['v1.6.1–1.6.3', '15 ต.ค.', 'แก้รายงานช่องทักษะคอมพิวเตอร์ว่าง · ซ้อมกู้ข้อมูล · ปิดช่องโหว่รหัสลับตั๋ว (JWT)', '523 → 545'],
  ['v1.7.0', '15 ต.ค.', 'ส่งออก Excel ตามตัวกรองในหน้ารายชื่อ', '559'],
  ['v1.8.0–1.8.6', '15 ต.ค.', 'จัดการประเภทความพิการ · วันที่ พ.ศ. หน้าประวัติ · เอาวงกลมตัวย่อออก · แถบ "มีเวอร์ชันใหม่" · กล่องผู้ใช้การ์ดใส · ชี้แถวรู้ว่ากดได้', '587 → 614'],
  ['v1.9.0', '16 ต.ค.', 'หมดเวลาเข้าระบบไม่ทำข้อมูลหาย · หน้าข้อมูลยังไม่ครบ · กดทั้งแถว · eslint 0 จุด', '671'],
  ['v1.10.0', '16 ต.ค.', 'ตัวเลขข้อมูลยังไม่ครบข้างเมนู + การ์ด Dashboard · คู่มือ PDF 19 หน้า · คู่มือย้ายเครื่อง', '674'],
  ['v1.11.0', '17 ต.ค.', 'ธีมส้มโลโก้ มจธ. + ฟอนต์ IBM Plex Sans Thai + ตรา มจธ. + โหมดมืด แบบระบบจองห้องประชุม', '675'],
];

module.exports = {
  id: 'dev', num: 5, role: 'Dev', title: 'การพัฒนาระบบ',
  render: ({ H, facts, tests }) => `
<p class="lead">โครงสร้างโปรแกรม มาตรฐานที่ใช้ทุกครั้งที่แก้ระบบ เวอร์ชันที่ส่งมอบ และคำสั่งสำหรับผู้พัฒนาที่จะดูแลต่อ</p>

<h2>5.1 โครงสร้างโปรแกรม</h2>
<pre style="font-size:7.9pt;white-space:pre">kmutt-pwd-db/
├── backend/                 Node.js + Express 5 + Prisma 7 + PostgreSQL
│   ├── src/index.js         จุดเริ่ม: helmet · จำกัดคำขอ · ผูก route · error ภาษาไทย · ล้าง cache
│   ├── src/middleware/      auth.js (ตั๋ว + สิทธิ์จากฐาน) · audit.js (บันทึกประวัติอัตโนมัติ)
│   ├── src/routes/          persons · training · workexp · followup · skills · personorg · photos
│   │                        assessments · organizations · batches · dashboard · aggregate
│   │                        auth · users · system · audit · disabilityTypes
│   ├── src/utils/           followupDue · incomplete · province · text · owned · jwtSecret …
│   ├── prisma/              schema.prisma · migrations/ (10) · seed.js
│   ├── scripts/             backup-db · restore-db · fix-* · cleanup-orphan-photos
│   ├── uploads/photos/      ไฟล์รูป (ไม่ขึ้น git)
│   └── backups/             ไฟล์สำรอง (ไม่ขึ้น git)
├── frontend/                React 19 + Vite + Tailwind 4 + DaisyUI 5 (PWA)
│   └── src/                 App.jsx · api/ · context/ · components/ · pages/ (14) · utils/
├── tests/                   unit/ · api/ · e2e/ · docs/ · run.cjs · lib.cjs · fixtures/
├── docs/                    คู่มือการใช้งาน · เอกสารความต้องการ (*.pdf) · deploy/
│   └── project-docs/        เอกสารชุดนี้ (build.cjs · content/ · lib/ · img/ · data/ · pdf/)
├── CHANGELOG.md             บันทึกการพัฒนาทุกครั้ง พร้อมคำสั่งที่ใช้
└── CLAUDE.md                สรุปโปรเจกต์ + กับดักที่เคยเจอ สำหรับผู้พัฒนา</pre>

<h2>5.2 มาตรฐานการพัฒนา</h2>
${H.table(['เรื่อง', 'มาตรฐาน'], [
    ['ทำทีละข้อ', 'งานหลายข้อทำทีละข้อ ตรวจให้ชัวร์ก่อนไปข้อถัดไป จบแล้วรันชุดทดสอบทั้งหมดซ้ำ (กันข้อหลังทำข้อแรกพัง)'],
    ['ทดสอบ', 'แก้บั๊กแล้วเพิ่มเทสต์ที่จับบั๊กนั้นได้ · งานเล็กรันเทสต์ที่เกี่ยวข้อง + smoke-all-pages · แตะส่วนกลาง (หลังบ้าน route schema api/index.js App.jsx AuthContext index.css) รันทั้งหมด · ห้ามแก้ไฟล์ frontend ระหว่างเทสต์รัน'],
    ['ดูของจริง', 'งานที่เห็นด้วยตา (หน้าจอ/พิมพ์/PDF) ต้องถ่ายภาพหน้าจอจริงทั้งคอมและมือถือก่อนบอกว่าเสร็จ · เลือกดีไซน์จากภาพเทียบขนาดจริง'],
    ['คุณภาพโค้ดหน้าเว็บ', '<code>npx eslint .</code> ต้อง 0 จุด · โหลดครั้งเดียวตอนเปิดหน้าใช้ <code>useEffectEvent</code> · ค่าที่คำนวณจาก state ได้อย่า copy ใส่ state'],
    ['หลังบ้าน', 'route รายการย่อยต้องเช็คเจ้าของ (<code>ensureOwned</code>) และรับช่องด้วย <code>pick</code> — ห้ามส่ง <code>req.body</code> ตรงเข้าฐาน · สิทธิ์ผู้ดูข้อมูลกันที่ authenticate จุดเดียว · error ภาษาไทย'],
    ['หน้าเว็บ', 'ตารางใหม่: จอคอมตาราง + มือถือ MobileCard · แถวที่กดได้ใช้ <code>row-link</code> · ฟอร์มใหม่ใส่ useDiscardGuard + DiscardBar · วันที่ใช้ useThaiDate · ชื่อใช้ utils/name.js · ตัวหนังสือห้ามใช้ gray-200/300'],
    ['ฐานข้อมูล', 'เปลี่ยนโครงสร้างผ่าน <code>prisma migrate dev</code> เท่านั้น · ตารางใหม่ต้องเพิ่มใน backup-db / restore-db / ชุดทดสอบซ้อมกู้ และพิจารณาลำดับการลบตอนรีเซ็ต'],
    ['ข้อมูลส่วนบุคคล', 'ไม่ส่งข้อมูลจริงออกนอกเครื่อง · เทสต์/เอกสารใช้ข้อมูลสมมติ · ไม่เก็บ body ใน log · รูปและไฟล์สำรองไม่ขึ้น git'],
    ['บันทึก', 'ทุกงานลง CHANGELOG.md (ทำไม · ทำอะไร · ไฟล์ · คำสั่งที่ใช้) · ขยับเลขเวอร์ชันใน frontend/package.json (แก้บั๊ก = patch · ฟีเจอร์ = minor) · อัปเดตเอกสารชุดนี้เมื่อระบบเปลี่ยน · commit + push เมื่อเสร็จ'],
  ], { cls: 'tbl-tight', widths: ['18%', '82%'] })}

<h2>5.3 เวอร์ชันที่ส่งมอบ</h2>
<p>เลขเวอร์ชันแสดงที่หน้าเข้าสู่ระบบ (ดึงจาก <code>frontend/package.json</code>) · ปัจจุบัน <b>${facts.version}</b> · ปี 2569 ทั้งหมด</p>
${H.table(['เวอร์ชัน', 'วันที่', 'สิ่งที่ส่งมอบ', 'เทสต์ (เคส)'], VERSIONS.map(([v, d, t, n]) => [`<b class="nw">${v}</b>`, `<span class="nw">${d}</span>`, t, `<div style="text-align:center">${n === '675' ? tests.total : n}</div>`]), { cls: 'tbl-tight', widths: ['13%', '13%', '62%', '12%'] })}

<h2>5.4 การจัดการซอร์สโค้ด</h2>
${H.ul([
    `โค้ดอยู่บน GitHub <code>toey278577/kmutt-pwd-db</code> สาขา <code>main</code> · ${facts.git.count} commits (ล่าสุด ${facts.git.head})`,
    'งานออกแบบที่ต้องเลือกทำบนสาขาแยกก่อน (เช่น <code>theme-kmutt-orange</code>) เลือกแล้วค่อยรวมเข้า main — ของจริงไม่โดนแตะระหว่างลอง',
    'ข้อความ commit บอกประเภท + เรื่อง + เวอร์ชัน เช่น <code>feat: … (v1.10.0)</code> · <code>style: …</code> · <code>docs: …</code>',
    'ไม่ขึ้น git: <code>.env</code> · <code>.jwt-secret</code> · <code>uploads/</code> · <code>backups/</code> · <code>tests/.output/</code> · <code>node_modules/</code>',
    'สคริปต์ฝั่งเซิร์ฟเวอร์เก็บสำเนาใน <code>docs/deploy/</code> (แก้ deploy.sh ที่นี่แล้วต้องก๊อปขึ้นเครื่องด้วย)',
  ])}

<h2>5.5 คำสั่งสำหรับผู้พัฒนา</h2>
<pre style="font-size:8pt;white-space:pre">cd backend && npm install && npm run dev        # หลังบ้าน :5000 (prisma generate ให้ด้วย)
cd frontend && npm install && npm run dev       # หน้าเว็บ :5173 (proxy /api → :5000)
cd backend && npm run seed                      # ประเภทความพิการ 7 + แอดมิน (เฉพาะตอนตารางว่าง)
cd backend && npx prisma migrate dev --name &lt;ชื่อ&gt;   # เปลี่ยนโครงสร้างฐานข้อมูล
cd backend && npm run reset-admin              # ลืมรหัสแอดมิน (บนเครื่อง)
cd backend && npm test                          # ชุดทดสอบทั้งหมด (~6 นาที) · npm test -- unit|api|e2e|&lt;ชื่อ&gt;
cd frontend && npx eslint .                     # ต้อง 0 จุด
node docs/project-docs/shots.cjs                # ถ่ายภาพหน้าจอให้เอกสาร (ข้อมูลสมมติ)
node docs/project-docs/build.cjs                # สร้างเอกสารชุดนี้เป็น PDF
node docs/project-docs/preview.cjs &lt;pdf&gt; 1 8 4  # ดูหน้า PDF เป็นภาพ</pre>
${H.callout('info', 'การอัปเดตเอกสารชุดนี้', 'ทุกครั้งที่ระบบเปลี่ยน: เพิ่ม FR/CR/ข้อบกพร่อง/เวอร์ชันใน content/*.cjs · ถ่ายภาพใหม่ <code>node docs/project-docs/shots.cjs</code> ถ้าหน้าตาเปลี่ยน · รัน <code>npm test</code> ครบชุดแล้วก๊อป <code>tests/.output/last-run.log</code> ไปที่ <code>data/test-run.txt</code> · <code>node docs/project-docs/build.cjs</code> · ดูหน้าที่เปลี่ยนด้วย preview.cjs')}
`,
};
