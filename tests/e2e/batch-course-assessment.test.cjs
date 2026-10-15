// จัดการรุ่น: เพิ่มรุ่นผ่านฟอร์มจริง (วันที่ พ.ศ., วันสิ้นสุดก่อนวันเริ่ม = ไม่ให้บันทึก) → เพิ่ม/ลบหลักสูตร → แก้รุ่น → ลบรุ่น
// + กรอกคะแนนประเมิน pre/post + soft skills ในหน้ารายละเอียด (เกินคะแนนเต็ม = ปรับให้เอง) → โชว์ในหน้าการอบรม
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');
const MODAL = `[...document.querySelectorAll('div.fixed.inset-0')].find(d => d.textContent.includes('เพิ่มรุ่นใหม่') || d.textContent.includes('แก้ไขรุ่น'))`;

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const person = await prisma.person.findFirst({ where: { thaiId: '8888888810001' } });
  const batch813 = await prisma.trainingBatch.findFirst({ where: { batchNumber: 813 } });
  const b = await browser();
  const field = (label) => `[...${MODAL}.querySelectorAll('label')].find(l => l.textContent.includes(${JSON.stringify(label)})).parentElement.querySelector('input,select')`;
  const card = (n) => `[...document.querySelectorAll('main .rounded-2xl')].find(c => c.querySelector('span')?.textContent.trim() === 'รุ่นที่ ${n}')`;
  const confirmYes = async () => {
    await b.waitFor(`[...document.querySelectorAll('button')].some(x => x.textContent.trim() === 'ยืนยัน')`, 'กล่องยืนยัน');
    await b.evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'ยืนยัน').click(), true`); await sleep(700);
  };
  try {
    await b.login(admin.id);
    console.log('── เพิ่มรุ่น');
    await b.nav('/batches');
    await b.waitFor(card(813), 'รุ่น 813');
    await b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.includes('เพิ่มรุ่น')).click(), true`);
    await b.waitFor(MODAL, 'ฟอร์มเพิ่มรุ่น'); await sleep(200);
    await b.setValue(field('รุ่นที่'), '901');
    await b.setValue(field('ปี พ.ศ.'), '2569');
    await b.setValue(field('ชื่อโครงการ'), 'ทดสอบรุ่น อีทูอี');
    await b.setValue(field('วันเริ่ม'), '01082569');
    await b.setValue(field('วันสิ้นสุด'), '01072569');
    await b.clickText('บันทึก', MODAL); await sleep(500);
    eq('วันสิ้นสุดก่อนวันเริ่ม → ไม่บันทึก + ฟอร์มยังเปิด', [await prisma.trainingBatch.count({ where: { batchNumber: 901 } }), await b.evaluate(`!!${MODAL}`)], [0, true]);
    await b.setValue(field('วันสิ้นสุด'), '30092569');
    await b.clickText('บันทึก', MODAL);
    await b.waitFor(`!${MODAL}`, 'ฟอร์มปิด', 10000); await sleep(600);
    const nb = await prisma.trainingBatch.findFirst({ where: { batchNumber: 901 } });
    eq('บันทึกรุ่นใหม่ วันที่ พ.ศ. → ค.ศ. ถูก', [nb?.year, nb?.courseName, nb?.startDate?.toISOString().slice(0, 10), nb?.endDate?.toISOString().slice(0, 10)], [2569, 'ทดสอบรุ่น อีทูอี', '2026-08-01', '2026-09-30']);
    eq('การ์ดรุ่นใหม่ขึ้นในหน้า', await b.evaluate(`!!${card(901)}`), true);

    console.log('── หลักสูตร');
    await b.setValue(`${card(901)}.querySelector('input[placeholder="เพิ่มชื่อหลักสูตร..."]')`, 'ช่างซ่อมคอม');
    await b.evaluate(`[...${card(901)}.querySelectorAll('button')].find(x => x.textContent.trim() === 'เพิ่ม').click(), true`); await sleep(700);
    eq('เพิ่มหลักสูตร → มีในฐานข้อมูล + ในการ์ด', [await prisma.course.count({ where: { batchId: nb.id, name: 'ช่างซ่อมคอม' } }), await b.evaluate(`${card(901)}.innerText.includes('ช่างซ่อมคอม')`)], [1, true]);
    await b.screenshot(shot('batch-new.png'));
    const trashes = await b.evaluate(`[...${card(901)}.querySelectorAll('button')].filter(x => x.querySelector('svg.lucide-trash2, svg.lucide-trash-2')).length`);
    await b.evaluate(`[...${card(901)}.querySelectorAll('button')].filter(x => x.querySelector('svg.lucide-trash2, svg.lucide-trash-2')).at(-1).click(), true`);
    await confirmYes();
    eq('ลบหลักสูตร → หาย', [trashes >= 2, await prisma.course.count({ where: { batchId: nb.id } })], [true, 0]);

    console.log('── แก้ / ลบรุ่น');
    await b.evaluate(`${card(901)}.querySelector('button').click(), true`);
    await b.waitFor(MODAL, 'ฟอร์มแก้ไขรุ่น'); await sleep(200);
    eq('ฟอร์มแก้ไขมีวันที่เดิมเป็น พ.ศ.', await b.evaluate(`${field('วันเริ่ม')}.value`), '01/08/2569');
    await b.setValue(field('ชื่อโครงการ'), 'ทดสอบรุ่น อีทูอี (แก้)');
    await b.clickText('บันทึก', MODAL);
    await b.waitFor(`!${MODAL}`, 'ฟอร์มปิด', 10000); await sleep(500);
    eq('แก้ชื่อโครงการแล้ว', (await prisma.trainingBatch.findUnique({ where: { id: nb.id } })).courseName, 'ทดสอบรุ่น อีทูอี (แก้)');
    await b.evaluate(`${card(901)}.querySelectorAll('button')[1].click(), true`);
    await confirmYes();
    eq('ลบรุ่น → หายจากฐานข้อมูล + หน้า', [await prisma.trainingBatch.count({ where: { id: nb.id } }), await b.evaluate(`!!${card(901)}`)], [0, false]);

    console.log('── คะแนนประเมิน');
    await prisma.personAssessment.deleteMany({ where: { personId: person.id } });
    await b.nav('/persons/' + person.id);
    await b.waitFor(`document.querySelector('[role=tablist]')`, 'หน้ารายละเอียด');
    await b.evaluate(`[...document.querySelectorAll('[role=tab]')].find(t => t.textContent.trim() === 'ประเมินทักษะ').click(), true`); await sleep(400);
    await b.setValue(`[...document.querySelectorAll('main select')].find(s => [...s.options].some(o => o.textContent.includes('รุ่นที่ 813')))`, String(batch813.id)); await sleep(300);
    const nums = `[...document.querySelectorAll('main input[type=number]')]`;
    for (const [i, v] of ['40', '150', '4', '4.5', '9', '5'].entries()) await b.setValue(`${nums}[${i}]`, v);
    await b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.includes('บันทึกผลการประเมิน')).click(), true`); await sleep(900);
    const a = await prisma.personAssessment.findFirst({ where: { personId: person.id, batchId: batch813.id } });
    eq('บันทึกคะแนน + เกินคะแนนเต็มถูกปรับ (150→100, 9→5)', [a?.preTestScore, a?.postTestScore, a?.softSkillComm, a?.softSkillTime, a?.softSkillMotiv, a?.softSkillDuty], [40, 100, 4, 4.5, 5, 5]);
    eq('โชว์ใน "ผลประเมินทุกรุ่น"', await b.evaluate(`document.querySelector('main').innerText.includes('ผลประเมินทุกรุ่น')`), true);
    await b.nav('/training');
    await b.waitFor(`document.querySelector('main tbody tr')`, 'หน้าการอบรม'); await sleep(400);
    eq('หน้าการอบรม (ตามรุ่น): คะแนน 40 → 100 +60', await b.evaluate(`[...document.querySelectorAll('main tbody tr')].find(r => r.innerText.includes(${JSON.stringify(person.fullName)}))?.innerText.replace(/\\s+/g, '').includes('40→100+60')`), true);
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-batch.png')); eq('สคริปต์รันจบ', false, true); }
  await prisma.trainingBatch.deleteMany({ where: { batchNumber: 901 } });
  await prisma.personAssessment.deleteMany({ where: { personId: person.id } });
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
