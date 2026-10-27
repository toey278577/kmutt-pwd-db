// บทที่ 4 การออกแบบ (ฐานข้อมูล + UX/UI)
const erdSvg = require('../lib/erd.cjs');
const TABLE_DESC = {
  persons: 'ข้อมูลพื้นฐานคนพิการ (ตารางที่ 1 Person ในเอกสารความต้องการ) + ที่อยู่แยกช่องตามแบบฟอร์ม กกจ.พก.1 + รุ่น/หลักสูตรที่สังกัด',
  person_photos: 'รูปถ่าย (ตารางที่ 2) — เก็บแค่ที่อยู่ไฟล์ ตัวไฟล์อยู่ที่ backend/uploads/photos (ย้ายออกจากฐานข้อมูล 21 ก.ย. 2569)',
  disability_infos: 'ข้อมูลความพิการของแต่ละคน (ตารางที่ 3) — 1 คนมีได้หลายประเภท แต่ห้ามซ้ำประเภท',
  disability_types: 'ประเภทความพิการ (ตารางที่ 4 — ปรับเป็นตารางหลัก) ติดตั้งครั้งแรก 7 ประเภท ผู้ดูแลระบบเพิ่ม/แก้/ลบได้',
  training_records: 'ประวัติการอบรม/ฝึกงานรายคน (ตารางที่ 5) รูปแบบ Train / Learn / Earn',
  work_experiences: 'ประวัติการทำงาน / ฝึกงาน (ตารางที่ 6)',
  skills: 'ทักษะ (ตารางที่ 7) ระดับ เริ่มต้น / ปานกลาง / เชี่ยวชาญ',
  follow_ups: 'การติดตามผลหลังอบรม (ตารางที่ 8) — ใช้คำนวณรอบติดตามผลและสถานะการมีงานทำ',
  organizations: 'สถานประกอบการ / นายจ้าง (ตารางที่ 9)',
  person_organizations: 'ความสัมพันธ์คน ↔ สถานประกอบการ (ตารางที่ 10) พร้อมเงินสนับสนุน',
  training_batches: 'รุ่นการฝึกอบรม (เพิ่มตามเอกสาร 25/06/2569)',
  courses: 'หลักสูตรในแต่ละรุ่น 1–4 หลักสูตร (เพิ่มตามเอกสาร 10 ก.ค. 2569)',
  person_assessments: 'ผลประเมินทักษะของคนในแต่ละรุ่น — Pre/Post-test + Soft skills 4 ด้าน (1 คน 1 ชุดต่อรุ่น)',
  users: 'บัญชีผู้ใช้งานระบบ 3 สิทธิ์',
  audit_logs: 'ประวัติการใช้งาน — ใครเพิ่ม/แก้/ลบอะไรเมื่อไร + ล็อกอิน · ไม่ผูก FK เพื่อเก็บไว้แม้ข้อมูล/ผู้ใช้ถูกลบ · รีเซ็ตระบบไม่ล้าง',
};
const COL_DESC = {
  'persons.id': 'รหัสคนพิการ (Person_ID)', 'persons.thai_id': 'เลขบัตรประชาชน / บัตรคนพิการ 13 หลัก (ห้ามซ้ำ)', 'persons.full_name': 'คำนำหน้า + ชื่อ-นามสกุล', 'persons.nickname': 'ชื่อเล่น',
  'persons.gender': 'เพศ MALE / FEMALE / OTHER', 'persons.birth_date': 'วันเกิด (เก็บ ค.ศ. แสดง พ.ศ. · อายุคำนวณเอง)', 'persons.phone': 'โทรศัพท์บ้าน', 'persons.mobile': 'โทรศัพท์มือถือ',
  'persons.email': 'อีเมล', 'persons.landmark': 'สถานที่ใกล้เคียง', 'persons.house_no': 'เลขที่', 'persons.moo': 'หมู่ที่', 'persons.building': 'อาคาร / หมู่บ้าน', 'persons.floor': 'ชั้นที่',
  'persons.soi': 'ซอย', 'persons.road': 'ถนน', 'persons.sub_district': 'แขวง / ตำบล', 'persons.district': 'เขต / อำเภอ', 'persons.province': 'จังหวัด (ชื่อมาตรฐาน 1 ใน 77)', 'persons.postal_code': 'รหัสไปรษณีย์',
  'persons.address': 'ที่อยู่รวม (ช่องเดิมก่อนแยกช่อง — คงไว้)', 'persons.nationality': 'สัญชาติ', 'persons.religion': 'ศาสนา', 'persons.marital_status': 'สถานภาพ SINGLE / MARRIED / OTHER',
  'persons.education_level': 'ระดับการศึกษา (7 ระดับ)', 'persons.life_status': 'สถานะชีวิต ALIVE / DECEASED', 'persons.batch_id': 'รุ่นที่สังกัด', 'persons.course_id': 'หลักสูตรในรุ่น',
  'persons.created_at': 'วันเวลาที่เพิ่ม', 'persons.updated_at': 'วันเวลาที่แก้ล่าสุด',
  'person_photos.id': 'รหัสรูป', 'person_photos.person_id': 'เจ้าของรูป', 'person_photos.photo_type': 'ประเภทภาพ เช่น โปรไฟล์', 'person_photos.photo_date': 'วันที่ถ่าย', 'person_photos.description': 'คำอธิบาย', 'person_photos.file_path': 'ที่อยู่ไฟล์ (ชื่อสุ่ม 32 ตัว)',
  'disability_types.id': 'รหัสประเภท', 'disability_types.type_name': 'ชื่อประเภทความพิการ (ห้ามว่าง/ซ้ำ ≤ 100 ตัว)',
  'disability_infos.id': 'รหัสข้อมูลความพิการ', 'disability_infos.person_id': 'คนพิการ', 'disability_infos.disability_type_id': 'ประเภทความพิการ', 'disability_infos.disability_level': 'ระดับความพิการ',
  'disability_infos.assistive_device': 'อุปกรณ์ช่วยเหลือ เช่น รถเข็น โปรแกรมอ่านหน้าจอ', 'disability_infos.work_limitation': 'ข้อจำกัดในการทำงาน', 'disability_infos.accommodation_need': 'ความต้องการพิเศษ (reasonable accommodation)',
  'training_records.id': 'รหัสการอบรม', 'training_records.person_id': 'คนพิการ', 'training_records.course_name': 'ชื่อหลักสูตร', 'training_records.organizer': 'หน่วยงานที่จัด', 'training_records.start_date': 'วันเริ่ม', 'training_records.end_date': 'วันสิ้นสุด',
  'training_records.training_type': 'รูปแบบ TRAIN / LEARN / EARN', 'training_records.skills_gained': 'ทักษะที่ได้รับ', 'training_records.evaluation_result': 'ผลการประเมิน',
  'work_experiences.id': 'รหัสงาน', 'work_experiences.person_id': 'คนพิการ', 'work_experiences.organization_name': 'ชื่อองค์กร', 'work_experiences.job_type': 'ประเภทงาน', 'work_experiences.start_date': 'วันเริ่ม', 'work_experiences.end_date': 'วันสิ้นสุด',
  'work_experiences.work_mode': 'รูปแบบ INTERNSHIP / EMPLOYMENT / FREELANCE', 'work_experiences.income': 'รายได้ (บาท)', 'work_experiences.outcome': 'ผลลัพธ์',
  'skills.id': 'รหัสทักษะ', 'skills.person_id': 'คนพิการ', 'skills.skill_name': 'ชื่อทักษะ เช่น Excel, Barista, Data Entry (ห้ามว่าง)', 'skills.skill_level': 'ระดับ BEGINNER / INTERMEDIATE / ADVANCED',
  'follow_ups.id': 'รหัสการติดตาม', 'follow_ups.person_id': 'คนพิการ', 'follow_ups.follow_up_date': 'วันที่ติดตาม (ใช้จับคู่กับรอบ 3 ด./6 ด./1 ปี)', 'follow_ups.employment_status': 'สถานะ EMPLOYED มีงานทำ / UNEMPLOYED ว่างงาน / STUDYING ศึกษาต่อ',
  'follow_ups.job_type': 'ประเภทงาน', 'follow_ups.income': 'รายได้ประมาณ (บาท)', 'follow_ups.skill_match': 'ตรงกับทักษะที่ฝึก MATCH / NOT_MATCH', 'follow_ups.satisfaction': 'ความพึงพอใจ', 'follow_ups.issues': 'ปัญหาที่พบ',
  'organizations.id': 'รหัสองค์กร', 'organizations.org_name': 'ชื่อองค์กร', 'organizations.business_type': 'ประเภทธุรกิจ', 'organizations.address': 'ที่อยู่', 'organizations.contact_name': 'ผู้ติดต่อ', 'organizations.phone': 'เบอร์โทร', 'organizations.email': 'อีเมล', 'organizations.note': 'หมายเหตุ',
  'person_organizations.id': 'รหัสความสัมพันธ์', 'person_organizations.person_id': 'คนพิการ', 'person_organizations.org_id': 'สถานประกอบการ', 'person_organizations.role_type': 'บทบาท INTERNSHIP ฝึกงาน / EMPLOYMENT จ้างงาน / OTHER',
  'person_organizations.start_date': 'วันเริ่ม', 'person_organizations.end_date': 'วันสิ้นสุด', 'person_organizations.amount': 'เงินสนับสนุน (บาท)', 'person_organizations.support_detail': 'รายละเอียดการสนับสนุน', 'person_organizations.note': 'หมายเหตุ',
  'training_batches.id': 'รหัสรุ่น', 'training_batches.batch_number': 'เลขรุ่น', 'training_batches.year': 'ปี (พ.ศ.)', 'training_batches.course_name': 'ชื่อโครงการ/หลักสูตรหลักของรุ่น', 'training_batches.start_date': 'วันเริ่ม',
  'training_batches.end_date': 'วันสิ้นสุด (ใช้นับรอบติดตามผล)', 'training_batches.status': 'สถานะ ACTIVE กำลังอบรม / COMPLETED เสร็จสิ้น', 'training_batches.created_at': 'วันเวลาที่สร้าง',
  'courses.id': 'รหัสหลักสูตร', 'courses.batch_id': 'รุ่น', 'courses.name': 'ชื่อหลักสูตร', 'courses.created_at': 'วันเวลาที่สร้าง',
  'person_assessments.id': 'รหัสผลประเมิน', 'person_assessments.person_id': 'คนพิการ', 'person_assessments.batch_id': 'รุ่นที่ประเมิน', 'person_assessments.pre_test_score': 'คะแนน Pre-test 0–100', 'person_assessments.post_test_score': 'คะแนน Post-test 0–100',
  'person_assessments.soft_skill_comm': 'การสื่อสาร 0–5', 'person_assessments.soft_skill_time': 'การบริหารเวลา 0–5', 'person_assessments.soft_skill_motiv': 'การจูงใจตนเอง 0–5', 'person_assessments.soft_skill_duty': 'การทำงานตามหน้าที่ 0–5',
  'users.id': 'รหัสผู้ใช้', 'users.name': 'ชื่อที่แสดง', 'users.email': 'อีเมลเข้าสู่ระบบ (ตัวเล็ก ห้ามซ้ำ)', 'users.password': 'รหัสผ่านที่เข้ารหัสแล้ว (bcrypt)', 'users.role': 'สิทธิ์ ADMIN / STAFF / VIEWER',
  'users.is_active': 'เปิด/ปิดบัญชี (ปิด = เข้าระบบไม่ได้ทันที)', 'users.created_at': 'วันเวลาที่สร้าง', 'users.updated_at': 'วันเวลาที่แก้ล่าสุด',
  'audit_logs.id': 'รหัสเหตุการณ์', 'audit_logs.user_id': 'ผู้ใช้ที่ทำ (ไม่ผูก FK)', 'audit_logs.user_name': 'ชื่อผู้ใช้ ณ ตอนนั้น', 'audit_logs.action': 'CREATE · UPDATE · DELETE · IMPORT · RESET · LOGIN · LOGIN_FAILED',
  'audit_logs.entity': 'ประเภทข้อมูล เช่น person · skills · batch · user', 'audit_logs.entity_id': 'รหัสรายการที่ถูกทำ', 'audit_logs.person_id': 'คนพิการที่เกี่ยวข้อง (ใช้กับแท็บประวัติในหน้าคน)',
  'audit_logs.label': 'ชื่อที่อ่านรู้เรื่อง (หาไว้ก่อนลบ)', 'audit_logs.ip': 'IP ผู้ใช้จริง (หลัง nginx)', 'audit_logs.created_at': 'เวลาที่เกิดเหตุการณ์',
};
const ORDER = ['persons', 'person_photos', 'disability_infos', 'disability_types', 'training_records', 'work_experiences', 'skills', 'follow_ups', 'organizations', 'person_organizations', 'training_batches', 'courses', 'person_assessments', 'users', 'audit_logs'];

