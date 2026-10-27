// ถ่ายภาพหน้าจอให้เอกสารโครงการ → docs/project-docs/img/*.png
//   node docs/project-docs/shots.cjs
// รัน `npm test -- docs` (tests/docs/doc-shots.test.cjs) ซึ่งเปิดระบบในชุดทดสอบเอง ใช้ฐาน *_test + ข้อมูลสมมติ
// ไม่แตะฐาน dev / ระบบจริง · ภาพไม่มีข้อมูลคนพิการจริง (PDPA)
// ⚠️ คำสั่งนี้เขียนทับ tests/.output/last-run.log — ผลทดสอบของเอกสาร (data/test-run.txt) ต้องก๊อปจากรอบที่รัน npm test ครบชุด
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.join(ROOT, 'tests', '.output', 'shots');
const OUT = path.join(__dirname, 'img');

const r = spawnSync('npm', ['test', '--', 'docs'], { cwd: path.join(ROOT, 'backend'), stdio: 'inherit', shell: true });
if (r.status !== 0) { console.error('❌ ถ่ายภาพไม่สำเร็จ — ดู tests/.output/last-run.log'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(SHOTS).filter((f) => f.startsWith('doc-') && f.endsWith('.png'));
for (const f of files) fs.copyFileSync(path.join(SHOTS, f), path.join(OUT, f.replace(/^doc-/, '')));
console.log(`✅ ${files.length} ภาพ → ${OUT}`);
