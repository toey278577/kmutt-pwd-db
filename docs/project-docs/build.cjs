// สร้างเอกสารประกอบการพัฒนาระบบเป็น PDF (ฉบับรวม + แยกตามบทบาท BA / SA / Design / Test / Dev-Ops)
//   node docs/project-docs/build.cjs            → docs/project-docs/pdf/*.pdf
//   node docs/project-docs/build.cjs 1-BA       → เฉพาะไฟล์ที่ชื่อขึ้นต้นด้วย 1-BA
// ข้อมูลที่ดึงจากของจริงในโปรเจกต์: โครงสร้างฐานข้อมูล (backend/prisma/schema.prisma) · ผลทดสอบ (data/test-run.txt
// = สำเนา tests/.output/last-run.log หลังรัน npm test ครบชุด) · เวอร์ชัน (frontend/package.json) · ประวัติ git
// ภาพหน้าจอ: img/*.png (node docs/project-docs/shots.cjs — ถ่ายจากระบบในชุดทดสอบด้วยข้อมูลสมมติ)
// แผนภาพวาดด้วย mermaid ใน Chrome (ต้องต่อเน็ต — โหลดฟอนต์ Google + mermaid จาก jsdelivr)
// ต้นแบบมาจาก room-booking/docs/project-docs (ระบบจองห้องประชุม) ปรับให้เข้ากับระบบนี้
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const DIR = __dirname;
const ROOT = path.resolve(DIR, '..', '..');
const OUT_HTML = path.join(DIR, 'out');
const OUT_PDF = path.join(DIR, 'pdf');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9384;
const SYSTEM = 'ระบบฐานข้อมูลคนพิการ มจธ.';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fileUrl = (p) => 'file:///' + p.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace(/^file:\/\/\/([A-Za-z])%3A/, 'file:///$1:');

// ── ข้อมูลจากโปรเจกต์ ─────────────────────────────────────────────

