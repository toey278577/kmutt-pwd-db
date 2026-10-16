// ชุดทดสอบอัตโนมัติ — รันจากโฟลเดอร์ backend:
//   npm test                     ทุกชุด (unit + api + e2e)
//   npm test -- unit             เฉพาะกลุ่ม (unit / api / e2e)
//   npm test -- live-search api  เลือกตามชื่อไฟล์บางส่วน (หลายคำได้)
//
// ทำอะไรให้เอง: เตรียมฐานข้อมูล <ชื่อฐาน dev>_test (สร้างถ้ายังไม่มี → migrate → ล้างข้อมูล → ใส่ข้อมูลตั้งต้น)
// → เปิดหลังบ้าน :5055 + หน้าเว็บ :5180 + Chrome headless :9341 ของชุดทดสอบเอง → รันทีละไฟล์ → ปิดทั้งหมด
// ไม่แตะฐานข้อมูล dev / รูปในเครื่อง / ระบบจริง: ชื่อฐานต้องลงท้าย _test และอยู่ในเครื่องนี้เท่านั้น
// (พี่เต้ยอนุญาตให้ล้างฐาน *_test ทุกครั้งที่รัน — 15 ต.ค. 69)
// ผลละเอียด + ภาพหน้าจอ: tests/.output/ (last-run.log, shots/, backend.log, web.log)
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const T = __dirname;
const ROOT = path.resolve(T, '..');
const B = path.join(ROOT, 'backend');
const FE = path.join(ROOT, 'frontend');
const OUT = path.join(T, '.output');
const PORT = { api: +process.env.TEST_API_PORT || 5055, app: +process.env.TEST_APP_PORT || 5180, cdp: +process.env.TEST_CDP_PORT || 9341 };
const API_URL = `http://localhost:${PORT.api}/api`;
const APP_URL = `http://localhost:${PORT.app}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (msg) => { console.error('\n✘ ' + msg); teardown(); process.exit(2); };

// ── เลือกชุดที่จะรัน
const args = process.argv.slice(2);
const all = ['unit', 'api', 'e2e'].flatMap((g) => fs.readdirSync(path.join(T, g))
  .filter((f) => /\.test\.(c|m)?js$/.test(f)).sort()
  .map((f) => ({ group: g, file: path.join(T, g, f), name: `${g}/${f.replace(/\.test\.\w+$/, '')}` })));
const picked = args.length ? all.filter((t) => args.some((a) => t.group === a || t.name.includes(a))) : all;
if (!picked.length) { console.error('ไม่เจอชุดทดสอบที่ตรงกับ: ' + args.join(' ')); process.exit(2); }
const needDb = picked.some((t) => t.group !== 'unit');
const needWeb = picked.some((t) => t.group === 'e2e');

// ── ฐานข้อมูลทดสอบ (ไม่ใช่ฐาน dev)
require(path.join(B, 'node_modules/dotenv')).config({ path: path.join(B, '.env'), quiet: true });
const TEST_DB = (() => {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const u = new URL(process.env.DATABASE_URL);
  if (!u.pathname.endsWith('_test')) u.pathname += '_test';
  return u.toString();
})();
const dbUrl = new URL(TEST_DB);
const dbName = decodeURIComponent(dbUrl.pathname.slice(1));
const plain = (u, name) => { const x = new URL(u); x.pathname = '/' + name; x.search = ''; return x.toString(); };   // pg ไม่รู้จัก ?schema=

const ENV = {
  ...process.env,
  KMUTT_TEST: '1',
  API_RATE_MAX: '100000',   // ทั้งชุดยิงเกิน 2000 คำขอ/15 นาที (เพดานของระบบจริง) — เทสต์ท้ายๆ เคยโดนบล็อกจนโหลดหน้าไม่ขึ้น
  DATABASE_URL: TEST_DB, DB_URL: TEST_DB,
  UPLOAD_ROOT: path.join(OUT, 'uploads'), BACKUP_DIR: path.join(OUT, 'backups'),
  PORT: String(PORT.api), CORS_ORIGIN: APP_URL,
  VITE_API_URL: API_URL, API_PROXY_TARGET: `http://localhost:${PORT.api}`,
  TEST_API_URL: API_URL, TEST_APP_URL: APP_URL, TEST_CDP_PORT: String(PORT.cdp),
};

