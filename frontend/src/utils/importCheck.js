// ตรวจค่า รุ่น / หลักสูตร / ประเภทความพิการ จากไฟล์ Excel ก่อนนำเข้า
// กฎเดียวกับจังหวัด: ว่างได้ · พิมพ์ย่อ/สะกดต่างนิดหน่อยแก้ให้อัตโนมัติ · ไม่ตรงกับในระบบ = นำเข้าไม่ได้ทั้งไฟล์
// (เดิมรุ่นที่ไม่ตรงถูกปล่อยว่างเงียบๆ คนหลุดจากรุ่นโดยไม่มีใครรู้)
//
// ผลลัพธ์ทุกตัว: { status: 'empty' | 'ok' | 'fixed' | 'bad', typed, ...ค่าที่หาเจอ, reason (เมื่อ bad) }

const digits = (v) => String(v ?? '').replace(/\D/g, '');
const squash = (s) => String(s ?? '').normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
const key = (s) => squash(s).toLowerCase().replace(/ /g, '');

// ── รุ่น (คอลัมน์ "รุ่นที่" + "ปี") ──
export function matchBatch(numRaw, yearRaw, batches) {
  const num = digits(numRaw);
  const yr = digits(yearRaw);
  const typed = [squash(numRaw), squash(yearRaw)].filter(Boolean).join('/');
  if (!num) return { status: 'empty', typed, batchId: '' };

  const sameNum = batches.filter((b) => b.batchNumber === parseInt(num, 10));
  const found = yr ? sameNum.filter((b) => b.year === parseInt(yr, 10)) : sameNum;
  if (found.length === 1) return { status: 'ok', typed, batchId: String(found[0].id), batch: found[0] };
  if (found.length > 1) return { status: 'bad', typed, batchId: '', reason: `มีรุ่นที่ ${num} หลายปี — ใส่ช่อง "ปี" ด้วย` };
  return {
    status: 'bad', typed, batchId: '',
    reason: `ไม่มีรุ่นที่ ${num}${yr ? `/${yr}` : ''} ในระบบ — สร้างรุ่นที่หน้า "จัดการรุ่น" ก่อน`,
  };
}

// ── หลักสูตร (ต้องอยู่ในรุ่นของแถวนั้น) ──
export function matchCourse(raw, batchResult) {
  const typed = squash(raw);
  if (!typed) return { status: 'empty', typed, courseId: '' };
  if (batchResult.status !== 'ok') return { status: 'bad', typed, courseId: '', reason: 'ใส่หลักสูตรแล้ว แต่ไม่ได้ใส่รุ่นที่/ปี ให้ถูก' };
  const courses = batchResult.batch.courses || [];
  const exact = courses.find((c) => squash(c.name) === typed);
  if (exact) return { status: 'ok', typed, courseId: String(exact.id), name: exact.name };
  const loose = courses.find((c) => key(c.name) === key(typed));   // ต่างแค่ช่องว่าง/ตัวใหญ่-เล็ก
  if (loose) return { status: 'fixed', typed, courseId: String(loose.id), name: loose.name };
  return {
    status: 'bad', typed, courseId: '',
    reason: courses.length
      ? `รุ่นนี้ไม่มีหลักสูตรนี้ — ที่มี: ${courses.map((c) => c.name).join(', ')}`
      : 'รุ่นนี้ยังไม่ได้เพิ่มหลักสูตร — เพิ่มที่หน้า "จัดการรุ่น" ก่อน',
  };
}

// ── ประเภทความพิการ (ใส่ได้หลายประเภท คั่นด้วย , หรือ ;) ──
// พิมพ์ย่อได้: "การมองเห็น", "มองเห็น", "ออทิสติก" → จับคู่กับชื่อเต็มในระบบให้ ถ้าตรงได้ประเภทเดียว
const typeKey = (s) => key(s).replace(/ความพิการ|ทาง|การ|ด้าน/g, '');

export function matchDisabilities(raw, types) {
  const typed = squash(raw);
  if (!typed) return { status: 'empty', typed, ids: [], names: [] };
  const parts = [...new Set(typed.split(/\s*[,;/\n|]\s*|\s+และ\s+/).map(squash).filter(Boolean))];

  const ids = [], names = [], bad = [];
  let fixed = false;
  for (const part of parts) {
    let hit = types.find((t) => squash(t.typeName) === part);
    if (!hit) {
      const k = typeKey(part);
      const cands = k.length >= 3 ? types.filter((t) => typeKey(t.typeName) === k || typeKey(t.typeName).includes(k)) : [];
      if (cands.length === 1) { hit = cands[0]; fixed = true; }
    }
    if (!hit) { bad.push(part); continue; }
    if (!ids.includes(String(hit.id))) { ids.push(String(hit.id)); names.push(hit.typeName); }
  }
  if (bad.length) {
    return { status: 'bad', typed, ids: [], names: [], reason: `ไม่รู้จัก "${bad.join('", "')}" — ใช้ชื่อตามชีต "ประเภทความพิการ" ในเทมเพลต` };
  }
  return { status: fixed ? 'fixed' : 'ok', typed, ids, names };
}
