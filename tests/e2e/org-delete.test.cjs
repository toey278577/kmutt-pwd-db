// ข้อ 14: ลบสถานประกอบการต้องบอกจำนวนคนที่เชื่อมอยู่ + แก้ไของค์กรยังใช้ได้ (ไม่ส่งช่องแปลกกลับไป)
const path = require('path');
const { prisma, browser, eq, summary, sleep, API, SECRET, jwt, shot } = require('../lib.cjs');
(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const org = await prisma.organization.create({ data: { orgName: 'บริษัท ทดสอบอีทูอี ลบ จำกัด', phone: '021112222' } });
  const lone = await prisma.organization.create({ data: { orgName: 'ร้าน ทดสอบอีทูอี ไม่มีคน' } });
  const ps = await Promise.all([1, 2].map((n) => prisma.person.create({ data: { fullName: `นาย ทดสอบอีทูอี องค์กร${n}`, gender: 'MALE', thaiId: `999999993007${n}` } })));
  for (const p of ps) await prisma.personOrganization.create({ data: { personId: p.id, orgId: org.id, roleType: 'INTERNSHIP' } });
  const b = await browser();
  const row = (name) => `[...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes(${JSON.stringify(name)}))`;
  const confirmText = () => b.evaluate(`[...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && e.textContent.includes('กู้คืนไม่ได้')).map(e => e.textContent).join(' ')`);
  try {
    await b.login(admin.id);
    await b.nav('/organizations');
    await b.waitFor(row('ทดสอบอีทูอี ลบ'), 'แถวองค์กร');
    eq('แถวโชว์ "เชื่อมกับคนพิการ 2 คน"', await b.evaluate(`${row('ทดสอบอีทูอี ลบ')}.textContent.includes('เชื่อมกับคนพิการ 2 คน')`), true);
    eq('องค์กรที่ไม่มีคน ไม่โชว์ป้าย', await b.evaluate(`${row('ทดสอบอีทูอี ไม่มีคน')}.textContent.includes('เชื่อมกับคนพิการ')`), false);

    // แก้ไของค์กร → ต้องบันทึกได้ (ถ้าฟอร์มส่ง _count/id กลับไป หลังบ้านจะ error)
    await b.evaluate(`${row('ทดสอบอีทูอี ลบ')}.querySelectorAll('td:last-child button')[0].click()`);
    await b.waitFor(`document.querySelector('dialog[open]')`, 'ฟอร์มแก้ไของค์กร'); await sleep(200);
    await b.setValue(`[...document.querySelectorAll('dialog[open] label')].find(l => l.textContent.includes('เบอร์')).parentElement.querySelector('input')`, '029998888');
    await b.evaluate(`[...document.querySelectorAll('dialog[open] button')].find(x => /บันทึก/.test(x.textContent)).click()`);
    await b.waitFor(`!document.querySelector('dialog[open]')`, 'ฟอร์มปิด'); await sleep(500);
    eq('แก้เบอร์องค์กรสำเร็จ', (await prisma.organization.findUnique({ where: { id: org.id } })).phone, '029998888');

    await b.evaluate(`${row('ทดสอบอีทูอี ลบ')}.querySelectorAll('td:last-child button')[1].click()`); await sleep(300);
    const msg = await confirmText();
    eq('หน้าต่างยืนยันบอก "เชื่อมอยู่ 2 คน" + ข้อมูลคนพิการไม่หาย', [msg.includes('2 คน'), msg.includes('ข้อมูลคนพิการไม่หาย')], [true, true]);
    await b.screenshot(shot('14-org-delete.png'));
    await b.clickText('ยกเลิก'); await sleep(300);
    eq('กดยกเลิก → ไม่ลบ', [!!(await prisma.organization.findUnique({ where: { id: org.id } })), await prisma.personOrganization.count({ where: { orgId: org.id } })], [true, 2]);

    await b.evaluate(`${row('ทดสอบอีทูอี ลบ')}.querySelectorAll('td:last-child button')[1].click()`); await sleep(300);
    await b.clickText('ยืนยัน'); await sleep(800);
    eq('ยืนยันลบ → องค์กร + การเชื่อมโยงหาย, คนพิการยังอยู่ครบ', [!!(await prisma.organization.findUnique({ where: { id: org.id } })), await prisma.personOrganization.count({ where: { orgId: org.id } }), await prisma.person.count({ where: { id: { in: ps.map((p) => p.id) } } })], [false, 0, 2]);

    const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: admin.id }, SECRET) };
    const r = await fetch(`${API}/organizations/${lone.id}`, { method: 'PUT', headers: H, body: JSON.stringify({ orgName: 'ร้าน ทดสอบอีทูอี ไม่มีคน', id: 99999, persons: { create: [] }, _count: { persons: 5 } }) });
    eq('หลังบ้าน: แนบช่องแปลก (id/persons/_count) มา → ไม่ทะลุ ไม่ error', [r.status, (await r.json()).id], [200, lone.id]);
    const r2 = await fetch(`${API}/organizations`, { method: 'POST', headers: H, body: JSON.stringify({ orgName: '  ' }) });
    eq('สร้างองค์กรชื่อว่าง → 400 ไทย', [r2.status, (await r2.json()).error], [400, 'กรุณากรอกชื่อองค์กร']);
    eq('ไม่มี error ในหน้าเว็บ', b.errors, []);
  } catch (e) { console.log('FAIL  สะดุด:', e.message); await b.screenshot(shot('crash-14.png')); eq('ไม่สะดุด', e.message, ''); }
  finally {
    await b.close();
    await prisma.person.deleteMany({ where: { id: { in: ps.map((p) => p.id) } } });
    await prisma.organization.deleteMany({ where: { id: { in: [org.id, lone.id] } } });
    await prisma.auditLog.deleteMany({ where: { label: { contains: 'ทดสอบอีทูอี' } } });
    const f = summary(); await prisma.$disconnect(); process.exit(f ? 1 : 0);
  }
})();
