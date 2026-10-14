const { matchBatch, matchCourse, matchDisabilities } = await import(new URL('../../frontend/src/utils/importCheck.js', import.meta.url));
let pass = 0, fail = 0;
const eq = (n, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `\n      ได้  ${JSON.stringify(g)}\n      ควร ${JSON.stringify(w)}`}`); };

const batches = [
  { id: 1, batchNumber: 13, year: 2569, courses: [{ id: 11, name: 'ธุรการสำนักงาน' }, { id: 12, name: 'Data Entry' }] },
  { id: 2, batchNumber: 12, year: 2568, courses: [] },
  { id: 3, batchNumber: 5, year: 2566, courses: [] },
  { id: 4, batchNumber: 5, year: 2567, courses: [] },
];
const types = ['ความพิการทางการมองเห็น', 'ความพิการทางการได้ยิน', 'ความพิการทางร่างกายหรือการเคลื่อนไหว', 'ความพิการทางสติปัญญา', 'ความพิการทางจิตใจหรือพฤติกรรม', 'ความพิการทางการเรียนรู้', 'ความพิการทางการออทิสติก'].map((typeName, i) => ({ id: i + 1, typeName }));
const st = (r) => r.status;

console.log('── รุ่น');
eq('13 / 2569 → ok', [st(matchBatch('13', '2569', batches)), matchBatch('13', '2569', batches).batchId], ['ok', '1']);
eq('ตัวเลขจาก Excel (number) 13, 2569', matchBatch(13, 2569, batches).batchId, '1');
eq('"รุ่นที่ 13" มีคำนำหน้า → ok', matchBatch('รุ่นที่ 13', '2569', batches).batchId, '1');
eq('ไม่ใส่ปี + มีรุ่นเดียว → ok', matchBatch('12', '', batches).batchId, '2');
eq('ไม่ใส่ปี + รุ่น 5 มีหลายปี → bad', [st(matchBatch('5', '', batches)), matchBatch('5', '', batches).reason], ['bad', 'มีรุ่นที่ 5 หลายปี — ใส่ช่อง "ปี" ด้วย']);
eq('รุ่นที่ไม่มีในระบบ → bad + บอกวิธีแก้', [st(matchBatch('14', '2569', batches)), matchBatch('14', '2569', batches).reason], ['bad', 'ไม่มีรุ่นที่ 14/2569 ในระบบ — สร้างรุ่นที่หน้า "จัดการรุ่น" ก่อน']);
eq('ปีผิด (ค.ศ. 2026) → bad', st(matchBatch('13', '2026', batches)), 'bad');
eq('ว่าง → empty', st(matchBatch('', '', batches)), 'empty');

console.log('── หลักสูตร');
const b13 = matchBatch('13', '2569', batches);
eq('ตรงเป๊ะ → ok', [st(matchCourse('ธุรการสำนักงาน', b13)), matchCourse('ธุรการสำนักงาน', b13).courseId], ['ok', '11']);
eq('ต่างแค่ช่องว่าง/ตัวเล็ก → fixed', [st(matchCourse('data  entry', b13)), matchCourse('data  entry', b13).courseId], ['fixed', '12']);
eq('ไม่มีในรุ่น → bad + บอกที่มี', [st(matchCourse('บาริสต้า', b13)), matchCourse('บาริสต้า', b13).reason], ['bad', 'รุ่นนี้ไม่มีหลักสูตรนี้ — ที่มี: ธุรการสำนักงาน, Data Entry']);
eq('รุ่นที่ยังไม่มีหลักสูตร → bad', matchCourse('อะไรก็ได้', matchBatch('12', '2568', batches)).reason, 'รุ่นนี้ยังไม่ได้เพิ่มหลักสูตร — เพิ่มที่หน้า "จัดการรุ่น" ก่อน');
eq('ใส่หลักสูตรแต่รุ่นผิด → bad', st(matchCourse('ธุรการสำนักงาน', matchBatch('99', '2569', batches))), 'bad');
eq('ว่าง → empty', st(matchCourse('', b13)), 'empty');

console.log('── ประเภทความพิการ');
eq('ชื่อเต็ม → ok', [st(matchDisabilities('ความพิการทางการมองเห็น', types)), matchDisabilities('ความพิการทางการมองเห็น', types).ids], ['ok', ['1']]);
eq('ย่อ "การได้ยิน" → fixed', [st(matchDisabilities('การได้ยิน', types)), matchDisabilities('การได้ยิน', types).names], ['fixed', ['ความพิการทางการได้ยิน']]);
eq('ย่อ "เคลื่อนไหว" → ร่างกาย', matchDisabilities('เคลื่อนไหว', types).ids, ['3']);
eq('ย่อ "ออทิสติก"', matchDisabilities('ออทิสติก', types).ids, ['7']);
eq('หลายประเภท คั่น , และ ;', matchDisabilities('มองเห็น, ได้ยิน; สติปัญญา', types).ids, ['1', '2', '4']);
eq('คั่นด้วย "และ"', matchDisabilities('การมองเห็น และ การเรียนรู้', types).ids, ['1', '6']);
eq('ซ้ำกันในช่องเดียว → นับครั้งเดียว', matchDisabilities('มองเห็น, ความพิการทางการมองเห็น', types).ids, ['1']);
eq('ไม่รู้จัก "หูหนวก" → bad', [st(matchDisabilities('หูหนวก', types)), matchDisabilities('หูหนวก', types).reason], ['bad', 'ไม่รู้จัก "หูหนวก" — ใช้ชื่อตามชีต "ประเภทความพิการ" ในเทมเพลต']);
eq('มีตัวหนึ่งผิด → bad ทั้งช่อง', st(matchDisabilities('มองเห็น, ขาขาด', types)), 'bad');
eq('สั้นเกิน/กำกวม "ทาง" → bad', st(matchDisabilities('ทาง', types)), 'bad');
eq('ว่าง → empty', st(matchDisabilities('  ', types)), 'empty');
console.log(`\nสรุป: ผ่าน ${pass} / ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
