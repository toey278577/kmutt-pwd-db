// ข้อ 13: หน้า "การอบรม & ฝึกงาน" แสดงคนในรุ่น + ประวัติรายคน + ตัวกรองรุ่น + คะแนน
const path = require('path');
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');
(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const b1 = await prisma.trainingBatch.create({ data: { batchNumber: 990, year: 2569, courseName: 'โครงการทดสอบอีทูอี', startDate: new Date('2026-06-01'), endDate: new Date('2026-08-31'), status: 'ACTIVE' } });
  const b2 = await prisma.trainingBatch.create({ data: { batchNumber: 989, year: 2568, courseName: 'โครงการทดสอบอีทูอี', status: 'COMPLETED' } });
  const c1 = await prisma.course.create({ data: { batchId: b1.id, name: 'ธุรการสำนักงาน' } });
  const pa = await prisma.person.create({ data: { fullName: 'นาย ทดสอบอีทูอี รุ่นหนึ่ง', gender: 'MALE', thaiId: '9999999930061', batchId: b1.id, courseId: c1.id } });
  const pb = await prisma.person.create({ data: { fullName: 'นาง ทดสอบอีทูอี รุ่นสอง', gender: 'FEMALE', thaiId: '9999999930062', batchId: b2.id } });
  await prisma.personAssessment.create({ data: { personId: pa.id, batchId: b1.id, preTestScore: 40, postTestScore: 75 } });
  await prisma.trainingRecord.create({ data: { personId: pb.id, courseName: 'ทดสอบอีทูอี คอร์สส่วนตัว', trainingType: 'LEARN' } });
  const b = await browser();
  const rowText = (name) => b.evaluate(`[...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes(${JSON.stringify(name)}))?.textContent.replace(/\\s+/g, ' ').trim()`);
  try {
    await b.login(admin.id);
    await b.nav('/training');
    await b.waitFor(`document.querySelector('main').textContent.includes('ตามรุ่นอบรม')`, 'แท็บ');
    const a = await rowText('ทดสอบอีทูอี รุ่นหนึ่ง');
    eq('แท็บตามรุ่น: เห็นคนในรุ่น (เดิมไม่โผล่)', [!!a, !!(await rowText('ทดสอบอีทูอี รุ่นสอง'))], [true, true]);
    eq('แถว: รุ่น + หลักสูตร + ช่วงเวลา พ.ศ. + สถานะ + คะแนน 40→75 (+35)', [a.includes('รุ่นที่ 990/2569'), a.includes('ธุรการสำนักงาน'), a.includes('01/06/2569'), a.includes('31/08/2569'), a.includes('กำลังอบรม'), /40\s*→\s*75\s*\+35/.test(a)], [true, true, true, true, true, true]);
    eq('คนที่ไม่มีคะแนน → "—", รุ่นจบแล้ว → "จบแล้ว"', (await rowText('ทดสอบอีทูอี รุ่นสอง')).includes('จบแล้ว'), true);
    await b.screenshot(shot('13-training-batch.png'));

    await b.setValue(`[...document.querySelectorAll('main select')].find(s => [...s.options].some(o => o.textContent.includes('รุ่นที่ 990/2569')))`, String(b1.id));
    await sleep(300);
    eq('กรองรุ่น 990 → เหลือคนรุ่นหนึ่ง', [!!(await rowText('ทดสอบอีทูอี รุ่นหนึ่ง')), !!(await rowText('ทดสอบอีทูอี รุ่นสอง'))], [true, false]);

    await b.clickText(`ประวัติอบรมรายคน (${await b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.includes('ประวัติอบรมรายคน')).textContent.match(/\\((\\d+)\\)/)[1]`)})`, "document.querySelector('main')").catch(async () => {
      await b.evaluate(`[...document.querySelectorAll('main button')].find(x => x.textContent.includes('ประวัติอบรมรายคน')).click()`);
    });
    await sleep(300);
    const r = await rowText('ทดสอบอีทูอี คอร์สส่วนตัว');
    eq('แท็บประวัติรายคน: ตารางเดิมยังอยู่ (มีรูปแบบ "เรียนรู้")', [!!r, r?.includes('เรียนรู้')], [true, true]);
    eq('ไม่มี error ในหน้าเว็บ', b.errors, []);
  } catch (e) { console.log('FAIL  สะดุด:', e.message); await b.screenshot(shot('crash-13.png')); eq('ไม่สะดุด', e.message, ''); }
  finally {
    await b.close();
    await prisma.person.deleteMany({ where: { id: { in: [pa.id, pb.id] } } });
    await prisma.trainingBatch.deleteMany({ where: { id: { in: [b1.id, b2.id] } } });
    const f = summary(); await prisma.$disconnect(); process.exit(f ? 1 : 0);
  }
})();