// โครงสร้างตารางจาก schema.prisma → [{ model, table, comment, fields: [{ name, column, type, dbType, optional, list, attrs, comment }], relations }]
function parseSchema() {
  const src = fs.readFileSync(path.join(ROOT, 'backend', 'prisma', 'schema.prisma'), 'utf8');
  const enums = {};
  for (const m of src.matchAll(/enum (\w+) \{([^}]*)\}/g)) enums[m[1]] = m[2].trim().split(/\s+/);
  const models = [];
  const modelNames = [...src.matchAll(/model (\w+) \{/g)].map((m) => m[1]);
  // อ่านทีละบรรทัด (คอมเมนต์ในโมเดลอาจมีวงเล็บปีกกา — ใช้ regex [^}] ไม่ได้)
  const blocks = [];
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const mm = lines[i].match(/^model (\w+) \{/);
    if (!mm) continue;
    let h = i - 1; const head = [];
    while (h >= 0 && lines[h].trim().startsWith('//')) head.unshift(lines[h--]);
    let j = i + 1; const body = [];
    while (j < lines.length && lines[j].trim() !== '}') body.push(lines[j++]);
    blocks.push([head.join('\n'), mm[1], body.join('\n')]);
    i = j;
  }
  for (const [head, name, body] of blocks) {
    const fields = [];
    const relations = [];
    const uniques = [];
    let comment = [];
    let table = name;
    for (const raw of body.split('\n')) {
      const line = raw.trim();
      if (!line) { comment = []; continue; }
      if (line.startsWith('//')) { comment.push(line.replace(/^\/\/\s?/, '')); continue; }
      if (line.startsWith('@@map')) { table = line.match(/"(.+)"/)[1]; continue; }
      if (line.startsWith('@@unique')) { uniques.push(line.match(/\[(.+)\]/)[1].split(',').map((s) => s.trim())); continue; }
      if (line.startsWith('@@')) continue;
      const fm = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/);
      if (!fm) continue;
      const [, fname, ftype, list, opt, attrs] = fm;
      if (modelNames.includes(ftype)) {
        const rel = attrs.match(/fields:\s*\[(\w+)\],\s*references:\s*\[(\w+)\]/);
        const del = attrs.match(/onDelete:\s*(\w+)/);
        relations.push({ field: fname, target: ftype, list: !!list, fk: rel?.[1], onDelete: del?.[1] });
        comment = [];
        continue;
      }
      const map = attrs.match(/@map\("(.+?)"\)/);
      fields.push({ name: fname, column: map ? map[1] : fname, type: ftype, list: !!list, optional: !!opt, attrs, isEnum: !!enums[ftype], comment: comment.join(' ') });
      comment = [];
    }
    for (const r of relations) if (r.fk) { const f = fields.find((x) => x.name === r.fk); if (f) f.fk = { target: r.target, onDelete: r.onDelete }; }
    models.push({ model: name, table, comment: head.split('\n').map((s) => s.replace(/^\/\/\s?/, '')).filter(Boolean).join(' '), fields, relations, uniques });
  }
  const tableOf = (model) => models.find((x) => x.model === model)?.table || model;
  const dbType = (f) => {
    const a = f.attrs;
    let t;
    if (f.isEnum) t = `ENUM ${f.type}`;
    else if (f.type === 'Int') t = /autoincrement/.test(a) ? 'SERIAL' : 'INTEGER';
    else if (f.type === 'Boolean') t = 'BOOLEAN';
    else if (f.type === 'Float') t = 'DOUBLE PRECISION';
    else if (f.type === 'Decimal') { const d = a.match(/@db\.Decimal\((\d+),\s*(\d+)\)/); t = d ? `DECIMAL(${d[1]},${d[2]})` : 'DECIMAL'; }
    else if (f.type === 'DateTime') t = /@db\.Date\b/.test(a) ? 'DATE' : 'TIMESTAMP(3)';
    else if (f.type === 'String') { const v = a.match(/@db\.VarChar\((\d+)\)/); t = v ? `VARCHAR(${v[1]})` : 'TEXT'; }
    else t = f.type.toUpperCase();
    return f.list ? `${t}[]` : t;
  };
  for (const mdl of models) for (const f of mdl.fields) {
    f.dbType = dbType(f);
    const def = f.attrs.match(/@default\(((?:[^()]|\([^()]*\))*)\)/);
    f.default = def ? def[1].replace(/"/g, '') : (f.attrs.includes('@updatedAt') ? 'เวลาที่แก้' : '');
    f.keys = [f.attrs.includes('@id') ? 'PK' : '', f.attrs.includes('@unique') ? 'UQ' : '', f.fk ? `FK → ${tableOf(f.fk.target)}` : ''].filter(Boolean);
  }
  return { models, enums, tableOf };
}

// ผลทดสอบจาก log: ===== ไฟล์ / ── หัวข้อ / PASS|FAIL ชื่อกรณี
function parseTests() {
  const file = path.join(DIR, 'data', 'test-run.txt');
  const log = fs.readFileSync(file, 'utf8');
  const files = [];
  let cur = null, section = null;
  for (const line of log.split(/\r?\n/)) {
    let m;
    if ((m = line.match(/^===== (.+)$/))) { cur = { name: m[1].trim(), sections: [] }; files.push(cur); section = null; continue; }
    if (!cur) continue;
    if ((m = line.match(/^── (.+)$/))) { section = { title: m[1].trim(), cases: [] }; cur.sections.push(section); continue; }
    if ((m = line.match(/^(PASS|FAIL)\s+(.+)$/))) {
      if (!section) { section = { title: 'ทั่วไป', cases: [] }; cur.sections.push(section); }
      section.cases.push({ ok: m[1] === 'PASS', name: m[2].trim() });
    }
  }
  for (const f of files) {
    f.total = f.sections.reduce((n, s) => n + s.cases.length, 0);
    f.failed = f.sections.reduce((n, s) => n + s.cases.filter((c) => !c.ok).length, 0);
  }
  return { files, total: files.reduce((n, f) => n + f.total, 0), failed: files.reduce((n, f) => n + f.failed, 0), at: fs.statSync(file).mtime };
}

