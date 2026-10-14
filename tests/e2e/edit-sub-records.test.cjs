// ข้อ 10: แก้ไขรายการย่อย (อบรม / งาน / ติดตามผล / สถานประกอบการ) ผ่านหน้าเว็บจริง
const path = require('path');
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const org1 = await prisma.organization.create({ data: { orgName: 'ทดสอบอีทูอี บริษัทหนึ่ง' } });
  const org2 = await prisma.organization.create({ data: { orgName: 'ทดสอบอีทูอี บริษัทสอง' } });
  const p = await prisma.person.create({ data: { fullName: 'นาย ทดสอบอีทูอี แก้ย่อย', gender: 'MALE', thaiId: '9999999930031' } });
  const tr = await prisma.trainingRecord.create({ data: { personId: p.id, courseName: 'Excel พื้นฐาน', organizer: 'มจธ.', startDate: new Date('2026-01-05'), endDate: new Date('2026-02-20'), trainingType: 'TRAIN', evaluationResult: 'ผ่าน' } });
  const we = await prisma.workExperience.create({ data: { personId: p.id, organizationName: 'ร้านกาแฟ', jobType: 'บาริสต้า', workMode: 'INTERNSHIP', income: 9000, startDate: new Date('2026-03-01') } });
  const fu = await prisma.followUp.create({ data: { personId: p.id, followUpDate: new Date('2026-06-15'), employmentStatus: 'UNEMPLOYED', jobType: '', satisfaction: 'พอใช้' } });
  const po = await prisma.personOrganization.create({ data: { personId: p.id, orgId: org1.id, roleType: 'INTERNSHIP', amount: 5000, startDate: new Date('2026-03-01') } });

  const b = await browser();
  // หาช่องในหน้าต่างจากชื่อ label
  const field = (label) => `[...document.querySelectorAll('dialog[open] label')].find(l => l.textContent.trim().startsWith(${JSON.stringify(label)})).parentElement.querySelector('input,select,textarea')`;
  const val = (label) => b.evaluate(`${field(label)}.value`);
  const title = () => b.evaluate(`document.querySelector('dialog[open] h3')?.textContent`);
  const openTab = async (name) => { await b.clickText(name, "document.querySelector('main')"); await sleep(400); };
  const editRow = async (cellText) => {
    await b.waitFor(`[...document.querySelectorAll('tbody tr')].some(r => r.textContent.includes(${JSON.stringify(cellText)}))`, 'แถว ' + cellText);
    await b.evaluate(`[...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes(${JSON.stringify(cellText)})).querySelector('button[title="แก้ไข"]').click()`);
    await b.waitFor(`document.querySelector('dialog[open]')`, 'หน้าต่างแก้ไข'); await sleep(250);
  };
  const save = async () => { await b.clickText('บันทึก', "document.querySelector('dialog[open]')"); await b.waitFor(`!document.querySelector('dialog[open]')`, 'หน้าต่างปิด'); await sleep(500); };
  try {
    await b.login(admin.id);
    await b.nav(`/persons/${p.id}`);
    await b.waitFor(`document.body.textContent.includes('ทดสอบอีทูอี แก้ย่อย')`, 'หน้ารายละเอียด');

    console.log('── อบรม');
    await openTab('การอบรม');
    await editRow('Excel พื้นฐาน');
    eq('หัวข้อเป็น "แก้ไขการอบรม"', await title(), 'แก้ไขการอบรม');
    eq('ข้อมูลเดิมกรอกไว้ครบ (วันที่เป็น พ.ศ.)', [await val('ชื่อหลักสูตร'), await val('หน่วยงาน'), await val('วันเริ่ม'), await val('วันสิ้นสุด'), await val('รูปแบบ'), await val('ผลประเมิน')],
      ['Excel พื้นฐาน', 'มจธ.', '05/01/2569', '20/02/2569', 'TRAIN', 'ผ่าน']);
    await b.screenshot(shot('10-edit-training.png'));
    await b.setValue(field('ชื่อหลักสูตร'), 'Excel ขั้นกลาง');
    await b.setValue(field('วันสิ้นสุด'), '28022569');
    await save();
    const tr2 = await prisma.trainingRecord.findUnique({ where: { id: tr.id } });
    eq('บันทึกแล้วแก้ในฐานข้อมูล (ไม่ได้เพิ่มรายการใหม่)', [tr2.courseName, tr2.endDate.toISOString().slice(0, 10), tr2.organizer, await prisma.trainingRecord.count({ where: { personId: p.id } })], ['Excel ขั้นกลาง', '2026-02-28', 'มจธ.', 1]);

    await editRow('Excel ขั้นกลาง');
    await b.setValue(field('ชื่อหลักสูตร'), 'ไม่ควรถูกบันทึก');
    await b.clickText('ยกเลิก', "document.querySelector('dialog[open]')"); await sleep(300);
    eq('แก้แล้วกดยกเลิก → ถามก่อนปิด', await b.evaluate(`document.querySelector('dialog[open]')?.textContent.includes('ยังไม่ได้บันทึก')`), true);
    await b.clickText('ปิดโดยไม่บันทึก', "document.querySelector('dialog[open]')"); await sleep(300);
    eq('แก้แล้วกดยกเลิก → ไม่เปลี่ยน', (await prisma.trainingRecord.findUnique({ where: { id: tr.id } })).courseName, 'Excel ขั้นกลาง');

    await editRow('Excel ขั้นกลาง');
    await b.setValue(field('วันเริ่ม'), '01032569');   // หลังวันสิ้นสุด 28/02
    await b.clickText('บันทึก', "document.querySelector('dialog[open]')"); await sleep(400);
    eq('วันเริ่มหลังวันสิ้นสุด → ไม่ยอมบันทึก', [await b.evaluate(`!!document.querySelector('dialog[open]')`), (await prisma.trainingRecord.findUnique({ where: { id: tr.id } })).startDate.toISOString().slice(0, 10)], [true, '2026-01-05']);
    await b.clickText('ยกเลิก', "document.querySelector('dialog[open]')"); await sleep(300);
    eq('แก้แล้วกดยกเลิก → ถามก่อนปิด', await b.evaluate(`document.querySelector('dialog[open]')?.textContent.includes('ยังไม่ได้บันทึก')`), true);
    await b.clickText('ปิดโดยไม่บันทึก', "document.querySelector('dialog[open]')"); await sleep(300);

    console.log('── เพิ่มใหม่ยังใช้ได้');
    await b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.trim() === 'เพิ่ม' && x.offsetParent).click()`);
    await b.waitFor(`document.querySelector('dialog[open]')`, 'หน้าต่างเพิ่ม'); await sleep(250);
    eq('หน้าต่างเพิ่ม: หัวข้อ "เพิ่มการอบรม" + ช่องว่าง', [await title(), await val('ชื่อหลักสูตร'), await val('วันเริ่ม')], ['เพิ่มการอบรม', '', '']);
    await b.setValue(field('ชื่อหลักสูตร'), 'Word พื้นฐาน');
    await save();
    eq('เพิ่มใหม่ได้ (รวม 2 รายการ)', await prisma.trainingRecord.count({ where: { personId: p.id } }), 2);

    console.log('── ประสบการณ์งาน');
    await openTab('ประสบการณ์งาน');
    await editRow('ร้านกาแฟ');
    eq('ข้อมูลเดิมครบ', [await val('ชื่อองค์กร'), await val('ประเภทงาน'), await val('รูปแบบงาน'), await val('รายได้'), await val('วันเริ่ม'), await val('วันสิ้นสุด')], ['ร้านกาแฟ', 'บาริสต้า', 'INTERNSHIP', '9000', '01/03/2569', '']);
    await b.setValue(field('รูปแบบงาน'), 'EMPLOYMENT'); await b.setValue(field('รายได้'), '15000');
    await save();
    const we2 = await prisma.workExperience.findUnique({ where: { id: we.id } });
    eq('แก้รูปแบบ + รายได้แล้ว', [we2.workMode, Number(we2.income), we2.organizationName], ['EMPLOYMENT', 15000, 'ร้านกาแฟ']);

    console.log('── ติดตามผล');
    await openTab('ติดตามผล');
    await editRow('15/06/2569');
    eq('ข้อมูลเดิมครบ', [await val('วันที่ติดตาม'), await val('สถานะงาน'), await val('ความพึงพอใจ')], ['15/06/2569', 'UNEMPLOYED', 'พอใช้']);
    await b.setValue(field('สถานะงาน'), 'EMPLOYED'); await b.setValue(field('ประเภทงาน'), 'พนักงานธุรการ');
    await save();
    const fu2 = await prisma.followUp.findUnique({ where: { id: fu.id } });
    eq('แก้สถานะงานแล้ว วันที่เดิมไม่เพี้ยน', [fu2.employmentStatus, fu2.jobType, fu2.followUpDate.toISOString().slice(0, 10)], ['EMPLOYED', 'พนักงานธุรการ', '2026-06-15']);

    console.log('── สถานประกอบการ');
    await openTab('สถานประกอบการ');
    await editRow('ทดสอบอีทูอี บริษัทหนึ่ง');
    eq('ข้อมูลเดิมครบ', [await val('สถานประกอบการ'), await val('บทบาท'), await val('เงินสนับสนุน')], [String(org1.id), 'INTERNSHIP', '5000']);
    await b.setValue(field('สถานประกอบการ'), String(org2.id)); await b.setValue(field('บทบาท'), 'EMPLOYMENT');
    await save();
    const po2 = await prisma.personOrganization.findUnique({ where: { id: po.id } });
    eq('ย้ายไปบริษัทสอง + บทบาทจ้างงาน', [po2.orgId, po2.roleType, Number(po2.amount)], [org2.id, 'EMPLOYMENT', 5000]);
    eq('ตารางโชว์บริษัทใหม่', await b.evaluate(`document.querySelector('tbody').textContent.includes('ทดสอบอีทูอี บริษัทสอง')`), true);
    eq('ไม่มี error ในหน้าเว็บ', b.errors, []);
  } catch (e) {
    console.log('FAIL  ทดสอบสะดุด:', e.message); await b.screenshot(shot('crash-10.png'));
    eq('ไม่สะดุด', e.message, '');
  } finally {
    await b.close();
    await prisma.person.delete({ where: { id: p.id } });
    await prisma.organization.deleteMany({ where: { id: { in: [org1.id, org2.id] } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ label: { contains: 'ทดสอบอีทูอี' } }, { personId: p.id }] } });
    const f = summary();
    await prisma.$disconnect();
    process.exit(f ? 1 : 0);
  }
})().catch((e) => { console.error(e); process.exit(1); });
