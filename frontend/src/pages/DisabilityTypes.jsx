import { useEffect, useState } from 'react';
import { Accessibility, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { getDisabilityTypeList, createDisabilityType, updateDisabilityType, deleteDisabilityType } from '../api';
import { useToast } from '../context/ToastContext';
import LoadError from '../components/LoadError';

// ประเภทความพิการ (เฉพาะผู้ดูแลระบบ) — เดิมเพิ่ม/แก้ต้องเข้าไปแก้ในฐานข้อมูล
// แก้ชื่อ = ทุกคนที่ใช้ประเภทนี้เห็นชื่อใหม่ทันที · ลบได้เฉพาะประเภทที่ยังไม่มีใครใช้
export default function DisabilityTypes() {
  const toast = useToast();
  const [types, setTypes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState({ id: null, name: '' });
  const [busy, setBusy] = useState(false);

  const load = () => getDisabilityTypeList()
    .then((r) => { setTypes(r.data); setLoadError(false); setLoaded(true); })
    .catch(() => { setLoadError(true); setLoaded(true); });
  useEffect(() => { load(); }, []);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); await load(); toast.success(okMsg); return true; }
    catch (err) { toast.error('ไม่สำเร็จ', err.response?.data?.error || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง'); return false; }
    finally { setBusy(false); }
  };
  const add = async () => {
    if (!newName.trim()) return toast.error('กรอกข้อมูลไม่ครบ', 'กรุณากรอกชื่อประเภทความพิการ');
    if (await run(() => createDisabilityType({ typeName: newName }), 'เพิ่มประเภทความพิการแล้ว')) setNewName('');
  };
  const saveEdit = async () => {
    if (!editing.name.trim()) return toast.error('กรอกข้อมูลไม่ครบ', 'กรุณากรอกชื่อประเภทความพิการ');
    if (await run(() => updateDisabilityType(editing.id, { typeName: editing.name }), 'แก้ชื่อแล้ว')) setEditing({ id: null, name: '' });
  };
  const remove = async (t) => {
    if (!(await toast.confirm({ title: `ลบ "${t.typeName}"?`, message: 'ยังไม่มีคนพิการใช้ประเภทนี้ — ลบแล้วจะหายจากตัวเลือกทุกที่' }))) return;
    await run(() => deleteDisabilityType(t.id), 'ลบแล้ว');
  };

  if (loadError) return <LoadError onRetry={load} />;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
          <Accessibility size={22} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-black page-title leading-tight">ประเภทความพิการ</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            <span className="text-orange-600 font-bold">{types.length}</span> ประเภท · ใช้ในฟอร์ม ตัวกรอง นำเข้า Excel รายงาน และ Dashboard
          </p>
        </div>
      </div>

      {/* เพิ่มใหม่ */}
      <div className="bg-white rounded-3xl border border-orange-100/80 shadow-sm p-4 flex flex-col sm:flex-row gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={100}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          aria-label="ชื่อประเภทความพิการใหม่" placeholder="ชื่อประเภทความพิการใหม่ เช่น ความพิการทางการพูด"
          className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400" />
        <button onClick={add} disabled={busy}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 active:scale-95 transition-all disabled:opacity-60">
          <Plus size={16} /> เพิ่มประเภท
        </button>
      </div>

      {/* รายการ */}
      <div className="bg-white rounded-3xl border border-orange-100/80 shadow-sm overflow-hidden">
        {!loaded && <div className="flex justify-center py-10"><span className="loading loading-spinner text-primary" /></div>}
        {loaded && types.length === 0 && <p className="text-center py-10 text-sm text-gray-400">ยังไม่มีประเภทความพิการ</p>}
        <ul className="divide-y divide-gray-100">
          {types.map((t) => {
            const used = t._count?.disabilityInfos || 0;
            const isEditing = editing.id === t.id;
            return (
              <li key={t.id} data-type-row className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input autoFocus value={editing.name} maxLength={100} aria-label="แก้ชื่อประเภทความพิการ"
                      onChange={(e) => setEditing({ id: t.id, name: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing({ id: null, name: '' }); }}
                      className="w-full rounded-xl border border-orange-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
                  ) : (
                    <p className="font-semibold text-gray-800 text-sm break-words">{t.typeName}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">{used ? `ใช้อยู่ ${used} คน` : 'ยังไม่มีใครใช้'}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {isEditing ? <>
                    <button title="บันทึก" onClick={saveEdit} disabled={busy}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-orange-600 hover:bg-orange-700 active:scale-95 disabled:opacity-60"><Check size={16} /></button>
                    <button title="ยกเลิก" onClick={() => setEditing({ id: null, name: '' })}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-95"><X size={16} /></button>
                  </> : <>
                    <button title="แก้ชื่อ" onClick={() => setEditing({ id: t.id, name: t.typeName })}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-amber-600 bg-amber-50 border border-amber-100 hover:bg-amber-100 active:scale-95"><Pencil size={15} /></button>
                    <button title={used ? `ลบไม่ได้ — มีคนพิการ ${used} คนใช้อยู่ (แก้ชื่อแทนได้)` : 'ลบ'} onClick={() => remove(t)} disabled={used > 0}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"><Trash2 size={15} /></button>
                  </>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-xs text-gray-500 px-1">แก้ชื่อแล้ว ทุกคนที่ใช้ประเภทนี้เห็นชื่อใหม่ทันที · ลบได้เฉพาะประเภทที่ยังไม่มีใครใช้ (ถ้ามีคนใช้อยู่ให้แก้ชื่อแทน)</p>
    </div>
  );
}
