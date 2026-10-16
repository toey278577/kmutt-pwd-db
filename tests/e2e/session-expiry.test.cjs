// หมดเวลาเข้าระบบ (ตั๋ว 8 ชม.) ต้องไม่ทำให้ข้อมูลที่กรอกค้างหาย (พี่เต้ย 16 ต.ค. 69)
// ก. เปิดหน้าใหม่ตอนตั๋วหมดแล้ว → ไปหน้าเข้าสู่ระบบเลย · ข. เหลือ <10 นาที → แถบเตือน กด "ใช้งานต่อ" ได้ตั๋วใหม่ 8 ชม.
// ค. หมดระหว่างกรอกฟอร์มแล้วกดบันทึก → กล่องใส่รหัสผ่านขึ้นเหนือฟอร์ม · รหัสผิดเตือน · รหัสถูก → บันทึกต่อให้เอง ฟอร์มไม่หาย
// ง. หลายคำขอโดนพร้อมกัน → กล่องเดียว แล้วโหลดครบ · จ. กด "ออกจากระบบ" ในกล่อง → ไปหน้าเข้าสู่ระบบ (มือถือไม่ล้นจอ)
const { prisma, browser, eq, summary, sleep, shot, SECRET, jwt } = require('../lib.cjs');
const ORG = 'บริษัท ทดสอบหมดเวลา จำกัด';
const SD = `document.querySelector('[data-session-dialog]')`;
const FORM = `document.querySelector('dialog[open]:not([data-session-dialog])')`;

