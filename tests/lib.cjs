// ตัวช่วยกลางของชุดทดสอบ — ทุกไฟล์ *.test.cjs ใช้ร่วมกัน
// รันผ่าน `npm test` (tests/run.cjs) เท่านั้น: ตัวรันเปิดหลังบ้าน/หน้าเว็บ/Chrome ของชุดทดสอบเอง
// และชี้ฐานข้อมูลไปที่ *_test — รันไฟล์ตรงๆ จะไม่ยอม กันเผลอไปเขียน/ลบข้อมูลในฐาน dev
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const B = path.join(ROOT, 'backend');
const FE = path.join(ROOT, 'frontend');
const OUT = path.join(__dirname, '.output');

const dbName = (() => { try { return new URL(process.env.DATABASE_URL).pathname.slice(1); } catch { return ''; } })();
if (process.env.KMUTT_TEST !== '1' || !dbName.endsWith('_test')) {
  console.error('ชุดทดสอบต้องรันผ่าน `npm test` (ในโฟลเดอร์ backend) — ไม่ยอมรันกับฐานข้อมูลที่ไม่ใช่ *_test');
  process.exit(2);
}

// เทสต์จบด้วย process.exit() ทันที ขณะที่การเชื่อมต่อเบื้องหลัง (fetch/ฐานข้อมูล/Chrome) ยังปิดไม่เสร็จ
// Node บน Windows แครชตอนออก (UV_HANDLE_CLOSING) ทั้งที่ทุกเคสผ่าน → รอให้ปิดเสร็จก่อนค่อยออกจริง
const exitNow = process.exit.bind(process);
process.exit = (code) => { process.exitCode = code; setTimeout(() => exitNow(code), 200); };

require(path.join(B, 'node_modules/dotenv')).config({ path: path.join(B, '.env'), quiet: true });   // ไม่ทับค่าที่ตัวรันตั้งไว้
const jwt = require(path.join(B, 'node_modules/jsonwebtoken'));
const prisma = require(path.join(B, 'src/prismaClient'));
const { PHOTO_DIR: UPLOAD_DIR } = require(path.join(B, 'src/utils/uploadDir'));
const APP = process.env.TEST_APP_URL;
const API = process.env.TEST_API_URL;
const CDP_PORT = process.env.TEST_CDP_PORT;
const { JWT_SECRET: SECRET } = require(path.join(B, 'src/utils/jwtSecret'));   // ค่าเดียวกับหลังบ้านทดสอบ
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ภาพหน้าจอเก็บไว้ดูด้วยตาที่ tests/.output/shots
const SHOTS = path.join(OUT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const shot = (name) => path.join(SHOTS, name);

// รูปเล็กๆ ไว้ทดสอบอัปโหลด (PNG 1x1)
const fixturePng = () => {
  const f = path.join(OUT, 'fixture-photo.png');
  if (!fs.existsSync(f)) fs.writeFileSync(f, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  return f;
};

let pass = 0, fail = 0;
const eq = (n, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `\n      ได้  ${JSON.stringify(g)}\n      ควร ${JSON.stringify(w)}`}`); };
const summary = () => { console.log(`\nสรุป: ผ่าน ${pass} / ไม่ผ่าน ${fail}`); return fail; };

async function browser(port = CDP_PORT) {
  let targets;
  for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });

  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error('JS: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
    return r.result?.result?.value;
  };
  const waitFor = async (expr, label, ms = 10000) => {
    for (let t = 0; t < ms; t += 100) { if (await evaluate(`!!(${expr})`)) return true; await sleep(100); }
    throw new Error('รอไม่ขึ้น: ' + label);
  };
  const nav = async (url) => { await send('Page.navigate', { url: APP + url }); await sleep(400); };
  const login = async (userId) => {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    await nav('/login');
    await evaluate(`sessionStorage.setItem('token', ${JSON.stringify(jwt.sign({ id: u.id }, SECRET, { expiresIn: '1h' }))});
      sessionStorage.setItem('user', ${JSON.stringify(JSON.stringify({ id: u.id, name: u.name, email: u.email, role: u.role }))}); true`);
  };
  // คลิกปุ่ม/ลิงก์ที่ข้อความตรง (ในขอบเขต scope ถ้าระบุ)
  const clickText = (text, scope = 'document') => evaluate(`(() => {
    const el = [...${scope}.querySelectorAll('button,a,[role=button],option')].find(e => e.textContent.trim() === ${JSON.stringify(text)} && e.offsetParent !== null);
    if (!el) throw new Error('ไม่เจอปุ่ม: ' + ${JSON.stringify(text)}); el.click(); return true; })()`);
  // ใส่ค่าใน input/select แบบที่ React รับรู้
  const setValue = (selectorExpr, value) => evaluate(`(() => {
    const el = ${selectorExpr}; if (!el) throw new Error('ไม่เจอช่อง');
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); return true; })()`);
  const toastText = () => evaluate(`[...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && /สำเร็จ|ไม่สำเร็จ|ไม่ครบ|ไม่ได้/.test(e.textContent)).map(e => e.textContent.trim()).join(' | ')`);
  const screenshot = async (file) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(r.result.data, 'base64')); };
  // รอปิดให้เสร็จก่อน exit — ปิดแล้ว exit ทันที Node บน Windows แครช (UV_HANDLE_CLOSING) ทั้งที่เทสต์ผ่าน
  const close = () => new Promise((r) => { ws.onclose = () => r(); ws.close(); setTimeout(r, 1500); });
  return { send, evaluate, waitFor, nav, login, clickText, setValue, toastText, screenshot, errors, close };
}

module.exports = { prisma, browser, eq, summary, sleep, API, APP, SECRET, jwt, B, FE, ROOT, OUT, shot, fixturePng, UPLOAD_DIR };