const SCREENS = [
  ['หน้าเข้าสู่ระบบ', [['login.png', 'จอคอม — แผงซ้ายสีส้มโลโก้ มจธ. + ป้ายเวอร์ชัน · การ์ดเข้าสู่ระบบด้านขวา'], ['m-login.png', 'มือถือ', 'phone']]],
  ['Dashboard (หน้าแรก)', [['dashboard.png', 'การ์ดสถิติ · สถานะรุ่น · ถึงรอบติดตามผล · ข้อมูลยังไม่ครบ · กราฟภูมิภาค/วุฒิ/ช่วงอายุ/เพศ/ประเภทความพิการ/สถานะการมีงานทำ'], ['m-dashboard.png', 'มือถือ', 'phone']]],
  ['รายชื่อคนพิการ', [['persons.png', 'ค้นหาทันที · ตัวกรอง 5 อย่าง · ส่งออก Excel · คอลัมน์รุ่นและงานล่าสุด · ชี้แถวแล้วพื้นส้ม (กดทั้งแถว)'], ['m-persons.png', 'มือถือเป็นการ์ด', 'phone']]],
  ['ฟอร์มเพิ่ม/แก้ไขคนพิการ', [['person-form.png', 'ตามแบบฟอร์ม กกจ.พก.1 — รูป · ข้อมูลส่วนตัว (ช่อง * บังคับ) · วันที่ พ.ศ. · ที่อยู่ · ติดต่อ · ความพิการ · รุ่น/หลักสูตร']]],
  ['นำเข้าจาก Excel', [['import.png', 'ดาวน์โหลดเทมเพลต v3 → เลือกไฟล์ → ตรวจทุกแถวก่อนนำเข้า']]],
  ['รายละเอียดคนพิการ', [['detail.png', 'หัวการ์ด (รูป ชื่อ อายุ) + 8 แท็บ — ข้อมูลพื้นฐาน'], ['m-detail.png', 'มือถือ — แท็บเลื่อนซ้าย-ขวา', 'phone']]],
  ['รายละเอียด: ทักษะ และประเมินทักษะ', [['detail-skills.png', 'ป้ายทักษะ 3 ระดับ แก้/ลบได้'], ['detail-assess.png', 'ประเมินทักษะต่อรุ่น — Pre/Post-test + Soft skills 4 ด้าน']]],
  ['ติดตามผล · การอบรม & ฝึกงาน', [['followup.png', 'บนสุด: ถึงรอบติดตามผล 3 ด./6 ด./1 ปี + เบอร์โทร · ตามด้วยผลติดตามทุกคน'], ['m-followup.png', 'มือถือ', 'phone'], ['training.png', 'การอบรม: แท็บตามรุ่นอบรม (คะแนนก่อน→หลัง) / ประวัติอบรมรายคน']]],
  ['ข้อมูลยังไม่ครบ · สถานประกอบการ · จัดการรุ่น', [['data-check.png', 'ใครขาดอะไร (ป้ายเหลือง) · กรองตามช่อง · กดแถวเปิดฟอร์มแก้ไข'], ['organizations.png', 'สถานประกอบการ + จำนวนคนที่เชื่อม'], ['batches.png', 'รุ่น · สถานะ · หลักสูตร 1–4 · จำนวนคนต่อหลักสูตร']]],
  ['ออกรายงาน', [['report.png', 'เลือกรายงาน 5 แบบ (แบบประเมินรายวิชา/Transcript เป็นกรอบเทา "ยังไม่เปิดใช้")'], ['report-behavior.png', 'แบบสังเกตพฤติกรรมรายบุคคล — ตัวอย่างก่อนพิมพ์'], ['report-cert.png', 'ตั้งค่าใบ Certificate — ได้เข้าร่วม / ได้ผ่านโครงการ']]],
  ['ผู้ดูแลระบบ', [['users.png', 'จัดการผู้ใช้ 3 สิทธิ์ (ท้ายหน้ามีโซนอันตราย — รีเซ็ตระบบ)'], ['audit.png', 'ประวัติการใช้งาน — ค้นหา กรองการกระทำ/ผู้ใช้/ช่วงวันที่ พ.ศ.'], ['disability-types.png', 'ประเภทความพิการ — จำนวนคนที่ใช้ · ลบได้เฉพาะที่ไม่มีคนใช้']]],
  ['คู่มือ · เมนูมือถือ · โหมดมืด', [['help.png', 'คู่มือการใช้งานในเว็บ'], ['m-menu.png', 'เมนูมือถือ (เลื่อนจากซ้าย)', 'phone'], ['dark-dashboard.png', 'โหมดมืด — เมนูและกล่องหัวเป็นส้มอิฐเข้ม'], ['dark-login.png', 'หน้าเข้าสู่ระบบโหมดมืด']]],
];

