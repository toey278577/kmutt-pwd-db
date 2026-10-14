// unit test ตัวคำนวณรอบติดตามผล
const { evaluatePerson, addMonths, todayBangkok } = require('../../backend/src/utils/followupDue');
const D = (s) => new Date(`${s}T00:00:00Z`);
let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  g === w ? pass++ : fail++;
  console.log(`${g === w ? 'PASS' : 'FAIL'}  ${name}${g === w ? '' : `\n      ได้ ${g}\n      ควร ${w}`}`);
};
const states = (r) => r.rounds.map((x) => x.state);
const cur = (r) => r.current && { m: r.current.months, d: r.current.daysLeft, s: r.current.status };

console.log('── บวกเดือน');
eq('31 ม.ค. + 1 เดือน = 28 ก.พ.', addMonths(D('2026-01-31'), 1).toISOString().slice(0, 10), '2026-02-28');
eq('30 พ.ย. + 3 เดือน ข้ามปี', addMonths(D('2025-11-30'), 3).toISOString().slice(0, 10), '2026-02-28');
eq('15 มี.ค. + 12 เดือน', addMonths(D('2026-03-15'), 12).toISOString().slice(0, 10), '2027-03-15');
eq('วันนี้ตามเวลาไทย (23:30 UTC = วันรุ่งขึ้นที่ไทย)', todayBangkok(new Date('2026-10-14T23:30:00Z')).toISOString().slice(0, 10), '2026-10-15');

const end = D('2026-01-15'); // จบอบรม → รอบ 3ด = 15 เม.ย., 6ด = 15 ก.ค., 12ด = 15 ม.ค. 69(2027)
console.log('── จบ 15 ม.ค. 2026');
eq('ยังไม่ถึงช่วง (1 มี.ค.) → ไม่เตือน', cur(evaluatePerson(end, [], D('2026-03-01'))), null);
eq('ช่วง 3ด เพิ่งเปิด (20 มี.ค.) → ใกล้ถึง อีก 26 วัน', cur(evaluatePerson(end, [], D('2026-03-20'))), { m: 3, d: 26, s: 'upcoming' });
eq('ครบกำหนดวันนี้ (15 เม.ย.) → overdue 0 วัน', cur(evaluatePerson(end, [], D('2026-04-15'))), { m: 3, d: 0, s: 'overdue' });
eq('เลย 3ด ไป 10 วัน', cur(evaluatePerson(end, [], D('2026-04-25'))), { m: 3, d: -10, s: 'overdue' });
eq('ติดตามแล้ว 10 เม.ย. → ไม่เตือน', cur(evaluatePerson(end, [D('2026-04-10')], D('2026-04-25'))), null);
eq('ช่วง 6ด เปิด ไม่เคยติดตาม → 3ด ขาด, เตือน 6ด', states(evaluatePerson(end, [], D('2026-06-20'))), ['missed', 'current', 'future']);
eq('ติดตามเดือนที่ 7 (10 ส.ค.) → นับเป็นรอบ 6ด', states(evaluatePerson(end, [D('2026-08-10')], D('2026-09-01'))), ['missed', 'done', 'future']);
eq('ติดตามก่อนช่วงเปิด (1 ก.พ.) ไม่นับเป็นรอบไหน', states(evaluatePerson(end, [D('2026-02-01')], D('2026-04-20'))), ['current', 'future', 'future']);
eq('ครบ 3 รอบ → ไม่เตือน', cur(evaluatePerson(end, [D('2026-04-15'), D('2026-07-15'), D('2027-01-15')], D('2027-02-01'))), null);
eq('รอบ 1 ปี เลยมา 100 วัน → ยังเตือน', cur(evaluatePerson(end, [], D('2027-04-25'))), { m: 12, d: -100, s: 'overdue' });
eq('รอบ 1 ปี เลยมาเกิน 180 วัน → เลิกเตือน', cur(evaluatePerson(end, [], D('2027-08-01'))), null);

console.log(`\nสรุป: ผ่าน ${pass} / ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
