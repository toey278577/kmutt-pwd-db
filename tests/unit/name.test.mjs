const { splitPrefix, nameInitials } = await import(new URL('../../frontend/src/utils/name.js', import.meta.url));
let pass = 0, fail = 0;
const eq = (n, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  ได้ ${JSON.stringify(g)} ควร ${JSON.stringify(w)}`}`); };
// จำลองฟอร์ม: เปิดแก้ไข (split) → กดบันทึก (ประกอบชื่อกลับ) ทำซ้ำ 3 รอบ
const roundTrip = (full) => { let n = full; for (let i = 0; i < 3; i++) { const { prefix, nameOnly } = splitPrefix(n); n = `${prefix}${prefix ? ' ' : ''}${nameOnly}`; } return n; };
console.log('── ตัดคำนำหน้า');
eq('นางสาว มีวรรค', splitPrefix('นางสาว มาลี รักงาน'), { prefix: 'นางสาว', nameOnly: 'มาลี รักงาน' });
eq('นางสาว ติดกัน', splitPrefix('นางสาวมาลี รักงาน'), { prefix: 'นางสาว', nameOnly: 'มาลี รักงาน' });
eq('นาง', splitPrefix('นาง สมศรี มีสุข'), { prefix: 'นาง', nameOnly: 'สมศรี มีสุข' });
eq('นาย', splitPrefix('นาย สมชาย ใจดี'), { prefix: 'นาย', nameOnly: 'สมชาย ใจดี' });
eq('เด็กหญิง', splitPrefix('เด็กหญิง ฝน ใส'), { prefix: 'เด็กหญิง', nameOnly: 'ฝน ใส' });
eq('ไม่มีคำนำหน้า → ไม่เติมอะไร', splitPrefix('มาลี รักงาน'), { prefix: '', nameOnly: 'มาลี รักงาน' });
eq('ชื่อ "นายิกา" ไม่ใช่คำนำหน้า', splitPrefix('นายิกา ดีงาม'), { prefix: '', nameOnly: 'นายิกา ดีงาม' });
eq('ชื่อ "นางนุช" ติดกัน (ถือเป็นนาง+นุช)', splitPrefix('นางนุช สวย').prefix, 'นาง');
eq('ช่องว่างหัวท้าย', splitPrefix('  นางสาว  มาลี  '), { prefix: 'นางสาว', nameOnly: 'มาลี' });
console.log('── กดแก้ไข-บันทึกซ้ำ 3 รอบ ชื่อต้องไม่เพี้ยน');
for (const n of ['นางสาว มาลี รักงาน', 'นาง สมศรี มีสุข', 'นาย สมชาย ใจดี', 'มาลี รักงาน', 'นายิกา ดีงาม', 'เด็กชาย ต้น กล้า'])
  eq(n, roundTrip(n), n);
eq('นางสาวติดกัน → เติมวรรคให้ แล้วนิ่ง', roundTrip('นางสาวมาลี รักงาน'), 'นางสาว มาลี รักงาน');
console.log('── ตัวย่อในวงกลม');
eq('นางสาว มาลี รักงาน', nameInitials('นางสาว มาลี รักงาน'), 'มร');
eq('นาย สมชาย ใจดี (ข้ามสระหน้า ใ)', nameInitials('นาย สมชาย ใจดี'), 'สจ');
eq('ชื่อเดียว', nameInitials('นาง ศรี'), 'ศ');
eq('ไม่มีวรรณยุกต์ลอยมา (ปุ๋ย ทั้ง)', nameInitials('ปุ๋ย ทั้งหมด'), 'ปท');
eq('สระหน้า เ แ โ', nameInitials('เอก แสง'), 'อส');
eq('ภาษาอังกฤษ', nameInitials('john smith'), 'JS');
eq('ว่าง', nameInitials(''), '?');
console.log(`\nสรุป: ผ่าน ${pass} / ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
