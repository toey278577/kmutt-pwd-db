// หลัง deploy เวอร์ชันใหม่ แท็บที่เปิดค้างไว้ต้องไม่ติดของเก่าเงียบๆ (พี่เต้ยเจอ: เอาวงกลมออกแล้ว แต่หน้าจอยังมี)
// ก. แท็บเก่าเรียกไฟล์หน้าที่หายไป → โหลดใหม่ให้เอง 1 ครั้งแล้วเข้าได้ · ถ้าพังจริงไม่รีโหลดวนไม่จบ (ใช้หน้าเว็บโหมด dev)
// ข. build ของจริงมาเปิด (มีตัวเก็บไฟล์ในเครื่อง) → จำลอง deploy ใหม่ → ขึ้นแถบ "มีเวอร์ชันใหม่" → กดโหลดใหม่ได้
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { prisma, browser, eq, summary, sleep, shot, OUT, FE } = require('../lib.cjs');
const SITE = path.join(OUT, 'pwa-site');
const PORT = 5191;

function serve(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg' };
  const srv = http.createServer((req, res) => {
    let f = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(dir)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      if (/\.\w+$/.test(req.url.split('?')[0])) { res.writeHead(404); return res.end(); }   // ไฟล์หาย = 404 (ไม่ใช่หน้า SPA)
      f = path.join(dir, 'index.html');
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(PORT, () => r(srv)));
}

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  const b = await browser();
  let srv;
  try {
    console.log('── ก. ไฟล์หน้าหาย (แท็บเก่าหลัง deploy)');
    await b.login(admin.id);
    await b.nav('/');
    await b.waitFor(`document.querySelector('main')`, 'Dashboard'); await sleep(500);
    let calls = 0, mode = 'once';
    b.on('Fetch.requestPaused', (p) => {
      calls++;
      const fail = mode === 'always' || calls === 1;
      b.send(fail ? 'Fetch.failRequest' : 'Fetch.continueRequest', fail ? { requestId: p.requestId, errorReason: 'Failed' } : { requestId: p.requestId });
    });
    await b.send('Fetch.enable', { patterns: [{ urlPattern: '*src/pages/Help.jsx*', requestStage: 'Request' }] });
    await b.evaluate(`window.__marker = 1; true`);
    await b.clickText('คู่มือการใช้งาน');
    await b.waitFor(`location.pathname === '/help' && document.querySelector('main h2')`, 'หน้าคู่มือหลังโหลดใหม่', 15000); await sleep(400);
    eq('โหลดไฟล์หน้าไม่ได้ครั้งแรก → โหลดหน้าใหม่ให้เอง 1 ครั้ง แล้วเข้าหน้าได้', [await b.evaluate('window.__marker === undefined'), calls >= 2, await b.evaluate(`sessionStorage.getItem('page-reloaded')`)], [true, true, null]);

    mode = 'always'; calls = 0;
    await b.nav('/'); await b.waitFor(`document.querySelector('main')`, 'Dashboard'); await sleep(300);
    await b.clickText('คู่มือการใช้งาน');
    await b.waitFor(`document.body.innerText.includes('เกิดข้อผิดพลาด')`, 'กล่องเกิดข้อผิดพลาด', 15000);
    const c1 = calls; await sleep(2500);
    eq('พังจริง (โหลดใหม่แล้วยังไม่ได้) → ขึ้นกล่องแจ้ง ไม่รีโหลดวนไม่จบ', [c1 <= 3, calls === c1], [true, true]);
    await b.send('Fetch.disable');
    await b.evaluate(`sessionStorage.removeItem('page-reloaded'); true`);

    console.log('── ข. build ของจริง + จำลอง deploy ใหม่');
    fs.rmSync(SITE, { recursive: true, force: true });
    execFileSync(process.execPath, [path.join(FE, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', SITE, '--emptyOutDir', '--logLevel', 'error'], { cwd: FE, env: process.env, stdio: 'pipe' });
    eq('build ได้ + มีตัวเก็บไฟล์ (sw.js) + ไม่ฝังสคริปต์ลงทะเบียนแบบเก่า', [fs.existsSync(path.join(SITE, 'sw.js')), fs.readFileSync(path.join(SITE, 'index.html'), 'utf8').includes('registerSW.js')], [true, false]);
    srv = await serve(SITE);
    const URL0 = `http://localhost:${PORT}/login`;
    await b.send('Page.navigate', { url: URL0 }); await sleep(800);
    await b.waitFor(`navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(r => !!r?.active)`, 'ติดตั้งตัวเก็บไฟล์', 20000);
    await b.send('Page.navigate', { url: URL0 }); await sleep(1000);
    await b.waitFor(`!!navigator.serviceWorker.controller`, 'หน้าถูกคุมโดยตัวเก็บไฟล์', 15000);
    eq('เปิดครั้งแรก/ปกติ → ไม่มีแถบเวอร์ชันใหม่', await b.evaluate(`!!document.querySelector('[data-update-banner]')`), false);

    fs.appendFileSync(path.join(SITE, 'sw.js'), '\n// deploy ใหม่ (จำลอง)\n');
    await b.evaluate(`window.__marker = 2; window.__checkAppUpdate(); true`);
    await b.waitFor(`document.querySelector('[data-update-banner]')`, 'แถบมีเวอร์ชันใหม่', 20000); await sleep(300);
    eq('deploy ใหม่ → ขึ้นแถบ "มีเวอร์ชันใหม่" (หน้าไม่รีโหลดเอง ข้อมูลที่กรอกค้างไม่หาย)', [await b.evaluate(`document.querySelector('[data-update-banner]').innerText.includes('มีเวอร์ชันใหม่ของระบบ')`), await b.evaluate('window.__marker')], [true, 2]);
    await b.screenshot(shot('update-banner.png'));
    await b.evaluate(`[...document.querySelectorAll('[data-update-banner] button')].find(x => x.textContent.trim() === 'โหลดใหม่').click(), true`);
    await b.waitFor(`window.__marker === undefined && document.readyState === 'complete'`, 'โหลดหน้าใหม่', 15000); await sleep(800);
    eq('กด "โหลดใหม่" → หน้าโหลดใหม่ แถบหายไป', await b.evaluate(`!!document.querySelector('[data-update-banner]')`), false);
    await b.evaluate(`navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))).then(() => caches.keys()).then(ks => Promise.all(ks.map(k => caches.delete(k)))).then(() => true)`);
  } catch (e) { console.log('ERROR', e.message); await b.screenshot(shot('crash-app-update.png')); eq('สคริปต์รันจบ', false, true); }
  if (srv) srv.close();
  await b.close(); await prisma.$disconnect();
  process.exit(summary() ? 1 : 0);
})();