async function prepareDb() {
  if (!/_test$/.test(dbName)) fail(`ชื่อฐานข้อมูลทดสอบต้องลงท้าย _test (ได้ "${dbName}") — ไม่ยอมล้างฐานอื่น`);
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(dbUrl.hostname)) fail(`ฐานข้อมูลทดสอบต้องอยู่ในเครื่องนี้ (ได้ ${dbUrl.hostname})`);
  const { Client } = require(path.join(B, 'node_modules/pg'));

  const admin = new Client({ connectionString: plain(TEST_DB, 'postgres') });
  await admin.connect().catch((e) => fail('ต่อ PostgreSQL ไม่ได้: ' + e.message));
  if (!(await admin.query('select 1 from pg_database where datname = $1', [dbName])).rowCount) {
    await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '')}"`);
    console.log(`  สร้างฐานข้อมูล ${dbName}`);
  }
  await admin.end();

  const mig = spawnSync(process.execPath, [path.join(B, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: B, env: ENV, encoding: 'utf8' });
  if (mig.status !== 0) fail('migrate ฐานข้อมูลทดสอบไม่สำเร็จ\n' + mig.stdout + mig.stderr);

  // ล้างข้อมูลทุกตาราง (เฉพาะฐาน *_test — ตรวจชื่อแล้วข้างบน) ให้ทุกรอบเริ่มจากจุดเดียวกัน
  const db = new Client({ connectionString: plain(TEST_DB, dbName) });
  await db.connect();
  const { rows } = await db.query("select tablename from pg_tables where schemaname = 'public' and tablename <> '_prisma_migrations'");
  if (rows.length) await db.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  await db.end();

  fs.rmSync(ENV.UPLOAD_ROOT, { recursive: true, force: true });
  fs.mkdirSync(path.join(ENV.UPLOAD_ROOT, 'photos'), { recursive: true });
  for (const script of [path.join(B, 'prisma/seed.js'), path.join(T, 'fixtures/seed.cjs')]) {
    const r = spawnSync(process.execPath, [script], { cwd: B, env: ENV, encoding: 'utf8' });
    if (r.status !== 0 || /Error/.test(r.stderr)) fail(`ใส่ข้อมูลตั้งต้นไม่สำเร็จ (${path.basename(script)})\n${r.stdout}${r.stderr}`);
  }
}

// ── โปรแกรมที่ชุดทดสอบเปิดเอง (ปิดให้ตอนจบเสมอ)
const procs = [];
let stopping = false;
function start(name, cmd, argv, cwd) {
  const log = fs.openSync(path.join(OUT, `${name}.log`), 'w');
  const p = spawn(cmd, argv, { cwd, env: ENV, stdio: ['ignore', log, log], windowsHide: true });
  p.label = name;
  p.on('exit', (code) => { p.dead = !stopping && `${name} ปิดตัวเองกลางทาง (code ${code}) — ดู tests/.output/${name}.log`; });
  procs.push(p);
  return p;
}
function teardown() {
  stopping = true;
  for (const p of procs) {
    if (p.exitCode !== null) continue;
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' });
    else p.kill('SIGTERM');
  }
}
process.on('SIGINT', () => { teardown(); process.exit(130); });

