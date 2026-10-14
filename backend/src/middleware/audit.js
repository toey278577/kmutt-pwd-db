const prisma = require('../prismaClient');

// บันทึกทุกการเพิ่ม/แก้/ลบที่สำเร็จ ลงตาราง audit_logs
// ใช้ตอบคำถาม "ใครแก้ข้อมูลคนนี้ เมื่อไหร่" (ข้อมูลส่วนบุคคล ต้องตรวจย้อนได้ตาม PDPA)
// ไม่เก็บ body ของ request — กันข้อมูลส่วนตัว/รหัสผ่านไปค้างอยู่ใน log

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ACTION_BY_METHOD = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };

const toInt = (v) => (/^\d+$/.test(v || '') ? parseInt(v, 10) : null);

// แปลง URL เป็น { entity, entityId, personId, action }  — คืน null ถ้าไม่ใช่ path ที่ต้องบันทึก
function parsePath(method, url) {
  const seg = url.split('?')[0].replace(/^\/api\/?/, '').split('/').filter(Boolean);
  let action = ACTION_BY_METHOD[method];
  const [root, a, b, c] = seg;

  if (root === 'persons') {
    if (!a) return { action, entity: 'person', entityId: null, personId: null };
    if (a === 'import') return { action: 'IMPORT', entity: 'person', entityId: null, personId: null };
    const personId = toInt(a);
    if (personId == null) return null;
    if (!b) return { action, entity: 'person', entityId: personId, personId };
    return { action, entity: b, entityId: toInt(c), personId };
  }
  if (root === 'batches') {
    if (b === 'courses') return { action, entity: 'course', entityId: toInt(c), personId: null, batchId: toInt(a) };
    return { action, entity: 'batch', entityId: toInt(a), personId: null };
  }
  if (root === 'organizations') return { action, entity: 'organization', entityId: toInt(a), personId: null };
  if (root === 'users') return { action, entity: 'user', entityId: toInt(a), personId: null };
  if (root === 'system' && a === 'reset') return { action: 'RESET', entity: 'system', entityId: null, personId: null };
  return null;
}

const batchLabel = (b) => (b ? `รุ่นที่ ${b.batchNumber}/${b.year}` : null);

// หาชื่อที่อ่านรู้เรื่องไว้ก่อนเรียก handler — ถ้าเป็นการลบ หลัง handler ทำงานข้อมูลจะหายไปแล้ว
async function lookupLabel(info) {
  if (info.personId) {
    const p = await prisma.person.findUnique({ where: { id: info.personId }, select: { fullName: true } });
    return p?.fullName ?? null;
  }
  if (!info.entityId) return null;
  if (info.entity === 'organization') {
    const o = await prisma.organization.findUnique({ where: { id: info.entityId }, select: { orgName: true } });
    return o?.orgName ?? null;
  }
  if (info.entity === 'batch') {
    return batchLabel(await prisma.trainingBatch.findUnique({ where: { id: info.entityId } }));
  }
  if (info.entity === 'course') {
    const c = await prisma.course.findUnique({ where: { id: info.entityId }, select: { name: true } });
    return c?.name ?? null;
  }
  if (info.entity === 'user') {
    const u = await prisma.user.findUnique({ where: { id: info.entityId }, select: { name: true } });
    return u?.name ?? null;
  }
  return null;
}

// ตอนเพิ่มใหม่ ยังไม่มีชื่อใน DB ให้หยิบจากผลลัพธ์ที่ส่งกลับแทน
function labelFromBody(info, body) {
  if (!body || typeof body !== 'object') return null;
  if (info.action === 'IMPORT') return `นำเข้า ${body.created ?? 0} คน`;
  return body.fullName || body.orgName || body.name || batchLabel(body.batchNumber ? body : null) || null;
}

function writeAudit(data) {
  // ห้ามให้การเขียน log ไปทำให้ request หลักพัง — ผิดพลาดก็แค่เตือนใน console
  return prisma.auditLog.create({ data }).catch((e) => console.warn('[AUDIT] บันทึกไม่สำเร็จ:', e.message));
}

async function auditMiddleware(req, res, next) {
  if (!MUTATING.has(req.method)) return next();
  const info = parsePath(req.method, req.originalUrl);
  if (!info) return next();

  let label = null;
  try { label = await lookupLabel(info); } catch { /* หาไม่เจอก็บันทึกแบบไม่มีชื่อ */ }

  let body;
  const origJson = res.json.bind(res);
  res.json = (b) => { body = b; return origJson(b); };

  res.on('finish', () => {
    if (res.statusCode >= 400 || !req.user) return;
    const isNew = info.action === 'CREATE' && !info.entityId;
    // แก้ไขตัวหลัก (คน/องค์กร/รุ่น/ผู้ใช้) ใช้ชื่อใหม่หลังแก้ ส่วนข้อมูลย่อยของคนใช้ชื่อคนเสมอ
    const isMainRecord = !info.personId || info.entity === 'person';
    const finalLabel = info.action === 'UPDATE' && isMainRecord
      ? labelFromBody(info, body) || label
      : label || labelFromBody(info, body);
    writeAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: info.action,
      entity: info.entity,
      entityId: info.entityId ?? (isNew && typeof body?.id === 'number' ? body.id : null),
      personId: info.personId ?? (info.entity === 'person' && isNew ? body?.id ?? null : null),
      label: (finalLabel || '').slice(0, 255) || null,
      ip: req.ip || null,
    });
  });

  next();
}

module.exports = { auditMiddleware, writeAudit, parsePath };
