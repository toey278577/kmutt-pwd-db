// รหัสลับเซ็นตั๋วเข้าระบบ (backend/src/utils/jwtSecret.js) — ไม่มีค่าที่เขียนในโค้ดให้ใช้อีกแล้ว
// รันแต่ละกรณีในโปรเซสใหม่ (ค่าถูกอ่านครั้งเดียวตอนโหลด) และควบคุม env เอง
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const UTIL = path.resolve(__dirname, '../../backend/src/utils/jwtSecret.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'jwt-secret-'));

let pass = 0, fail = 0;
const eq = (n, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `\n      ได้  ${JSON.stringify(g)}\n      ควร ${JSON.stringify(w)}`}`); };
const run = (env) => {
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('JWT_SECRET')));
  const out = execFileSync(process.execPath, ['-e', `const m = require(${JSON.stringify(UTIL)}); console.log(JSON.stringify({ s: m.JWT_SECRET, src: m.JWT_SECRET_SOURCE }))`],
    { env: { ...clean, ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(out.trim().split('\n').pop());
};

const strong = 'x'.repeat(40);
eq('ตั้ง JWT_SECRET ใน .env → ใช้ค่านั้น', run({ JWT_SECRET: strong, JWT_SECRET_FILE: path.join(TMP, 'a') }), { s: strong, src: 'env' });

const f1 = path.join(TMP, 'secret-b');
const first = run({ JWT_SECRET_FILE: f1 });
eq('ไม่ได้ตั้ง → สุ่มค่ายาว 64 ตัว เก็บลงไฟล์', [first.src, /^[0-9a-f]{64}$/.test(first.s), fs.readFileSync(f1, 'utf8').trim() === first.s], ['file', true, true]);
eq('เปิดใหม่อีกรอบ → ใช้ค่าเดิมจากไฟล์ (ผู้ใช้ไม่โดนเตะออก)', run({ JWT_SECRET_FILE: f1 }).s, first.s);
eq('ไม่ใช่ค่าที่เคยเขียนไว้ในโค้ด', first.s === 'kmutt_pwd_secret_2024', false);

const f2 = path.join(TMP, 'secret-c');
const leaked = run({ JWT_SECRET: 'kmutt_pwd_secret_2024', JWT_SECRET_FILE: f2 });
eq('.env ใส่ค่าเก่าที่หลุด → ไม่ใช้ เปลี่ยนเป็นค่าสุ่ม', [leaked.src, leaked.s !== 'kmutt_pwd_secret_2024', /^[0-9a-f]{64}$/.test(leaked.s)], ['file', true, true]);

const bad = run({ JWT_SECRET_FILE: path.join(TMP, 'no-such-dir', 'deep', 'secret') });
eq('เขียนไฟล์ไม่ได้ → ระบบยังเปิดได้ ใช้ค่าสุ่มชั่วคราว', [bad.src, /^[0-9a-f]{64}$/.test(bad.s)], ['memory', true]);

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\nสรุป: ผ่าน ${pass} / ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