module.exports = {
  id: 'design', num: 4, role: 'Design', title: 'การออกแบบฐานข้อมูลและ UX/UI',
  render: ({ H, schema }) => {
    const models = ORDER.map((t) => schema.models.find((m) => m.table === t)).filter(Boolean);
    let fig = 0;
    const dict = models.map((m) => `
<h3>ตาราง <code>${m.table}</code> <span class="small">(${m.fields.length} คอลัมน์)</span></h3>
<p>${TABLE_DESC[m.table] || m.comment}</p>
${H.table(['คอลัมน์', 'ชนิดข้อมูล', 'ว่างได้', 'คีย์', 'ค่าเริ่มต้น', 'คำอธิบาย'], m.fields.map((f) => [
      `<b>${f.column}</b>`, `<span class="small">${f.dbType}</span>`, f.optional ? 'ได้' : '<span class="small">ไม่ได้</span>',
      f.keys.map((k) => H.tag(k === 'PK' ? 'brand' : k === 'UQ' ? 'info' : 'mute', k)).join(' '), `<span class="small">${H.esc(f.default)}</span>`,
      COL_DESC[`${m.table}.${f.column}`] || f.comment,
    ]), { cls: 'tbl-tight', widths: ['19%', '15%', '7%', '18%', '11%', '30%'] })}`).join('');

    const screens = SCREENS.map(([title, shots]) => {
      const wide = shots.filter((s) => s[2] !== 'phone');
      const phones = shots.filter((s) => s[2] === 'phone');
      const figs = (list, cls) => list.map(([f, cap]) => { fig += 1; return H.img(f, `ภาพที่ 4.${fig + 5} ${cap}`, { cls }); }).join('');
      const body = phones.length
        ? `<div class="shots">${figs(wide.slice(0, 1))}${figs(phones, 'phone')}</div>${figs(wide.slice(1))}`
        : figs(wide);
      return `<h3>${title}</h3>${body}`;
    }).join('');

    return `
<p class="lead">บทนี้มี 2 ส่วน: <b>ฐานข้อมูล</b> (ตาราง ความสัมพันธ์ ข้อบังคับ — ดึงจากโครงสร้างฐานข้อมูลจริงของระบบ ${schema.models.length} ตาราง) และ <b>UX/UI</b> (หลักการ ระบบการออกแบบ ลำดับการใช้งาน และหน้าจอจริงทุกหน้า)</p>

<h2>4.1 แผนภาพฐานข้อมูล (ERD)</h2>
<p>ฐานข้อมูลมี ${schema.models.length} ตาราง — ตารางที่ 1–10 มาจากโครงสร้างข้อมูลในเอกสารความต้องการของหน่วยงาน อีก 5 ตารางเพิ่มระหว่างโครงการตามคำขอ (รุ่น หลักสูตร ผลประเมิน ผู้ใช้ ประวัติการใช้งาน)</p>
${H.table(['ตาราง', 'เก็บอะไร', 'คอลัมน์'], models.map((m) => ['<code>' + m.table + '</code>', TABLE_DESC[m.table] || m.comment, '<div style="text-align:center">' + m.fields.length + '</div>']), { cls: 'tbl-tight', widths: ['24%', '66%', '10%'] })}
<figure class="diagram" style="break-before:page">${erdSvg(schema)}<figcaption>ภาพที่ 4.1 แผนภาพความสัมพันธ์ของตาราง — ครบทุกคอลัมน์ (ดึงจากโครงสร้างฐานข้อมูลจริง) · ขีดตั้ง = ฝั่ง "หนึ่ง" · ตีนกา = ฝั่ง "หลาย" · เส้นประ = ลบแม่แล้วลูกเหลือค่าว่าง · หัวเทา = ตารางที่ไม่ผูกกับตารางอื่น</figcaption></figure>

${H.table(['ความสัมพันธ์', 'ชนิด', 'ลบแม่แล้วเป็นอย่างไร'], [
    ['คนพิการ → รูป · ความพิการ · อบรม · งาน · ทักษะ · ติดตามผล · ผลประเมิน · การเชื่อมสถานประกอบการ', '1 : หลาย', 'ลบคน = ลบรายการย่อยทั้งหมด (Cascade) + ไฟล์รูป'],
    ['ประเภทความพิการ → ข้อมูลความพิการ', '1 : หลาย', 'ลบประเภทที่มีคนใช้ไม่ได้ (ระบบกันไว้ก่อนถึงฐานข้อมูล)'],
    ['รุ่น → คนพิการ (batch_id)', '0..1 : หลาย', 'ลบรุ่นได้ คนพิการเหลือไม่มีรุ่น (Set null)'],
    ['หลักสูตร → คนพิการ (course_id)', '0..1 : หลาย', 'ลบหลักสูตรได้ คนพิการเหลือไม่มีหลักสูตร (Set null)'],
    ['รุ่น → หลักสูตร · ผลประเมิน', '1 : หลาย', 'ลบรุ่น = ลบหลักสูตรและผลประเมินของรุ่นนั้น (Cascade)'],
    ['คนพิการ ↔ สถานประกอบการ', 'หลาย : หลาย (person_organizations)', 'ลบสถานประกอบการ = ลบการเชื่อมก่อน (แจ้งจำนวนคนที่เชื่อมอยู่)'],
    ['ผู้ใช้ / คนพิการ → ประวัติการใช้งาน', 'อ้างอิงแบบไม่ผูก', 'ประวัติยังอยู่แม้ต้นทางถูกลบ (เก็บชื่อไว้ในแถว)'],
  ], { cls: 'tbl-tight', widths: ['46%', '20%', '34%'] })}

<h3>ข้อบังคับและดัชนีสำคัญ</h3>
${H.table(['ชื่อ', 'ตาราง', 'ประเภท', 'ทำไม'], [
    ['persons.thai_id · users.email', 'persons · users', 'UNIQUE', 'เลขบัตร/อีเมลห้ามซ้ำ'],
    ['(person_id, batch_id)', 'person_assessments', 'UNIQUE', '1 คนมีผลประเมิน 1 ชุดต่อรุ่น'],
    ['person_id ทุกตารางลูก · disability_type_id · org_id · batch_id · course_id', 'ตารางลูกทั้งหมด', 'INDEX', 'ดึงข้อมูลของคน/รุ่นเร็ว ลบแบบ cascade เร็ว (เพิ่ม 13 ดัชนี 30 มิ.ย.)'],
    ['persons.province · follow_ups.employment_status', 'persons · follow_ups', 'INDEX', 'กรองจังหวัด · นับสถานะการมีงานทำ'],
    ['audit_logs (created_at) · (user_id) · (person_id)', 'audit_logs', 'INDEX', 'ประวัติล่าสุด · ตามผู้ใช้ · แท็บประวัติในหน้าคน'],
  ], { cls: 'tbl-tight', widths: ['36%', '18%', '12%', '34%'] })}
${H.callout('info', 'การเปลี่ยนโครงสร้างฐานข้อมูล', `ทำผ่าน migration ของ Prisma เท่านั้น — มี 10 ครั้ง ตั้งแต่ <code>20260523_init</code> ถึง <code>20261014_add_audit_log</code> (อยู่ใน backend/prisma/migrations) · deploy.sh รัน <code>prisma migrate deploy</code> ให้เอง · เพิ่มตารางใหม่ต้องเพิ่มในสคริปต์สำรอง/กู้ และชุดทดสอบซ้อมกู้ด้วย`)}

<div class="pb"></div><h2>4.2 พจนานุกรมข้อมูล (Data Dictionary)</h2>
<p>ทุกตารางและคอลัมน์ดึงจาก <code>backend/prisma/schema.prisma</code> ของระบบเวอร์ชันปัจจุบัน — ชื่อคอลัมน์คือชื่อจริงในฐานข้อมูล · โครงสร้างตารางที่ 1–10 ตรงตามพจนานุกรมข้อมูลในเอกสารความต้องการของหน่วยงาน (เพิ่มคอลัมน์ที่อยู่แยกช่อง ชื่อเล่น และรุ่น/หลักสูตร)</p>
${dict}

<h2>4.3 หลักการออกแบบ UX</h2>
${H.table(['หลักการ', 'ทำอย่างไรในระบบนี้'], [
    ['เห็นงานที่ต้องทำทันที', 'Dashboard บอกใครถึงรอบติดตามผล และใครข้อมูลยังไม่ครบ · ตัวเลขข้างเมนู · กดแล้วไปทำต่อได้เลย'],
    ['ข้อมูลไม่หาย', 'ฟอร์มที่ยังไม่บันทึก ถามก่อนปิด (กลับไปแก้ต่อ / ปิดโดยไม่บันทึก) · หมดเวลาเข้าระบบใส่รหัสในหน้าเดิมแล้วบันทึกต่อได้ · หน้ารายชื่อจำหน้า/คำค้น/ตัวกรองใน URL'],
    ['ผิดแล้วบอกตรงๆ', 'ข้อมูลไม่ตรงเงื่อนไข = ไม่รับ และบอกช่อง เหตุผล วิธีแก้เป็นภาษาไทย (เช่น นำเข้า Excel บอกแถว/ช่อง/สิ่งที่พิมพ์) · ไม่ปล่อยว่างเงียบๆ'],
    ['ใช้ได้ทั้งคอมและมือถือ', 'จอคอมเป็นตาราง มือถือเป็นการ์ด (MobileCard) · ปุ่มใหญ่ 40 px · แท็บเลื่อนซ้าย-ขวา · ตัวกรองพับเก็บ · ทดสอบทุกหน้าที่ 1400 และ 390 px'],
    ['อ่านง่าย', 'ตัวหนังสือผ่านเกณฑ์ความต่างสี 4.5:1 · วันที่ พ.ศ. ทั้งระบบ · ภาษาไทยทั้งระบบ · ป้ายสีแทนรหัส (มีงานทำ/ว่างงาน/ศึกษาต่อ)'],
    ['บอกว่ากดได้', 'ชี้แถวแล้วพื้นส้ม + แถบซ้าย + ชื่อส้ม + เคอร์เซอร์มือ · กดได้ทั้งแถว'],
    ['เอกสารเหมือนเอกสารราชการ', 'รายงานพิมพ์เส้นตารางดำคม หัวตารางเทา ฟอนต์ Sarabun · ไม่มีเมนูติดไป · ตัวอย่างบนจอเหมือนตอนพิมพ์'],
    ['เลือกจากของจริง', 'การเปลี่ยนหน้าตาทุกครั้งทำภาพเทียบจากหน้าจริงขนาดจริง (1x) ให้เจ้าของระบบเลือก ไม่ใช้ภาพซูม'],
  ], { cls: 'tbl-tight', widths: ['22%', '78%'] })}

<h2>4.4 ระบบการออกแบบ (Design System)</h2>
<h3>สีหลัก — มาจากตรา มจธ. (ตั้งแต่ v1.11.0)</h3>
<div class="swatches">
  ${[['#e74111', 'ส้มโลโก้ มจธ.', 'แถบเมนู · กล่องหัว · แบรนด์'], ['#d63b0e', 'ส้มหลัก (orange-600)', 'ปุ่ม · ตัวหนังสือเน้น 4.7:1'], ['#f2622b', 'ส้มสว่าง', 'ต้นไล่สี · กราฟ'], ['#c9370c', 'ส้มเข้ม', 'ปลายไล่สี · ชี้ปุ่ม'],
      ['#faf6f2', 'พื้นหลัง', 'ขาวอุ่น + แสงส้มจางที่มุม'], ['#fff5f0', 'ส้มอ่อน (orange-50)', 'พื้นการ์ดเน้น · ชี้แถว'], ['#9a2f0c → #4a1706', 'ส้มอิฐเข้ม (โหมดมืด)', 'เมนู · กล่องหัว · หน้าเข้าสู่ระบบ'], ['#151518 / #1f1f23', 'พื้น / การ์ด (โหมดมืด)', 'เส้น #34343b']]
      .map(([c, n, u]) => `<div class="swatch"><i style="background:${c.includes('→') ? `linear-gradient(90deg,${c.split(' → ').join(',')})` : c.split(' / ')[0]}"></i><div><b>${n}</b>${c}<br><span class="small">${u}</span></div></div>`).join('')}
</div>
${H.table(['องค์ประกอบ', 'ค่าที่ใช้'], [
    ['ชุดสีส้ม', 'ตั้ง orange-50…950 ใหม่ใน <code>@theme</code> ของ <code>index.css</code> ที่เดียว ใช้คลาส <code>orange-*</code> ได้ทั้งระบบ (~500 จุด) · สีสถานะ: เขียว = มีงานทำ/สำเร็จ · เทา = ว่างงาน · ฟ้า = ศึกษาต่อ · แดง = เลยกำหนด/ลบ · เหลือง = ข้อมูลไม่ครบ'],
    ['ตัวอักษร', 'บนจอ <b>IBM Plex Sans Thai</b> (แบบเดียวกับระบบจองห้องประชุม) · รายงาน/ใบประกาศ/ตอนพิมพ์ <b>Sarabun</b> · สีเทา gray-400/500 ปรับเข้มให้ผ่าน 4.5:1 (ห้ามแก้ gray-300 ซึ่งเป็นเส้นขอบ)'],
    ['ส่วนประกอบ', 'การ์ดมุมมน 16–24 px ขอบส้มอ่อน · ปุ่มหลักไล่ส้ม · ป้าย (chip) มุมมนเต็ม · Toast กลางจอ (เขียว/แดง) · กล่องยืนยันลบ · แถบถามก่อนปิดฟอร์ม · การ์ดมือถือ · กล่องโหลดไม่สำเร็จ + ลองใหม่'],
    ['ไอคอนและโลโก้', 'lucide-react ทั้งระบบ · ตรา มจธ. วงกลม (<code>public/logo-seal.png</code>) ที่เมนู Dashboard และหน้าเข้าสู่ระบบ'],
    ['โหมดมืด', 'class <code>dark</code> ที่ html (ThemeContext จำค่าในเครื่อง) · ทับสีพื้น/เส้น/ตัวหนังสือใน <code>main</code> · แถบเมนูและหน้าเข้าสู่ระบบใช้คลาส <code>.sidebar-bg</code> <code>.hero-bg</code> <code>.login-*</code>'],
  ], { cls: 'tbl-tight', widths: ['18%', '82%'] })}

<h2>4.5 แผนผังหน้าเว็บ</h2>
${H.mermaid(`flowchart TB
  L["/login · เข้าสู่ระบบ"] --> D["/ · Dashboard"]
  D --> G1 & G2 & G3 & G4
  subgraph G1["ข้อมูลคนพิการ"]
    direction TB
    P["/persons<br/>รายชื่อ · เพิ่ม/แก้<br/>นำเข้า/ส่งออก Excel"] --> PD["/persons/:id<br/>รายละเอียด 8 แท็บ"]
    PD ~~~ DC["/data-check<br/>ข้อมูลยังไม่ครบ"]
  end
  subgraph G2["งานของโครงการ"]
    direction TB
    B["/batches<br/>รุ่น + หลักสูตร"] ~~~ T["/training<br/>การอบรม & ฝึกงาน"] ~~~ F["/followup<br/>ติดตามผล + ถึงรอบ"] ~~~ O["/organizations<br/>สถานประกอบการ"]
  end
  subgraph G3["รายงานและคู่มือ"]
    direction TB
    R["/report<br/>ออกรายงาน 5 แบบ"] ~~~ H["/help<br/>คู่มือการใช้งาน"]
  end
  subgraph G4["เฉพาะผู้ดูแลระบบ"]
    direction TB
    U["/users<br/>ผู้ใช้ + รีเซ็ตระบบ"] ~~~ A["/audit<br/>ประวัติการใช้งาน"] ~~~ DT["/disability-types<br/>ประเภทความพิการ"]
  end`, 'ภาพที่ 4.2 แผนผังหน้าเว็บ (เมนูซ้าย 9 รายการ + ผู้ดูแลระบบ 3 รายการ · กดแถวในหน้าข้อมูลยังไม่ครบ = เปิดฟอร์มแก้ไขที่ /persons?edit=id · ทุกหน้าโหลดแยก lazy)', { width: '92%' })}

<h2>4.6 ลำดับการใช้งานหลัก (User Flow)</h2>
${H.mermaid(`flowchart TD
  A["เลือกไฟล์ Excel"] --> B{"ตรวจทุกแถวในเบราว์เซอร์"}
  B -- "มีช่องไม่ตรง<br/>(รุ่น/หลักสูตร/ความพิการ/จังหวัด)" --> C["กล่องแดง: แถว · ชื่อ · ช่อง · สิ่งที่พิมพ์ · วิธีแก้<br/>ปุ่มนำเข้ากดไม่ได้"]
  C --> D["แก้ในไฟล์แล้วเลือกใหม่"] --> B
  B -- "ผ่าน (อาจมีกล่องเหลือง: แก้ให้แล้ว/เตือน)" --> E["ตารางตัวอย่าง → กดนำเข้า"]
  E --> F{"หลังบ้านตรวจซ้ำ"}
  F -- "ผิด" --> G["400 ไม่นำเข้าสักแถว"]
  F -- "ถูก" --> H["นำเข้าครบทุกแถว + ความพิการ รุ่น หลักสูตร<br/>ลงประวัติการใช้งาน (IMPORT)"]`, 'ภาพที่ 4.3 ลำดับการนำเข้าจาก Excel (ตรวจ 2 ชั้น · ไม่มีข้อมูลเข้าครึ่งๆ กลางๆ)')}
${H.mermaid(`flowchart LR
  A["Dashboard / หน้าติดตามผล<br/>ใครถึงรอบ 3 ด./6 ด./1 ปี"] --> B["กดเบอร์โทร<br/>(มือถือโทรได้ทันที)"] --> C["หน้ารายละเอียด<br/>แท็บติดตามผล"] --> D["บันทึกสถานะการมีงานทำ<br/>ประเภทงาน รายได้ ฯลฯ"] --> E["หายจากรายการรอบนั้น<br/>สถิติการมีงานทำอัปเดต"]`, 'ภาพที่ 4.4 ลำดับการติดตามผลตามรอบ')}
${H.mermaid(`flowchart LR
  A["ตัวเลขข้างเมนู /<br/>การ์ด Dashboard"] --> B["หน้าข้อมูลยังไม่ครบ<br/>กรอง 'ไม่มี…'"] --> C["กดแถว"] --> D["ฟอร์มแก้ไขเปิดทันที<br/>(/persons?edit=id)"] --> E["เติม → บันทึก<br/>ตัวเลขลดทันที"]`, 'ภาพที่ 4.5 ลำดับการเติมข้อมูลที่ยังไม่ครบ')}

<h2>4.7 หน้าจอของระบบ</h2>
<p>ภาพหน้าจอจริงจากระบบเวอร์ชันปัจจุบัน (จอคอม 1400 px · มือถือ 390 px) ถ่ายด้วย<b>ข้อมูลสมมติ</b>ในชุดทดสอบ — ไม่มีข้อมูลคนพิการจริง</p>
${screens}

<h2>4.8 การตัดสินใจด้านการออกแบบ</h2>
${H.table(['วันที่', 'เรื่อง', 'ทางเลือก', 'เลือก / เหตุผล'], [
    ['3 มิ.ย.', 'ฟอร์มข้อมูลคนพิการ', 'ช่องตามโครงสร้างเดิม / ตามแบบฟอร์ม กกจ.พก.1', 'ตามแบบฟอร์ม กกจ.พก.1 — หน่วยงานใช้แบบฟอร์มนี้อยู่แล้ว (ที่อยู่แยก 11 ช่อง)'],
    ['30 มิ.ย.', 'ธีมหน้าเว็บ', 'มินิมอลเทา / ส้ม-ขาวสดใส', 'ส้ม-ขาวสดใส — แบบมินิมอลเทา "จืด ไม่สวย"'],
    ['21 ก.ย.', 'เก็บรูปถ่าย', 'ในฐานข้อมูล (base64) / เป็นไฟล์', 'เป็นไฟล์ชื่อสุ่ม — ฐานข้อมูลไม่บวม สำรองเร็ว เดา URL ไม่ได้'],
    ['9 ต.ค.', 'กราฟ Dashboard', 'โดนัท 4 วงเหมือนกัน / 3 แบบใหม่', 'แบบ B: เลือกรูปกราฟตามข้อมูล (อายุ = แท่งตั้ง · ชื่อยาว = แท่งนอน · 2 ค่า = เลขใหญ่) วาดด้วย CSS — หน้าเล็กลงจาก 386 kB เหลือ 16 kB'],
    ['14 ต.ค.', 'ข้อมูลนำเข้าที่ไม่ตรง', 'ปล่อยว่าง / ไม่นำเข้าทั้งไฟล์', '"ไม่ตรง = นำเข้าไม่ได้" — เดิมรุ่นที่สะกดผิดถูกปล่อยว่าง คนหลุดจากรุ่นโดยไม่มีใครรู้'],
    ['15 ต.ค.', 'วงกลมตัวย่อหน้าชื่อ', '4 แบบจากหน้าจริง', 'เอาออก — "ดูไม่สวย" รายการเหลือชื่อ + ป้าย'],
    ['15 ต.ค.', 'กล่องผู้ใช้มุมซ้ายล่าง', '5 แบบ → การ์ดขาว → การ์ดใส เรืองแสง 5 ระดับ', 'การ์ดใส ชื่อเรืองนุ่ม (F) — เลือกจากภาพขนาดจริง (แบบนีออนซูมแล้วคม แต่ของจริงเบลอ)'],
    ['17 ต.ค.', 'ธีมใหม่แบบระบบจองห้องประชุม', 'A เก็บเมนูซ้าย / B เมนูแถบบน', 'A — มีเมนู 12 รายการ แบบ B ต้องซ่อน 4 เมนูและเต็มพอดีที่จอ 1366 px · ได้สี ฟอนต์ โลโก้ โหมดมืดแบบเดียวกัน'],
  ], { cls: 'tbl-tight', widths: ['9%', '19%', '27%', '45%'] })}
`;
  },
};
