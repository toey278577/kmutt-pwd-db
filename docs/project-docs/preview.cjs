// ดูหน้าตา PDF ที่สร้างแล้ว (เครื่องนี้ไม่มีตัวแปลง PDF เป็นภาพ) — ใช้ pdf.js ใน Chrome วาดหน้า PDF แล้วถ่ายเป็น PNG
//   node docs/project-docs/preview.cjs <ไฟล์.pdf> <หน้าแรก> <หน้าสุดท้าย> [ต่อภาพ=3] [ปลายทาง]
// ได้ภาพ preview-<n>.png ทีละ 3 หน้าเรียงกัน (ไว้ตรวจด้วยตา)
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const [pdfPath, from = '1', to = '3', per = '3', outArg = path.join(__dirname, 'out', 'preview')] = process.argv.slice(2);
const outDir = path.resolve(outArg);
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9385;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const pdfB64 = fs.readFileSync(pdfPath).toString('base64');
  const html = path.join(outDir, 'viewer.html');
  fs.writeFileSync(html, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888"><div id="row" style="display:flex;gap:12px;padding:12px"></div>
<script type="module">
  const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
  const bin = Uint8Array.from(atob(window.PDF64), (c) => c.charCodeAt(0));
  window.doc = await pdfjs.getDocument({ data: bin, cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/cmaps/', cMapPacked: true }).promise;
  window.show = async (pages, scale) => {
    const row = document.getElementById('row'); row.innerHTML = '';
    for (const n of pages) {
      if (n > window.doc.numPages) continue;
      const page = await window.doc.getPage(n);
      const vp = page.getViewport({ scale });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; c.style.background = '#fff';
      row.appendChild(c);
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    }
    return [row.scrollWidth + 24, row.scrollHeight + 24];
  };
  window.ready = true;
</script>`);
  const profile = path.join(require('os').tmpdir(), 'kmutt-doc-preview-profile');
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', '--allow-file-access-from-files', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); break; } catch { await sleep(250); } }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result?.result?.value; };
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.PDF64 = ${JSON.stringify(pdfB64)};` });
  await send('Page.navigate', { url: 'file:///' + html.replace(/\\/g, '/') });
  for (let t = 0; t < 120 && !(await ev('window.ready === true').catch(() => false)); t++) await sleep(250);
  const total = await ev('window.doc.numPages');
  const last = Math.min(Number(to), total);
  const step = Number(per);
  const scale = step >= 3 ? 1.0 : 1.35;
  for (let p = Number(from); p <= last; p += step) {
    const pages = Array.from({ length: step }, (_, i) => p + i).filter((n) => n <= last);
    const [w, h] = await ev(`window.show(${JSON.stringify(pages)}, ${scale})`);
    await send('Emulation.setDeviceMetricsOverride', { width: Math.ceil(w), height: Math.ceil(h), deviceScaleFactor: 1, mobile: false });
    await sleep(200);
    const r = await send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(outDir, `preview-${String(p).padStart(3, '0')}.png`);
    fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
    console.log(`${file}  (หน้า ${pages.join(',')} / ${total})`);
  }
  ws.close(); chrome.kill();
  process.exit(0);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
