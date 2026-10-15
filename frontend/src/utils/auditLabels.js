// ชื่อ/สีของประวัติการใช้งาน — ใช้ร่วมกันระหว่างหน้า "ประวัติการใช้งาน" กับแท็บ "ประวัติการแก้ไข" ในหน้ารายละเอียดคนพิการ
export const AUDIT_ACTIONS = {
  CREATE:       { label: 'เพิ่ม',              cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  UPDATE:       { label: 'แก้ไข',              cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  DELETE:       { label: 'ลบ',                cls: 'bg-red-100 text-red-700 border-red-200' },
  IMPORT:       { label: 'นำเข้า Excel',       cls: 'bg-sky-100 text-sky-700 border-sky-200' },
  RESET:        { label: 'ล้างข้อมูลทั้งหมด',   cls: 'bg-red-600 text-white border-red-700' },
  LOGIN:        { label: 'เข้าสู่ระบบ',         cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  LOGIN_FAILED: { label: 'ล็อกอินไม่สำเร็จ',    cls: 'bg-rose-100 text-rose-700 border-rose-200' },
};
export const auditAction = (a) => AUDIT_ACTIONS[a] || { label: a, cls: 'bg-gray-100 text-gray-600 border-gray-200' };

export const AUDIT_ENTITIES = {
  person: 'ข้อมูลคนพิการ', disability: 'ข้อมูลความพิการ', training: 'ประวัติอบรม',
  workexp: 'ประสบการณ์งาน', followup: 'ติดตามผล', skills: 'ทักษะ', personorg: 'สถานประกอบการของคน',
  photos: 'รูปถ่าย', assessments: 'ผลประเมิน', organization: 'สถานประกอบการ', batch: 'รุ่นอบรม',
  course: 'หลักสูตร', user: 'ผู้ใช้งาน', system: 'ระบบ', auth: 'บัญชี', disabilityType: 'ประเภทความพิการ',
};

export const fmtAuditTime = (iso) => new Date(iso).toLocaleString('th-TH', {
  day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
});