function gitInfo() {
  try {
    const count = Number(execSync('git rev-list --count HEAD', { cwd: ROOT }).toString().trim());
    const head = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const last = execSync('git log -1 --format=%cs', { cwd: ROOT }).toString().trim();
    return { count, head, last };
  } catch { return { count: 0, head: '-', last: null }; }
}

// ── ตัวช่วยเขียนเนื้อหา ─────────────────────────────────────────

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const H = {
  esc,
  // rows = array ของ array (เซลล์เป็น HTML ได้) · widths = ['12%', ...]
  table(head, rows, { cls = '', widths } = {}) {
    const cols = widths ? `<colgroup>${widths.map((w) => `<col style="width:${w}">`).join('')}</colgroup>` : '';
    return `<table class="${cls}">${cols}<thead><tr>${head.map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  },
  // ภาพหน้าจอใน img/
  img(name, caption, { cls = '', width } = {}) {
    return `<figure class="${cls}"><img src="../img/${name}"${width ? ` style="width:${width}"` : ''} alt="${esc(caption)}" /><figcaption>${caption}</figcaption></figure>`;
  },
  mermaid(code, caption, { width } = {}) {
    return `<figure class="diagram"><div class="mermaid"${width ? ` style="width:${width};margin:0 auto"` : ''}>${esc(code)}</div>${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
  },
  tag: (kind, text) => `<span class="tag ${kind}">${text}</span>`,
  callout: (kind, title, html) => `<div class="callout ${kind}"><b>${title}</b> ${html}</div>`,
  kpis: (items) => `<div class="grid${items.length === 3 ? 3 : ''}" style="${items.length === 4 ? 'display:grid;grid-template-columns:repeat(4,1fr);gap:3mm' : ''}">${items.map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join('')}</div>`,
  ul: (items) => `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>`,
};

// ── เอกสาร ───────────────────────────────────────────────────────

const CHAPTERS = ['01-overview', '02-ba', '03-sa', '04-design', '05-dev', '06-test', '07-deploy', '99-appendix'].map((f) => require(`./content/${f}.cjs`));
const byId = (ids) => CHAPTERS.filter((c) => ids.includes(c.id));
const DOCS = [
  { file: 'เอกสารโครงการ-ระบบฐานข้อมูลคนพิการ-ฉบับรวม', title: 'เอกสารประกอบการพัฒนาระบบ (ฉบับรวม)', desc: 'ทุกระยะของโครงการ ตั้งแต่เก็บความต้องการ วิเคราะห์ ออกแบบ พัฒนา ทดสอบ จนถึงติดตั้งและดูแลระบบจริง', chapters: CHAPTERS, roles: ['BA', 'SA', 'Design', 'Dev', 'Test', 'Ops'] },
  { file: '1-BA-ความต้องการของระบบ', title: 'เอกสารความต้องการของระบบ (BRD / SRS)', desc: 'ที่มา ขอบเขต เอกสารความต้องการจากหน่วยงาน ผู้ใช้และสิทธิ์ กรณีการใช้งาน ความต้องการเชิงหน้าที่ กฎทางธุรกิจ และบันทึกการเปลี่ยนแปลงความต้องการ', chapters: byId(['overview', 'ba']), roles: ['BA'] },
  { file: '2-SA-วิเคราะห์และออกแบบระบบ', title: 'เอกสารวิเคราะห์และออกแบบระบบ (SDD)', desc: 'สถาปัตยกรรม เทคโนโลยีและเหตุผล API ตรรกะสำคัญ ความปลอดภัยและความเป็นส่วนตัว และการสำรองข้อมูล', chapters: byId(['sa']), roles: ['SA'] },
  { file: '3-Design-ฐานข้อมูลและ-UX-UI', title: 'เอกสารออกแบบฐานข้อมูลและ UX/UI (Database &amp; UI Design)', desc: 'แผนภาพฐานข้อมูล พจนานุกรมข้อมูล หลักการ UX ระบบการออกแบบ แผนผังหน้าเว็บ ลำดับการใช้งาน และหน้าจอจริงทุกหน้า', chapters: byId(['design']), roles: ['Design'] },
  { file: '4-Test-แผนและผลการทดสอบ', title: 'เอกสารแผนและผลการทดสอบ (Test Plan &amp; Report)', desc: 'กลยุทธ์การทดสอบ สภาพแวดล้อม ผลการทดสอบจริง กรณีทดสอบทั้งหมด ข้อบกพร่องที่พบ และแบบฟอร์มทดสอบการยอมรับ (UAT)', chapters: byId(['test']), roles: ['Test'] },
  { file: '5-Dev-Ops-พัฒนาและติดตั้งระบบ', title: 'เอกสารการพัฒนาและติดตั้งระบบ (Development &amp; Operations)', desc: 'โครงสร้างโปรแกรม มาตรฐานการพัฒนา เวอร์ชัน การติดตั้ง สำรองและกู้ข้อมูล การเฝ้าระบบ คู่มือผู้ดูแลระบบ และงานที่ค้าง', chapters: byId(['dev', 'deploy']), roles: ['Dev', 'Ops'] },
];

function render(doc, ctx) {
  // ใส่ id ให้หัวข้อ h2 ทุกตัว แล้วทำสารบัญ
  const toc = [];
  const body = doc.chapters.map((ch) => {
    let i = 0;
    const html = ch.render(ctx).replace(/<h2>(.*?)<\/h2>/g, (_, t) => {
      const id = `${ch.id}-${++i}`;
      toc.push({ level: 2, id, text: t.replace(/<[^>]+>/g, '') });
      return `<h2 id="${id}">${t}</h2>`;
    });
    toc.splice(toc.length - i, 0, { level: 1, id: ch.id, text: ch.num ? `บทที่ ${ch.num} ${ch.title}` : ch.title, role: ch.role });
    return `<section class="chapter" id="${ch.id}"><div class="chapter-head">${ch.num ? `<div class="num">${ch.num}</div>` : ''}<div>${ch.role ? `<span class="role">${ch.role}</span>` : ''}<h1>${ch.title}</h1></div></div>${html}</section>`;
  }).join('\n');

  const f = ctx.facts;
  const cover = `
<section class="cover">
  <div class="band"></div>
  <div class="logo"><img src="../../../frontend/public/logo-seal.png" alt=""></div>
  <div class="org"><b>${SYSTEM}</b><span>มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี</span></div>
  <div class="title"><div class="kicker">เอกสารส่งมอบระบบ · System Documentation</div><h1>${doc.title}</h1></div>
  <div class="sub">
    <div class="doc">ระบบฐานข้อมูลคนพิการ โครงการฝึกอบรม-ฝึกงานคนพิการ (PWDs Database)</div>
    <div class="desc">${doc.desc}</div>
    <div class="chips">${doc.roles.map((r) => `<span>${r}</span>`).join('')}<span>ระบบเวอร์ชัน ${f.version}</span><span>${f.url}</span></div>
  </div>
  <div class="meta">
    <div><b>เวอร์ชันเอกสาร</b><span>1.0</span></div>
    <div><b>วันที่จัดทำ</b><span>${f.today}</span></div>
    <div><b>ระยะเวลาโครงการ</b><span>${f.period}</span></div>
    <div><b>สถานะระบบ</b><span>ใช้งานจริงแล้ว</span></div>
  </div>
</section>`;

  const control = `
<section>
  <h1 style="font-size:17pt">การควบคุมเอกสาร</h1>
  ${H.table(['เวอร์ชัน', 'วันที่', 'รายละเอียด', 'ผู้จัดทำ'], [['1.0', f.today, `จัดทำครั้งแรก — ตรงกับระบบเวอร์ชัน ${f.version} (commit ${f.git.head})`, 'ทีมพัฒนาระบบ']], { widths: ['12%', '20%', '48%', '20%'] })}
  <h3>ขอบเขตของเอกสารฉบับนี้</h3>
  <p>${doc.desc}${doc.chapters.length < CHAPTERS.length ? ' — เป็นส่วนหนึ่งของชุดเอกสารโครงการ (ฉบับรวมมีครบทุกบท และใช้เลขบทเดียวกัน)' : ''}</p>
  <h3>เอกสารในชุดนี้</h3>
  ${H.table(['ไฟล์', 'สำหรับ', 'เนื้อหา'], DOCS.map((d) => [`<b>${d.title}</b>`, d.roles.join(' · '), d.desc]), { widths: ['30%', '16%', '54%'] })}
  ${H.callout('info', 'ที่มาของข้อมูลในเอกสาร', 'ตาราง/คอลัมน์ดึงจากโครงสร้างฐานข้อมูลจริง (schema.prisma) · ผลการทดสอบดึงจากผลรันจริงล่าสุด · ภาพหน้าจอถ่ายจากระบบจริงด้วย<b>ข้อมูลสมมติ</b> (ไม่มีข้อมูลคนพิการจริงในเอกสาร) · ความต้องการมาจากเอกสารที่หน่วยงานส่งมา 6 ฉบับ และบันทึกการพัฒนา (CHANGELOG)')}
  <h3>การลงนามรับรองเอกสาร</h3>
  <div class="sign">
    <div><div class="line"></div>ผู้จัดทำ<br><small>วันที่ ....../....../......</small></div>
    <div><div class="line"></div>ผู้ตรวจสอบ<br><small>วันที่ ....../....../......</small></div>
    <div><div class="line"></div>ผู้อนุมัติ (เจ้าของระบบ)<br><small>วันที่ ....../....../......</small></div>
  </div>
</section>
<section class="pb">
  <h1 style="font-size:17pt">สารบัญ</h1>
  <div class="toc">${toc.map((t) => t.level === 1
    ? `<div class="t1"><a href="#${t.id}">${t.text}</a>${t.role ? `<span class="role">${t.role}</span>` : ''}</div>`
    : `<div class="t2"><a href="#${t.id}">${t.text}</a></div>`).join('')}</div>
</section>`;

  const hasMermaid = body.includes('class="mermaid"');
  return `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><title>${doc.title} — ${SYSTEM}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Sans+Thai:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../lib/style.css">
</head><body>
${cover}
${control}
${body}
<script type="module">
  window.__ready = false;
  await document.fonts.ready;
  ${hasMermaid ? `
  const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs');
  mermaid.initialize({
    startOnLoad: false, theme: 'base', securityLevel: 'loose',
    fontFamily: 'Sarabun, sans-serif',
    themeVariables: { fontFamily: 'Sarabun, sans-serif', fontSize: '15px', primaryColor: '#fff5f0', primaryBorderColor: '#e74111', primaryTextColor: '#1c1917',
      lineColor: '#78716c', secondaryColor: '#e0f2fe', secondaryBorderColor: '#0284c7', tertiaryColor: '#f5f5f4', tertiaryBorderColor: '#a8a29e',
      clusterBkg: '#faf6f2', clusterBorder: '#e7ded4', edgeLabelBackground: '#ffffff', noteBkgColor: '#fef3c7', noteBorderColor: '#d97706',
      actorBkg: '#fff5f0', actorBorder: '#e74111', signalColor: '#57534e', labelBoxBkgColor: '#fff5f0', activationBkgColor: '#ffe7dc',
      doneTaskBkgColor: '#ffa783', doneTaskBorderColor: '#e74111', taskTextColor: '#1c1917', taskTextDarkColor: '#1c1917', taskTextOutsideColor: '#44403c',
      sectionBkgColor: '#fff5f0', altSectionBkgColor: '#ffffff', sectionBkgColor2: '#fff5f0', gridColor: '#e7ded4' },
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis', padding: 12 },
    er: { useMaxWidth: true }, sequence: { useMaxWidth: true, mirrorActors: false, wrap: true, width: 130, actorMargin: 36, messageFontSize: 15, actorFontSize: 15, noteFontSize: 14, messageMargin: 34 }, gantt: { useMaxWidth: true, barHeight: 20, barGap: 4, fontSize: 14, sectionFontSize: 14, leftPadding: 70, topPadding: 40 },
    state: { useMaxWidth: true },
  });
  await mermaid.run({ querySelector: '.mermaid' });` : ''}
  for (const img of document.images) if (!img.complete) await new Promise((r) => { img.onload = img.onerror = r; });
  window.__ready = true;
</script>
</body></html>`;
}

// ── พิมพ์ PDF ด้วย Chrome (CDP) ─────────────────────────────────────

// ระยะเวลาโครงการ: เริ่ม 23 พ.ค. 2569 (migration แรก) ถึงวันที่ commit ล่าสุด หรือวันที่รันทดสอบล่าสุด (อันที่ใหม่กว่า)
function projectPeriod(last, testedAt) {
  const start = new Date('2026-05-23T00:00:00+07:00');
  const committed = last ? new Date(`${last}T00:00:00+07:00`) : new Date();
  const tested = new Date(`${testedAt.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })}T00:00:00+07:00`);
  const end = tested > committed ? tested : committed;
  const days = Math.round((end - start) / 86400000) + 1;
  const f = (d, o) => new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', ...o }).format(d);
  return { period: `${f(start, { day: 'numeric', month: 'short' })} – ${f(end, { day: 'numeric', month: 'short', year: 'numeric' })}`, days };
}

async function main() {
  fs.mkdirSync(OUT_HTML, { recursive: true });
  fs.mkdirSync(OUT_PDF, { recursive: true });
  const schema = parseSchema();
  const tests = parseTests();
  const git = gitInfo();
  const version = 'v' + require(path.join(ROOT, 'frontend', 'package.json')).version;
  const thaiDate = (d) => new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(d);
  const ctx = {
    H, schema, tests,
    facts: { version, git, url: 'kmutt-pwd.duckdns.org', today: thaiDate(new Date()), ...projectPeriod(git.last, tests.at), testsAt: thaiDate(tests.at) },
  };
  if (tests.failed) console.warn(`⚠️ ผลทดสอบใน data/test-run.txt มีไม่ผ่าน ${tests.failed} เคส`);

  const profile = path.join(require('os').tmpdir(), 'kmutt-doc-pdf-profile');
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); break; } catch { await sleep(250); } }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.result?.value;
  await send('Page.enable');

  const only = process.argv[2];
  for (const doc of DOCS) {
    if (only && !doc.file.startsWith(only)) continue;
    const htmlFile = path.join(OUT_HTML, `${doc.file}.html`);
    fs.writeFileSync(htmlFile, render(doc, ctx));
    await send('Page.navigate', { url: fileUrl(htmlFile) });
    let ok = false;
    for (let t = 0; t < 120; t++) { await sleep(500); if (await ev('window.__ready === true')) { ok = true; break; } }
    if (!ok) throw new Error(`รอหน้าเอกสารไม่เสร็จ: ${doc.file} (ฟอนต์/mermaid โหลดไม่ขึ้น?)`);
    const errs = await ev(`[...document.querySelectorAll('.mermaid')].filter(d => !d.querySelector('svg') || d.innerText.includes('Syntax error')).length`);
    if (errs) throw new Error(`แผนภาพเสีย ${errs} รูปใน ${doc.file}`);
    const broken = await ev(`[...document.images].filter(i => !i.naturalWidth).map(i => i.getAttribute('src'))`);
    if (broken?.length) throw new Error(`ภาพหาย ${broken.length} ภาพใน ${doc.file}: ${broken.join(', ')}`);
    const footer = `<div style="width:100%;font-size:7.5px;font-family:Tahoma,'Leelawadee UI',sans-serif;color:#78716c;padding:0 16mm;display:flex;justify-content:space-between;">
      <span>${SYSTEM} · ${doc.title}</span><span>หน้า <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
    const params = { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer, generateDocumentOutline: true };
    let r = await send('Page.printToPDF', params);
    if (r.error) { delete params.generateDocumentOutline; r = await send('Page.printToPDF', params); }
    if (r.error) throw new Error(r.error.message);
    const pdf = Buffer.from(r.result.data, 'base64');
    fs.writeFileSync(path.join(OUT_PDF, `${doc.file}.pdf`), pdf);
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    console.log(`  ${doc.file}.pdf  ${pages} หน้า  ${Math.round(pdf.length / 1024)} KB`);
  }
  ws.close(); chrome.kill();
  console.log('✅ เสร็จ →', OUT_PDF);
  process.exit(0);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
