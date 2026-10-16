// ตรวจว่าข้อมูลคนพิการขาดอะไร (หน้า "ข้อมูลยังไม่ครบ" /data-check) — เฉพาะช่องที่รายงาน/แบบฟอร์มส่งหน่วยงานใช้
// ทุกช่องเติมได้ในฟอร์มแก้ไขคนพิการหน้ารายชื่อ (รวมประเภทความพิการ)
const blank = (v) => !String(v ?? '').trim();

const CHECKS = [
  { key: 'thaiId', label: 'เลขบัตรประชาชน', miss: (p) => !/^\d{13}$/.test(String(p.thaiId ?? '').trim()) },   // ไม่มี หรือไม่ครบ 13 หลัก (ฟอร์มบังคับ 13 หลัก)
  // คนที่เสียชีวิตแล้ว ไม่ต้องตามเบอร์โทร
  { key: 'phone', label: 'เบอร์โทร', miss: (p) => p.lifeStatus !== 'DECEASED' && blank(p.phone) && blank(p.mobile) },
  { key: 'birthDate', label: 'วันเกิด', miss: (p) => !p.birthDate },
  { key: 'province', label: 'จังหวัด', miss: (p) => blank(p.province) },
  { key: 'education', label: 'ระดับการศึกษา', miss: (p) => blank(p.educationLevel) },
  { key: 'batch', label: 'รุ่นอบรม', miss: (p) => !p.batchId },   // ฟอร์มแก้ไขบังคับเลือกรุ่น
  { key: 'disability', label: 'ประเภทความพิการ', miss: (p) => (p.disabilityCount ?? p.disabilityInfos?.length ?? 0) === 0 },
];

const missingFields = (p) => CHECKS.filter((c) => c.miss(p)).map((c) => c.key);

module.exports = { CHECKS, missingFields };
