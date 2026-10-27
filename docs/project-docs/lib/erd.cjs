// วาดแผนภาพฐานข้อมูล (ERD) เป็น SVG เอง — mermaid วางตาราง 15 ตารางกว้างเกินจนตัวหนังสือเล็กอ่านไม่ออกในกระดาษ A4
// คอลัมน์ทุกตัวดึงจาก schema.prisma จริง · ตำแหน่งตารางกำหนดเองให้อ่านง่าย (3 คอลัมน์ ตาราง persons อยู่กลาง)
const W = 196;          // ความกว้างตาราง
const ROW = 14.5;       // ความสูงต่อคอลัมน์
const HEAD = 21;
const X = [20, 262, 504];   // ซ้าย / กลาง / ขวา
// [คอลัมน์, y] — ซ้าย = ข้อมูลย่อยของคน · กลาง = คน + ติดตามผล + ประวัติการใช้งาน · ขวา = รุ่น/ประเมิน/สถานประกอบการ/ผู้ใช้
const LAYOUT = {
  person_photos: [0, 8], disability_infos: [0, 134], disability_types: [0, 274], skills: [0, 342], training_records: [0, 439], work_experiences: [0, 609],
  persons: [1, 8], follow_ups: [1, 497], audit_logs: [1, 667],
  training_batches: [2, 8], courses: [2, 163], person_assessments: [2, 260], person_organizations: [2, 415], organizations: [2, 585], users: [2, 740],
};
// [ตารางแม่, คอลัมน์แม่, ตารางลูก, คอลัมน์ลูก, เส้นประ (อ้างอิงที่ลบแม่แล้วลูกเหลือค่าว่าง), ระยะเลื่อนเส้นในช่องว่าง]
const RELS = [
  ['persons', 'id', 'person_photos', 'person_id', false, 0],
  ['persons', 'id', 'disability_infos', 'person_id', false, 5],
  ['persons', 'id', 'skills', 'person_id', false, 10],
  ['persons', 'id', 'training_records', 'person_id', false, 15],
  ['persons', 'id', 'work_experiences', 'person_id', false, 20],
  ['disability_types', 'id', 'disability_infos', 'disability_type_id', false, 0],
  ['persons', 'id', 'follow_ups', 'person_id', false, 27],
  ['persons', 'id', 'person_assessments', 'person_id', false, 0],
  ['persons', 'id', 'person_organizations', 'person_id', false, 7],
  ['training_batches', 'id', 'persons', 'batch_id', true, 13],
  ['courses', 'id', 'persons', 'course_id', true, 5],
  ['training_batches', 'id', 'courses', 'batch_id', false, 0],
  ['training_batches', 'id', 'person_assessments', 'batch_id', false, 7],
  ['organizations', 'id', 'person_organizations', 'org_id', false, 0],
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const shortType = (t) => t.replace('TIMESTAMP(3)', 'timestamp').replace(/^VARCHAR/, 'varchar').replace(/^ENUM .*/, 'enum').replace(/^DECIMAL/, 'decimal')
  .replace('DOUBLE PRECISION', 'float').replace('SERIAL', 'serial').replace('INTEGER', 'int').replace('BOOLEAN', 'bool').replace('TEXT', 'text').replace('DATE', 'date');

module.exports = function erdSvg(schema) {
  const tables = {};
  for (const m of schema.models) {
    const pos = LAYOUT[m.table];
    if (!pos) continue;
    tables[m.table] = { x: X[pos[0]], y: pos[1], col: pos[0], fields: m.fields };
  }
  const missing = schema.models.filter((m) => !LAYOUT[m.table]).map((m) => m.table);
  if (missing.length) throw new Error(`ERD: ยังไม่ได้วางตำแหน่งตาราง ${missing.join(', ')} ใน lib/erd.cjs`);
  const rowY = (t, c) => {
    const tb = tables[t];
    const i = tb.fields.findIndex((f) => f.column === c);
    if (i < 0) throw new Error(`ERD: ไม่มีคอลัมน์ ${t}.${c}`);
    return tb.y + HEAD + (i + 0.5) * ROW;
  };
  const parts = [];
  // ── ตาราง
  for (const [name, t] of Object.entries(tables)) {
    const h = HEAD + t.fields.length * ROW;
    parts.push(`<g><rect x="${t.x}" y="${t.y}" width="${W}" height="${h}" rx="5" fill="#fff" stroke="#e7ded4"/>
      <path d="M${t.x} ${t.y + 5} a5 5 0 0 1 5 -5 h${W - 10} a5 5 0 0 1 5 5 v${HEAD - 5} h-${W} z" fill="${name === 'audit_logs' || name === 'users' ? '#57534e' : '#e74111'}"/>
      <text x="${t.x + 8}" y="${t.y + 14.5}" font-size="11.5" font-weight="700" fill="#fff" font-family="Consolas, monospace">${name}</text>`);
    t.fields.forEach((f, i) => {
      const y = t.y + HEAD + i * ROW;
      if (i % 2) parts.push(`<rect x="${t.x + 0.5}" y="${y}" width="${W - 1}" height="${ROW}" fill="#fbf8f5"/>`);
      const key = f.keys.includes('PK') ? ['PK', '#9a2f0c', '#ffe7dc'] : f.fk ? ['FK', '#1e40af', '#dbeafe'] : f.keys.includes('UQ') ? ['UQ', '#065f46', '#d1fae5'] : null;
      parts.push(`<text x="${t.x + 8}" y="${y + 10.6}" font-size="9.6" font-family="Consolas, monospace" fill="#1c1917"${key && key[0] === 'PK' ? ' font-weight="700"' : ''}>${esc(f.column)}</text>
        <text x="${t.x + W - (key ? 30 : 8)}" y="${y + 10.6}" font-size="8.6" text-anchor="end" font-family="Consolas, monospace" fill="#78716c">${esc(shortType(f.dbType))}${f.optional ? '?' : ''}</text>`);
      if (key) parts.push(`<rect x="${t.x + W - 25}" y="${y + 2.5}" width="19" height="9.5" rx="4.7" fill="${key[2]}"/><text x="${t.x + W - 15.5}" y="${y + 10}" font-size="7.2" font-weight="700" text-anchor="middle" font-family="Tahoma, sans-serif" fill="${key[1]}">${key[0]}</text>`);
    });
    parts.push('</g>');
  }
  // ── เส้นความสัมพันธ์: ฝั่งแม่ = ขีดตั้ง (หนึ่ง) · ฝั่งลูก = ตีนกา (หลาย)
  const lines = [];
  for (const [pt, pc, ct, cc, dashed, off] of RELS) {
    const P = tables[pt], C = tables[ct];
    const y1 = rowY(pt, pc), y2 = rowY(ct, cc);
    let d, x1, x2, dir1, dir2;
    if (P.col === C.col) {
      // ตารางคอลัมน์เดียวกัน: อ้อมด้านนอก (ซ้ายสุด/กลาง = อ้อมซ้าย · ขวา = อ้อมขวา)
      const left = P.col === 0 || P.col === 1;
      x1 = left ? P.x : P.x + W; x2 = x1;
      const gx = left ? x1 - 10 - off : x1 + 10 + off;
      d = `M${x1} ${y1} H${gx} V${y2} H${x2}`;
      dir1 = left ? -1 : 1; dir2 = left ? -1 : 1;
    } else {
      const toRight = P.col < C.col;
      x1 = toRight ? P.x + W : P.x; x2 = toRight ? C.x : C.x + W;
      const gx = (x1 + x2) / 2 + (toRight ? -14 + off : 14 - off);
      d = `M${x1} ${y1} H${gx} V${y2} H${x2}`;
      dir1 = toRight ? 1 : -1; dir2 = toRight ? -1 : 1;
    }
    const color = dashed ? '#a8a29e' : '#78716c';
    lines.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="1.1"${dashed ? ' stroke-dasharray="4 3"' : ''}/>`);
    lines.push(`<path d="M${x1 + dir1 * 5} ${y1 - 4.5} v9" stroke="${color}" stroke-width="1.3"/>`);
    const fx = x2 + dir2 * 8;
    lines.push(`<path d="M${fx} ${y2} L${x2} ${y2 - 4.5} M${fx} ${y2} L${x2} ${y2 + 4.5} M${fx} ${y2} L${x2} ${y2}" stroke="${color}" stroke-width="1.2" fill="none"/>`);
  }
  const height = Math.max(...Object.values(tables).map((t) => t.y + HEAD + t.fields.length * ROW)) + 10;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 730 ${height}" width="100%" style="max-height:236mm" font-family="Sarabun, sans-serif">${lines.join('')}${parts.join('')}</svg>`;
};
