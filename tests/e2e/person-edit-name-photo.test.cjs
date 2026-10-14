// ข้อ 1 (ชื่อไม่เพี้ยนตอนแก้ไข) + ข้อ 5 (ปุ่มลบรูปในฟอร์มลบจริง) — กดผ่านหน้าเว็บจริง
const fs = require('fs');
const path = require('path');
const { prisma, browser, eq, summary, sleep, API, SECRET, jwt, B, UPLOAD_DIR } = require('../lib.cjs');
const SHOT = require('../lib.cjs').OUT + '/shots';
fs.mkdirSync(SHOT, { recursive: true });

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const batch = await prisma.trainingBatch.create({ data: { batchNumber: 980, year: 2569, courseName: 'ทดสอบอีทูอี' } });
  const base = { birthDate: new Date('1997-05-15'), province: 'กรุงเทพมหานคร', mobile: '0811111111', educationLevel: 'ปริญญาตรี', batchId: batch.id };
  const p1 = await prisma.person.create({ data: { ...base, fullName: 'นางสาว ทดสอบอีทูอี หนึ่ง', gender: 'FEMALE', thaiId: '9999999930001' } });
  const p2 = await prisma.person.create({ data: { ...base, fullName: 'ทดสอบอีทูอี สอง', gender: 'FEMALE', thaiId: '9999999930002' } });
  // ใส่รูปให้คนที่ 1 ผ่าน API จริง (ไฟล์จะอยู่บนดิสก์)
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: admin.id }, SECRET) };
  const up = await (await fetch(`${API}/persons/${p1.id}/photos`, { method: 'POST', headers: H, body: JSON.stringify({ filePath: 'data:image/jpeg;base64,' + Buffer.alloc(2000, 5).toString('base64'), photoType: 'profile' }) })).json();
  const photoFile = path.join(UPLOAD_DIR, path.basename(up.filePath));

  const b = await browser();
  try {
    await b.login(admin.id);
    const openEdit = async (name) => {
      await b.nav('/persons?q=' + encodeURIComponent('ทดสอบอีทูอี'));
      await b.waitFor(`[...document.querySelectorAll('tbody tr')].some(r => r.textContent.includes(${JSON.stringify(name)}))`, 'แถว ' + name);
      await b.evaluate(`[...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes(${JSON.stringify(name)})).querySelectorAll('td:last-child button')[1].click()`);
      await b.waitFor(`document.querySelector('dialog[open]') && document.querySelector('dialog[open] input[placeholder="ชื่อ นามสกุล"]').value !== ''`, 'ฟอร์มแก้ไขโหลดเสร็จ');
      await sleep(600);   // รอรูปเดิมโหลด
    };
    const formState = () => b.evaluate(`(() => { const d = document.querySelector('dialog[open]'); return { prefix: d.querySelector('select').value, name: d.querySelector('input[placeholder="ชื่อ นามสกุล"]').value, hasPhoto: !!d.querySelector('img[alt="รูปถ่าย"]') }; })()`);
    const save = async () => {
      await b.clickText('บันทึกข้อมูล', "document.querySelector('dialog[open]')");
      await b.waitFor(`!document.querySelector('dialog[open]')`, 'ฟอร์มปิดหลังบันทึก', 15000);
      await sleep(500);
    };

    console.log('── ข้อ 1: นางสาว');
    await openEdit('ทดสอบอีทูอี หนึ่ง');
    eq('ฟอร์มโชว์คำนำหน้า "นางสาว" + ชื่อถูก (เดิมขึ้น นาง + "สาว ...")', await b.evaluate(`(() => { const d = document.querySelector('dialog[open]'); return [d.querySelector('select').value, d.querySelector('input[placeholder="ชื่อ นามสกุล"]').value]; })()`), ['นางสาว', 'ทดสอบอีทูอี หนึ่ง']);
    await b.screenshot(path.join(SHOT, '1-edit-nangsao.png'));
    await save();
    eq('บันทึก 1 รอบ ชื่อในฐานข้อมูลไม่เพี้ยน', (await prisma.person.findUnique({ where: { id: p1.id } })).fullName, 'นางสาว ทดสอบอีทูอี หนึ่ง');
    await openEdit('ทดสอบอีทูอี หนึ่ง'); await save();
    eq('บันทึกรอบ 2 ยังไม่เพี้ยน', (await prisma.person.findUnique({ where: { id: p1.id } })).fullName, 'นางสาว ทดสอบอีทูอี หนึ่ง');

    console.log('── ข้อ 1: ไม่มีคำนำหน้า');
    await openEdit('ทดสอบอีทูอี สอง');
    eq('ฟอร์มโชว์ "ไม่ระบุ" (เดิมเติม นาย ให้เอง)', (await formState()).prefix, '');
    await save();
    eq('บันทึกแล้วไม่โดนเติม "นาย"', (await prisma.person.findUnique({ where: { id: p2.id } })).fullName, 'ทดสอบอีทูอี สอง');

    console.log('── ข้อ 5: ปุ่มลบรูปในฟอร์ม');
    eq('ก่อนลบ: มีรูปในฐานข้อมูล + ไฟล์บนดิสก์', [await prisma.personPhoto.count({ where: { personId: p1.id } }), fs.existsSync(photoFile)], [1, true]);
    await openEdit('ทดสอบอีทูอี หนึ่ง');
    eq('ฟอร์มโชว์รูปเดิม', (await formState()).hasPhoto, true);
    await b.evaluate(`[...document.querySelectorAll('dialog[open] button')].find(x => x.textContent.includes('ลบรูป')).click()`);
    await sleep(200);
    eq('กดลบรูปแล้วรูปหายจากฟอร์ม', (await formState()).hasPhoto, false);
    await b.clickText('ยกเลิก', "document.querySelector('dialog[open]')").catch(() => b.evaluate(`document.querySelector('dialog[open]').close()`));
    await sleep(400);
    eq('กดยกเลิก → รูปยังอยู่ (ยังไม่ลบจริง)', await prisma.personPhoto.count({ where: { personId: p1.id } }), 1);
    await openEdit('ทดสอบอีทูอี หนึ่ง');
    await b.evaluate(`[...document.querySelectorAll('dialog[open] button')].find(x => x.textContent.includes('ลบรูป')).click()`);
    await save();
    eq('กดลบรูป + บันทึก → รูปหายจากฐานข้อมูล', await prisma.personPhoto.count({ where: { personId: p1.id } }), 0);
    eq('ไฟล์รูปบนดิสก์หายด้วย', fs.existsSync(photoFile), false);
    eq('ไม่มี error ในหน้าเว็บ', b.errors, []);
  } catch (e) {
    console.log('FAIL  ทดสอบสะดุด:', e.message); await b.screenshot(path.join(SHOT, 'crash-1-5.png'));
    eq('ไม่สะดุด', e.message, '');
  } finally {
    await b.close();
    const ids = [p1.id, p2.id];
    const photos = await prisma.personPhoto.findMany({ where: { personId: { in: ids } } });
    for (const ph of photos) { const f = path.join(UPLOAD_DIR, path.basename(ph.filePath)); if (fs.existsSync(f)) fs.unlinkSync(f); }
    await prisma.person.deleteMany({ where: { id: { in: ids } } });
    await prisma.trainingBatch.delete({ where: { id: batch.id } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ label: { contains: 'ทดสอบอีทูอี' } }, { personId: { in: ids } }] } });
    const f = summary();
    await prisma.$disconnect();
    process.exit(f ? 1 : 0);
  }
})().catch((e) => { console.error(e); process.exit(1); });