(async () => {
  const staff = await prisma.user.findFirst({ where: { email: 'staff@test.local' } });
  const b = await browser();
  const expired = () => jwt.sign({ id: staff.id, exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
  const setSession = (token) => b.evaluate(`sessionStorage.setItem('token', ${JSON.stringify(token)});
    sessionStorage.setItem('user', ${JSON.stringify(JSON.stringify({ id: staff.id, name: staff.name, email: staff.email, role: staff.role }))}); true`);
  const setToken = (token) => b.evaluate(`sessionStorage.setItem('token', ${JSON.stringify(token)}); true`);
  const hoursLeft = async () => { const t = await b.evaluate(`sessionStorage.getItem('token')`); return t ? Math.round((jwt.decode(t).exp * 1000 - Date.now()) / 3600000) : null; };
  const relogin = async (pw) => { await b.setValue(`document.querySelector('#session-password')`, pw); await b.clickText('ใช้งานต่อ', SD); };
  try {
    console.log('── ก. เปิดหน้าใหม่ตอนตั๋วหมดแล้ว');
    await b.nav('/login'); await setSession(expired());
    await b.nav('/'); await sleep(1200);
    eq('หน้าเข้าสู่ระบบไม่มีช่องรหัสผ่านของกล่องซ่อนอยู่ (กันเบราว์เซอร์กรอกรหัสผิดช่อง)', await b.evaluate(`[document.querySelectorAll('input[type=password]').length, !!document.querySelector('#session-password')]`), [1, false]);
    eq('ไปหน้าเข้าสู่ระบบเลย ไม่ขึ้นกล่อง + ล้างตั๋วเก่า', await b.evaluate(`[location.pathname, ${SD}?.open || false, sessionStorage.getItem('token')]`), ['/login', false, null]);

    console.log('── ข. ใกล้หมดเวลา');
    await setSession(jwt.sign({ id: staff.id }, SECRET, { expiresIn: '9m' }));
    await b.nav('/'); await b.waitFor(`document.querySelector('[data-session-warn]')`, 'แถบเตือน');
    eq('เหลือ 9 นาที → แถบเตือนบอกเวลาที่เหลือ', await b.evaluate(`document.querySelector('[data-session-warn]').innerText.includes('อีก 9 นาทีจะหมดเวลาเข้าระบบ')`), true);
    await b.screenshot(shot('session-warn.png'));
    await b.clickText('ใช้งานต่อ', `document.querySelector('[data-session-warn]')`);
    await b.waitFor(`!document.querySelector('[data-session-warn]')`, 'แถบเตือนหาย');
    eq('กด "ใช้งานต่อ" → ได้ตั๋วใหม่ 8 ชม. แถบหายไป อยู่หน้าเดิม', [await hoursLeft(), await b.evaluate('location.pathname')], [8, '/']);

    console.log('── ค. หมดเวลาระหว่างกรอกฟอร์ม');
    await b.nav('/organizations');
    await b.waitFor(`[...document.querySelectorAll('button')].some(x => x.textContent.includes('เพิ่มองค์กร') && x.offsetParent)`, 'ปุ่มเพิ่มองค์กร');
    await b.evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.includes('เพิ่มองค์กร') && x.offsetParent).click(), true`);
    await b.waitFor(FORM, 'ฟอร์มองค์กร'); await sleep(200);
    const nameInput = `[...${FORM}.querySelectorAll('label')].find(l => l.textContent.trim().startsWith('ชื่อองค์กร')).parentElement.querySelector('input')`;
    await b.setValue(nameInput, ORG);
    await setToken(expired());
    await b.clickText('บันทึก', FORM);
    await b.waitFor(`${SD}.open`, 'กล่องใส่รหัสผ่าน');
    await sleep(300);
    eq('กดบันทึกตอนหมดเวลา → กล่องใส่รหัสผ่านขึ้นบนสุด (เหนือฟอร์ม) + ยังอยู่หน้าเดิม', await b.evaluate(`[!!document.elementFromPoint(innerWidth / 2, innerHeight / 2).closest('[data-session-dialog]'), location.pathname]`), [true, '/organizations']);
    eq('ฟอร์มที่กรอกไว้ยังอยู่ครบ + กล่องบอกชื่อบัญชี', await b.evaluate(`[${nameInput}.value, ${SD}.innerText.includes(${JSON.stringify(staff.email)})]`), [ORG, true]);
    await b.screenshot(shot('session-dialog.png'));
    await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(300);
    eq('กด Esc ปิดกล่องไม่ได้', await b.evaluate(`${SD}.open`), true);

    // จำลองคำตอบ "รหัสผิด" ไม่ล็อกอินผิดจริง — ล็อกอินผิดจริงกินโควตา 8 ครั้ง/15 นาที ที่ทั้งชุดทดสอบใช้ร่วมกัน
    // (เคยทำให้เทสต์หลังๆ ที่ล็อกอินจริงโดนบล็อก) · ฝั่งเซิร์ฟเวอร์ตอบรหัสผิดถูกต้อง มีเทสต์ใน api/ แล้ว
    b.on('Fetch.requestPaused', (p) => b.send(p.request.method === 'POST' ? 'Fetch.fulfillRequest' : 'Fetch.continueRequest', p.request.method === 'POST' ? {
      requestId: p.requestId, responseCode: 401,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }],
      body: Buffer.from(JSON.stringify({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })).toString('base64'),
    } : { requestId: p.requestId }));
    await b.send('Fetch.enable', { patterns: [{ urlPattern: '*auth/login*', requestStage: 'Request' }] });
    await relogin('wrongpass1');
    await b.waitFor(`${SD}.innerText.includes('อีเมลหรือรหัสผ่านไม่ถูกต้อง')`, 'ข้อความรหัสผิด');
    await b.send('Fetch.disable');
    eq('รหัสผิด → เตือนในกล่อง กล่องยังเปิด ยังไม่บันทึก', [await b.evaluate(`${SD}.open`), await prisma.organization.count({ where: { orgName: ORG } })], [true, 0]);

    await relogin('test1234');
    await b.waitFor(`!${SD}.open && !${FORM}`, 'กล่อง + ฟอร์มปิด', 15000);
    await b.waitFor(`document.body.innerText.includes('เพิ่มองค์กรสำเร็จ')`, 'แจ้งเพิ่มสำเร็จ');
    eq('รหัสถูก → บันทึกต่อให้เอง 1 รายการ (ไม่ซ้ำ) + ตั๋วใหม่ 8 ชม.', [await prisma.organization.count({ where: { orgName: ORG } }), await hoursLeft()], [1, 8]);

    console.log('── ง. หลายคำขอโดนพร้อมกัน');
    await setToken(expired());
    await b.clickText('Dashboard', `document.querySelector('aside')`);
    await b.waitFor(`${SD}.open`, 'กล่องใส่รหัสผ่าน (Dashboard)');
    await relogin('test1234');
    await b.waitFor(`!${SD}.open && document.querySelector('main').innerText.includes('คนพิการทั้งหมด')`, 'Dashboard โหลดครบ', 15000); await sleep(800);
    eq('Dashboard ยิงหลายคำขอพร้อมกัน → กล่องเดียว ใส่รหัสครั้งเดียว โหลดครบ ไม่มีกล่องพัง', await b.evaluate(`[location.pathname, document.querySelector('main').innerText.includes('โหลดข้อมูลไม่สำเร็จ')]`), ['/', false]);

    console.log('── จ. ออกจากระบบจากกล่อง (มือถือ)');
    await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await b.nav('/organizations'); await b.waitFor(`document.querySelector('main')`, 'หน้าองค์กร'); await sleep(600);
    await setToken(expired());
    await b.evaluate(`history.pushState({}, '', '/persons'); dispatchEvent(new PopStateEvent('popstate')); true`);   // เปลี่ยนหน้าในแอป (เปิดหน้าใหม่ = ไปหน้าเข้าสู่ระบบตามข้อ ก.)
    await b.waitFor(`${SD}.open`, 'กล่องใส่รหัสผ่าน (มือถือ)'); await sleep(300);
    eq('มือถือ: กล่องอยู่ในจอพอดี', await b.evaluate(`(() => { const r = ${SD}.querySelector('.modal-box').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })()`), true);
    await b.screenshot(shot('m-session-dialog.png'));
    await b.clickText('ออกจากระบบ', SD);
    await b.waitFor(`location.pathname === '/login'`, 'หน้าเข้าสู่ระบบ');
    eq('กดออกจากระบบในกล่อง → หน้าเข้าสู่ระบบ + ล้างตั๋ว', await b.evaluate(`[!!sessionStorage.getItem('token'), ${SD}?.open || false]`), [false, false]);
    await b.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
    eq('ไม่มี JS error', b.errors, []);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-session.png')); eq('สคริปต์รันจบ', false, true); }
  await prisma.organization.deleteMany({ where: { orgName: ORG } });
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
