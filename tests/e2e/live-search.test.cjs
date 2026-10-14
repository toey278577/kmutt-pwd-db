// UX ข้อ 6: ค้นหาทันทีที่พิมพ์ + ชื่อเล่น / เบอร์ (มีขีด) + ผลเก่าไม่ทับผลใหม่ + ออกจากหน้าก่อนค้นไม่โดนดึงกลับ
const path = require('path');
const { prisma, browser, eq, summary, sleep, shot } = require('../lib.cjs');
(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const demo = await prisma.person.findMany({ where: { thaiId: { startsWith: '88888888' } }, orderBy: { id: 'asc' } });
  const [somchai, malee] = demo;
  const b = await browser();
  const INPUT = `document.querySelector('main input[aria-label="ค้นหาคนพิการ"]')`;
  const names = () => b.evaluate(`[...document.querySelectorAll('tbody tr td:nth-child(2) p:first-child')].map(p => p.textContent)`);
  const type = (v) => b.setValue(INPUT, v);
  try {
    await b.login(admin.id);
    await b.nav('/persons');
    await b.waitFor(`document.querySelectorAll('tbody tr').length > 3`, 'ตาราง');
    const total = (await names()).length;
    eq('ไม่มีปุ่ม "ค้นหา" แล้ว', await b.evaluate(`[...document.querySelectorAll('main button')].some(x => x.textContent.trim() === 'ค้นหา')`), false);
    eq('ช่องค้นหาบอกว่าค้นอะไรได้บ้าง', await b.evaluate(`${INPUT}.placeholder`), 'ค้นหาชื่อ ชื่อเล่น เลขบัตร หรือเบอร์โทร');

    await type(malee.nickname); await sleep(150);
    eq('ยังไม่ครบเวลา ยังไม่ค้น (ไม่ยิงทุกตัวอักษร)', (await names()).length, total);
    await sleep(700);
    eq('หยุดพิมพ์แล้วค้นเอง: ชื่อเล่น "' + malee.nickname + '"', (await names()).some((n) => n.startsWith(malee.fullName)), true);
    eq('หัวหน้าบอก "ค้นพบ" ตอนค้นอยู่', (await b.evaluate('document.querySelector("main h1").nextElementSibling.textContent.trim()')).startsWith('ค้นพบ'), true);
    eq('จำคำค้นลง URL', await b.evaluate(`new URLSearchParams(location.search).get('q')`), malee.nickname);

    const dashed = somchai.mobile.replace(/^(\d{3})(\d{3})(\d+)$/, '$1-$2-$3');
    await type(dashed); await sleep(900);
    eq('ค้นเบอร์แบบมีขีด ' + dashed, (await names()).some((n) => n.startsWith(somchai.fullName)), true);

    await b.clickText('ล้าง', 'document.querySelector("main")'); await sleep(800);
    eq('กด "ล้าง" → กลับมาครบ + URL ไม่มี q', [(await names()).length, await b.evaluate(`location.search.includes('q=')`)], [total, false]);

    eq('ล้างแล้วกลับเป็น "รายการในระบบ"', (await b.evaluate('document.querySelector("main h1").nextElementSibling.textContent.trim()')).endsWith('รายการในระบบ'), true);
    console.log('── เน็ตช้า: ผลของคำค้นเก่ากลับมาทีหลัง ต้องไม่ทับผลใหม่');
    await b.evaluate(`(() => {
      const open = XMLHttpRequest.prototype.open, send = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (m, u, ...r) { this._u = u; return open.call(this, m, u, ...r); };
      XMLHttpRequest.prototype.send = function (...a) {
        if (/search=%E0%B8%99(&|$)/.test(this._u || '')) { setTimeout(() => send.apply(this, a), 1800); return; }   // "น" ช้า 1.8 วิ
        return send.apply(this, a);
      };
      return true; })()`);
    await type('น'); await sleep(500);          // ยิง "น" (ช้า)
    await type(somchai.fullName.split(' ')[1]); await sleep(600);   // ยิง "สมชาย" (เร็ว)
    const fast = await names();
    await sleep(2200);                          // รอให้ "น" กลับมา
    eq('ผลสุดท้ายยังเป็นของคำค้นล่าสุด', await names(), fast);
    eq('และเป็นสมชายจริง', fast.every((n) => n.includes(somchai.fullName.split(' ')[1])) && fast.length > 0, true);

    console.log('── พิมพ์แล้วกดไปหน้าอื่นทันที');
    await b.nav('/persons'); await b.waitFor(`document.querySelectorAll('tbody tr').length > 3`, 'ตาราง');
    await type('ทดสอบออกจากหน้า');
    await b.evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'การอบรม & ฝึกงาน').click(), true`);
    await sleep(900);
    eq('ยังอยู่หน้าการอบรม ไม่โดนดึงกลับ / URL ไม่โดนเขียน', await b.evaluate(`location.pathname + location.search`), '/training');

    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await b.nav('/persons'); await b.waitFor(INPUT, 'ช่องค้นหา'); await sleep(400);
    await type(malee.nickname); await sleep(900);
    await b.screenshot(shot('ux6-m-search.png'));
    eq('มือถือ: พิมพ์แล้วขึ้นผล', await b.evaluate(`document.querySelector('main').textContent.includes(${JSON.stringify(malee.fullName)})`), true);
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); eq('สคริปต์รันจบ', false, true); }
  await b.close(); process.exit(summary() ? 1 : 0);
})();
