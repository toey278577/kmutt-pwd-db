// unit test ตัวตรวจข้อมูลไม่ครบ (หน้า "ข้อมูลยังไม่ครบ")
const { CHECKS, missingFields } = require('../../backend/src/utils/incomplete');
let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  g === w ? pass++ : fail++;
  console.log(`${g === w ? 'PASS' : 'FAIL'}  ${name}${g === w ? '' : `\n      ได้ ${g}\n      ควร ${w}`}`);
};
const full = { thaiId: '1234567890123', phone: '', mobile: '0812345678', birthDate: new Date('1990-01-01'), province: 'นนทบุรี',
  educationLevel: 'ปริญญาตรี', batchId: 3, lifeStatus: 'ALIVE', disabilityCount: 1 };

eq('ช่องที่ตรวจ (ตรงกับช่องบังคับในฟอร์มแก้ไข)', CHECKS.map((c) => c.key), ['thaiId', 'phone', 'birthDate', 'province', 'education', 'batch', 'disability']);
eq('ครบทุกช่อง → ไม่ขาดอะไร', missingFields(full), []);
eq('ว่างทุกช่อง → ขาดครบ 7 ช่อง', missingFields({ lifeStatus: 'ALIVE' }), ['thaiId', 'phone', 'birthDate', 'province', 'education', 'batch', 'disability']);
eq('ช่องที่มีแต่เว้นวรรค = ว่าง', missingFields({ ...full, province: '   ', educationLevel: ' ' }), ['province', 'education']);
eq('เลขบัตรไม่ครบ 13 หลัก / มีตัวอักษร = ต้องแก้', [missingFields({ ...full, thaiId: '12345' }), missingFields({ ...full, thaiId: '12345678901ab' })], [['thaiId'], ['thaiId']]);
eq('มีเบอร์บ้านอย่างเดียว (ไม่มีมือถือ) = ไม่ขาด', missingFields({ ...full, mobile: null, phone: '021234567' }), []);
eq('ไม่มีทั้งเบอร์บ้านและมือถือ = ขาดเบอร์โทร', missingFields({ ...full, mobile: null, phone: null }), ['phone']);
eq('เสียชีวิตแล้วไม่มีเบอร์ = ไม่ต้องตาม', missingFields({ ...full, mobile: null, phone: null, lifeStatus: 'DECEASED' }), []);
eq('ความพิการ: นับจาก disabilityCount หรือ disabilityInfos', [missingFields({ ...full, disabilityCount: 0 }), missingFields({ ...full, disabilityCount: undefined, disabilityInfos: [{ id: 1 }] })], [['disability'], []]);

console.log(`\nสรุป: ผ่าน ${pass} / ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
