import { useEffect, useState } from 'react';
import { Layers, Plus, Pencil, Trash2, CheckCircle, Clock, X } from 'lucide-react';
import { getBatches, createBatch, updateBatch, deleteBatch } from '../api';
import { useAuth } from '../context/AuthContext';

const STATUS_LABEL = { ACTIVE: 'กำลังดำเนินการ', COMPLETED: 'เสร็จสิ้น' };
const STATUS_STYLE = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  COMPLETED: 'bg-gray-100 text-gray-500 border-gray-200',
};

const emptyForm = {
  batchNumber: '', year: new Date().getFullYear() + 543,
  courseName: 'การฝึกอบรม-ฝึกงานคนพิการ เพื่อเตรียมความพร้อมเข้าทำงานในสถานประกอบการ',
  startDate: '', endDate: '', status: 'ACTIVE',
};

const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all';
const labelCls = 'block text-xs font-semibold text-gray-500 mb-1';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function BatchPage() {
  const { canEdit } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    getBatches().then(r => { setBatches(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm(emptyForm);
    setEditId(null);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (b) => {
    setForm({
      batchNumber: b.batchNumber,
      year: b.year,
      courseName: b.courseName,
      startDate: b.startDate ? b.startDate.slice(0, 10) : '',
      endDate: b.endDate ? b.endDate.slice(0, 10) : '',
      status: b.status,
    });
    setEditId(b.id);
    setErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const e = {};
    if (!form.batchNumber) e.batchNumber = 'กรุณาระบุรุ่นที่';
    if (!form.year) e.year = 'กรุณาระบุปี';
    if (!form.courseName.trim()) e.courseName = 'กรุณาระบุชื่อโครงการ';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editId) {
        await updateBatch(editId, form);
      } else {
        await createBatch(form);
      }
      setShowModal(false);
      load(true);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('ลบรุ่นนี้? ข้อมูลผลประเมินในรุ่นนี้จะถูกลบด้วย')) return;
    await deleteBatch(id).catch(() => {});
    load(true);
  };

  const activeBatch = batches.find(b => b.status === 'ACTIVE');

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl px-6 py-5"
        style={{ background: 'linear-gradient(135deg,#431407 0%,#9a3412 60%,#ea580c 100%)' }}>
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle,#fb923c,transparent)' }} />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <Layers size={20} color="white" />
            </div>
            <div>
              <p className="text-orange-300/70 text-xs font-bold tracking-widest uppercase mb-0.5">รุ่น / Batch</p>
              <h1 className="text-lg font-black text-white">จัดการรุ่นการฝึกอบรม</h1>
            </div>
          </div>
          {canEdit && (
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 active:scale-95 transition-all flex-shrink-0"
              style={{ background: 'rgba(234,88,12,0.4)' }}>
              <Plus size={16} /> เพิ่มรุ่น
            </button>
          )}
        </div>
      </div>

      {/* Active batch highlight */}
      {activeBatch && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-600 mb-0.5">รุ่นที่กำลังดำเนินการ</p>
            <p className="font-bold text-emerald-800 text-sm">รุ่นที่ {activeBatch.batchNumber} ปี พ.ศ. {activeBatch.year}</p>
            <p className="text-xs text-emerald-600 mt-0.5">{activeBatch.courseName}</p>
          </div>
        </div>
      )}

      {/* Batch list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Layers size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">ยังไม่มีรุ่นการฝึกอบรม</p>
          {canEdit && <button onClick={openNew} className="mt-3 text-sm text-orange-500 font-semibold hover:underline">+ เพิ่มรุ่นแรก</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {batches.map(b => (
            <div key={b.id} className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-lg font-black text-gray-800">รุ่นที่ {b.batchNumber}</span>
                    <span className="text-sm text-gray-400 font-medium">ปี พ.ศ. {b.year}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${STATUS_STYLE[b.status]}`}>
                      {STATUS_LABEL[b.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-snug truncate">{b.courseName}</p>
                </div>
                {canEdit && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(b)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(b.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-100 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="border-t border-orange-50 px-5 py-3 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {fmtDate(b.startDate)} — {fmtDate(b.endDate)}
                </span>
                <span className="ml-auto font-semibold text-orange-500">
                  {b._count?.assessments ?? 0} คนที่มีข้อมูลประเมิน
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">{editId ? 'แก้ไขรุ่น' : 'เพิ่มรุ่นใหม่'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>รุ่นที่ <span className="text-red-400">*</span></label>
                  <input type="number" className={inputCls} placeholder="12"
                    value={form.batchNumber} onChange={e => setForm({...form, batchNumber: e.target.value})} />
                  {errors.batchNumber && <p className="text-red-400 text-xs mt-1">{errors.batchNumber}</p>}
                </div>
                <div>
                  <label className={labelCls}>ปี พ.ศ. <span className="text-red-400">*</span></label>
                  <input type="number" className={inputCls} placeholder="2568"
                    value={form.year} onChange={e => setForm({...form, year: e.target.value})} />
                  {errors.year && <p className="text-red-400 text-xs mt-1">{errors.year}</p>}
                </div>
              </div>

              <div>
                <label className={labelCls}>ชื่อโครงการ <span className="text-red-400">*</span></label>
                <input className={inputCls}
                  value={form.courseName} onChange={e => setForm({...form, courseName: e.target.value})} />
                {errors.courseName && <p className="text-red-400 text-xs mt-1">{errors.courseName}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>วันเริ่ม</label>
                  <input type="date" className={inputCls}
                    value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                </div>
                <div>
                  <label className={labelCls}>วันสิ้นสุด</label>
                  <input type="date" className={inputCls}
                    value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
                </div>
              </div>

              <div>
                <label className={labelCls}>สถานะ</label>
                <select className={inputCls} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="ACTIVE">กำลังดำเนินการ</option>
                  <option value="COMPLETED">เสร็จสิ้น</option>
                </select>
              </div>
            </div>

            <div className="px-6 pb-5 flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors">
                ยกเลิก
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
