const path = require('path');
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');
(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true }, orderBy: { id: 'asc' } });
  const b = await browser();
  try {
    await b.login(admin.id);
    await b.nav('/users');
    await b.waitFor(`[...document.querySelectorAll('tbody tr')].length > 0`, 'ตารางผู้ใช้');
    // แถวของตัวเอง → ปุ่มดินสอ
    await b.evaluate(`[...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes(${JSON.stringify(admin.email)})).querySelector('button[title], button svg') && [...[...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes(${JSON.stringify(admin.email)})).querySelectorAll('button')].find(x => x.innerHTML.includes('pencil') || x.querySelector('.lucide-pencil')).click()`);
    await b.waitFor(`document.querySelector('dialog[open]')`, 'ฟอร์มแก้ไข');
    await sleep(300);
    eq('แก้บัญชีตัวเอง: ช่องบทบาทถูกล็อก', await b.evaluate(`[...document.querySelectorAll('dialog[open] select')].pop().disabled`), true);
    eq('มีคำอธิบายว่าทำไมล็อก', await b.evaluate(`document.querySelector('dialog[open]').textContent.includes('เปลี่ยนบทบาทของตัวเองไม่ได้')`), true);
    await b.setValue(`document.querySelector('dialog[open] input[type=password]')`, 'abc');
    await sleep(200);
    eq('พิมพ์รหัส 3 ตัว → ขึ้น "อีก 5 ตัว"', await b.evaluate(`document.querySelector('dialog[open]').textContent.includes('อีก 5 ตัว')`), true);
    await b.screenshot(shot('7-users-self.png'));
    await b.evaluate(`document.querySelector('dialog[open] form[class*=space-y] button[type=submit]').click()`);
    await sleep(400);
    eq('กดบันทึก → ไม่ส่ง ขึ้นข้อความในฟอร์ม', await b.evaluate(`document.querySelector('dialog[open]')?.textContent.includes('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')`), true);
    eq('รหัสผ่านในฐานข้อมูลไม่เปลี่ยน', (await prisma.user.findUnique({ where: { id: admin.id } })).password, admin.password);
    eq('ไม่มี error ในหน้าเว็บ', b.errors, []);
  } catch (e) { console.log('FAIL  สะดุด:', e.message); await b.screenshot(shot('crash-users.png')); eq('ไม่สะดุด', e.message, ''); }
  finally { await b.close(); const f = summary(); await prisma.$disconnect(); process.exit(f ? 1 : 0); }
})();