const busy = async (url) => { try { await fetch(url, { signal: AbortSignal.timeout(1500) }); return true; } catch { return false; } };
async function waitUp(url, label, proc, ms = 90000) {
  for (let t = 0; t < ms; t += 300) {
    if (proc.dead) fail(proc.dead);
    try { const r = await fetch(url, { signal: AbortSignal.timeout(3000) }); if (r.ok) return; } catch { /* ยังไม่ขึ้น */ }
    await sleep(300);
  }
  fail(`${label} ไม่ขึ้นภายใน ${ms / 1000} วินาที — ดู tests/.output/${proc.label}.log`);
}
function findChrome() {
  const local = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe') : null;
  return [process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', local,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].find((p) => p && fs.existsSync(p));
}

async function startServers() {
  for (const [label, url] of [['หลังบ้าน', `${API_URL}/ping`], ['หน้าเว็บ', APP_URL], ['Chrome', `http://127.0.0.1:${PORT.cdp}/json/version`]]) {
    if ((label === 'หลังบ้าน' || needWeb) && await busy(url)) fail(`พอร์ตของ${label}ทดสอบมีโปรแกรมอื่นใช้อยู่ (${url}) — ปิดก่อน หรือตั้งพอร์ตใหม่ด้วย TEST_API_PORT / TEST_APP_PORT / TEST_CDP_PORT`);
  }
  const api = start('backend', process.execPath, [path.join(B, 'src/index.js')], B);
  await waitUp(`${API_URL}/health`, 'หลังบ้านทดสอบ', api);
  if (!needWeb) return;
  const chrome = findChrome();
  if (!chrome) fail('ไม่เจอ Chrome/Edge สำหรับชุด e2e — ตั้ง CHROME_PATH ให้ชี้ไปที่ chrome.exe');
  const web = start('web', process.execPath, [path.join(FE, 'node_modules/vite/bin/vite.js'), '--port', String(PORT.app), '--strictPort'], FE);
  const cdp = start('chrome', chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${PORT.cdp}`, `--user-data-dir=${path.join(OUT, 'chrome-profile')}`, 'about:blank'], OUT);
  await waitUp(APP_URL, 'หน้าเว็บทดสอบ', web);
  await waitUp(`http://127.0.0.1:${PORT.cdp}/json/version`, 'Chrome', cdp);
  // แปลงไฟล์หน้าเว็บรอไว้ก่อน — เทสต์แรกจะได้ไม่รอ vite แปลงจนหมดเวลา
  const pages = fs.readdirSync(path.join(FE, 'src/pages')).filter((f) => f.endsWith('.jsx'));
  await Promise.all(['/', '/src/main.jsx', ...pages.map((f) => `/src/pages/${f}`)].map((u) => fetch(APP_URL + u).catch(() => {})));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.rmSync(path.join(OUT, 'shots'), { recursive: true, force: true });
  const t0 = Date.now();
  console.log(`ชุดทดสอบ ${picked.length} ไฟล์${needDb ? ` · ฐานข้อมูล ${dbName}` : ''}`);
  if (needDb) {
    console.log('  เตรียมฐานข้อมูลทดสอบ...');
    await prepareDb();
    console.log(`  เปิดหลังบ้าน${needWeb ? ' + หน้าเว็บ + Chrome' : ''} ของชุดทดสอบ...`);
    await startServers();
  }
  console.log('');

  let log = '', totalPass = 0, totalFail = 0;
  const bad = [];
  for (const t of picked) {
    const s = Date.now();
    const r = spawnSync(process.execPath, [t.file], { cwd: B, env: ENV, encoding: 'utf8', timeout: 5 * 60 * 1000 });
    const out = `${r.stdout || ''}${r.stderr || ''}`.replace(/^.*injected env.*\n/gm, '');
    log += `\n===== ${t.name}\n${out}`;
    const m = [...out.matchAll(/สรุป: ผ่าน (\d+) \/ ไม่ผ่าน (\d+)/g)].pop();
    const p = m ? +m[1] : 0, f = m ? +m[2] : 0;
    const ok = r.status === 0 && m && f === 0;
    totalPass += p; totalFail += ok ? 0 : Math.max(f, 1);
    const secs = ((Date.now() - s) / 1000).toFixed(1);
    console.log(`  ${ok ? '✔' : '✘'} ${t.name.padEnd(34)} ${ok ? `${p} เคส` : `ผ่าน ${p} / ไม่ผ่าน ${f}${m ? '' : ' (ไม่จบ)'}`}  ${secs} วิ`);
    if (!ok) {
      bad.push(t.name);
      const lines = out.split('\n');
      const shown = lines.flatMap((l, i) => (/^(FAIL|ERROR)|Error:/.test(l) ? lines.slice(i, i + 3) : [])).slice(0, 15);
      for (const l of (shown.length ? shown : lines.slice(-8))) console.log('      ' + l);
    }
    for (const p2 of procs) if (p2.dead) { console.log('\n✘ ' + p2.dead); bad.push(p2.label); break; }
    if (procs.some((x) => x.dead)) break;
  }
  fs.writeFileSync(path.join(OUT, 'last-run.log'), log);
  teardown();
  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`\n${bad.length ? '✘' : '✔'} ผ่าน ${totalPass} เคส${bad.length ? ` · ไม่ผ่าน ${bad.length} ชุด: ${bad.join(', ')}` : ' — ผ่านหมดทุกชุด'}  (${mins} นาที)`);
  console.log('  ผลละเอียด: tests/.output/last-run.log · ภาพหน้าจอ: tests/.output/shots/');
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); teardown(); process.exit(1); });
