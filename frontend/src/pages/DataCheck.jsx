import { useEffect, useState } from 'react';
import { ClipboardCheck, CheckCircle2, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getIncomplete } from '../api';
import { useAuth } from '../context/AuthContext';
import LoadError from '../components/LoadError';
import MobileCard from '../components/MobileCard';

// ข้อมูลยังไม่ครบ (พี่เต้ย 16 ต.ค. 69) — รวมคนที่ยังขาดช่องที่ใช้ทำรายงาน ไว้ที่เดียว กดแล้วเปิดฟอร์มแก้ไขเติมได้เลย
// ช่องที่ตรวจ: backend/src/utils/incomplete.js
const MISS_CHIP = 'px-2.5 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap';

export default function DataCheck() {
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [only, setOnly] = useState('');   // กรองเฉพาะคนที่ขาดช่องนี้

  const load = () => getIncomplete().then((r) => setData(r.data)).catch(() => setLoadError(true));
  useEffect(() => { load(); }, []);
  const retry = () => { setLoadError(false); setData(null); load(); };

  if (loadError) return <LoadError onRetry={retry} />;
  if (!data) return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        <span className="text-orange-400 text-sm">กำลังโหลด...</span>
      </div>
    </div>
  );

  const label = Object.fromEntries(data.checks.map((c) => [c.key, c.label]));
  const rows = only ? data.items.filter((p) => p.missing.includes(only)) : data.items;
  // แก้ได้ → เปิดฟอร์มแก้ไขในหน้ารายชื่อ (มีครบทุกช่องที่ตรวจ) · ผู้ดูข้อมูล → ไปหน้ารายละเอียด
  const open = (p) => navigate(canEdit ? `/persons?edit=${p.id}` : `/persons/${p.id}`);
  const batchText = (b) => (b ? `รุ่น ${b.batchNumber}/${b.year}` : '—');
  const chips = (p) => p.missing.map((k) => <span key={k} className={MISS_CHIP}>{label[k]}</span>);
  const deceased = <span className="ml-1.5 inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-300 align-middle">เสียชีวิต</span>;
  const filterBtn = (key, text, count) => (
    <button key={key || 'all'} onClick={() => setOnly(key)}
      className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${only === key ? 'bg-orange-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-orange-100 hover:text-orange-600 hover:border-orange-200'}`}>
      {text} <span className={`ml-0.5 text-xs ${only === key ? 'text-white/80' : 'text-gray-400'}`}>({count})</span>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
          <ClipboardCheck size={22} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-black page-title leading-tight">ข้อมูลยังไม่ครบ</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            <span className="text-orange-600 font-bold">{data.items.length}</span> คน จากทั้งหมด {data.total} คน ยังขาดข้อมูลที่ใช้ทำรายงาน
          </p>
        </div>
      </div>

      {data.items.length === 0 ? (
        <div data-all-complete className="bg-white rounded-3xl border border-orange-100/80 shadow-sm py-14 flex flex-col items-center gap-3 text-center px-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 size={30} className="text-emerald-600" />
          </div>
          <p className="text-base font-bold text-gray-800">ข้อมูลครบทุกคนแล้ว</p>
          <p className="text-sm text-gray-500">เลขบัตร เบอร์โทร วันเกิด จังหวัด การศึกษา รุ่น และประเภทความพิการ มีครบ พร้อมออกรายงาน</p>
        </div>
      ) : (<>
        {/* มือถือ: แถวเดียวปัดซ้าย-ขวา (เดิมพับ 4 แถวกินจอ) · จอคอม: ขึ้นบรรทัดใหม่ */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
          {filterBtn('', 'ทั้งหมด', data.items.length)}
          {data.checks.filter((c) => c.count > 0).map((c) => filterBtn(c.key, `ไม่มี${c.label}`, c.count))}
        </div>

        <div className="bg-white rounded-3xl border border-orange-100/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['ชื่อ', 'รุ่น', 'ยังขาด', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="row-link border-b border-gray-50" title={canEdit ? 'กดเพื่อเติมข้อมูล' : 'กดเพื่อดูรายละเอียด'} onClick={() => open(p)}>
                    <td className="px-4 py-3.5">
                      <button type="button" className="row-link-name font-semibold text-gray-800 text-sm text-left">
                        {p.fullName}{p.nickname && <span className="font-normal text-gray-500"> ({p.nickname})</span>}
                      </button>
                      {p.lifeStatus === 'DECEASED' && deceased}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{batchText(p.batch)}</td>
                    <td className="px-4 py-3.5"><div className="flex flex-wrap gap-1.5">{chips(p)}</div></td>
                    <td className="px-4 py-3.5 text-right">
                      {canEdit && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 whitespace-nowrap">
                          <Pencil size={13} /> เติมข้อมูล
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-100">
            {rows.map((p) => (
              <MobileCard key={p.id} onClick={() => open(p)}
                title={<>{p.fullName}{p.nickname && <span className="font-normal text-gray-500"> ({p.nickname})</span>}{p.lifeStatus === 'DECEASED' && deceased}</>}
                subtitle={p.batch && batchText(p.batch)}   /* ไม่มีรุ่น → ป้าย "รุ่นอบรม" บอกอยู่แล้ว */
                chips={chips(p)}
                actions={canEdit && (
                  <button onClick={() => open(p)} aria-label="เติมข้อมูล"
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-orange-700 bg-orange-50 border border-orange-200">
                    <Pencil size={15} />
                  </button>
                )} />
            ))}
          </div>
        </div>
      </>)}
    </div>
  );
}
