import { useEffect, useState } from 'react';
import { GraduationCap, Layers, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoadError from '../components/LoadError';
import { getAllTraining, getBatchEnrollments } from '../api';
import MobileCard from '../components/MobileCard';

const TYPE = {
  TRAIN: { bg: 'bg-amber-100 text-amber-700 border-amber-200',   label: 'อบรม' },
  LEARN: { bg: 'bg-cyan-100 text-cyan-700 border-cyan-200',      label: 'เรียนรู้' },
  EARN:  { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'ฝึกงาน' },
};


const fmtDate = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${parseInt(y) + 543}`;
};

const DateRange = ({ start, end }) => (
  <div className="flex items-center gap-1.5 whitespace-nowrap">
    <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-lg border border-orange-100">
      {fmtDate(start) || '—'}
    </span>
    <span className="text-gray-400 text-xs">→</span>
    <span className="bg-gray-50 text-gray-400 text-xs font-medium px-2 py-0.5 rounded-lg border border-gray-100">
      {fmtDate(end) || '—'}
    </span>
  </div>
);

const th = 'px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide';

// ชื่อในตาราง — กดทั้งแถวได้ (onClick ที่ tr.row-link) · ปุ่มไว้ให้กด Tab มาถึงด้วยคีย์บอร์ด
function PersonCell({ name }) {
  return <button type="button" className="row-link-name font-semibold text-gray-800 text-sm text-left">{name}</button>;
}

function EmptyRow({ cols, text }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center py-16 text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-3xl bg-orange-50 flex items-center justify-center">
            <GraduationCap size={28} className="text-orange-200" />
          </div>
          <p className="text-sm font-medium">{text}</p>
        </div>
      </td>
    </tr>
  );
}

function MobileEmpty({ text }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 px-6 text-center text-gray-400">
      <div className="w-16 h-16 rounded-3xl bg-orange-50 flex items-center justify-center">
        <GraduationCap size={28} className="text-orange-200" />
      </div>
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}
const rangeText = (start, end) => (start || end ? `${fmtDate(start) || '—'} → ${fmtDate(end) || '—'}` : '');

// คะแนนก่อน → หลังอบรม (ถ้าบันทึกไว้ในแท็บประเมินทักษะ)
function ScoreCell({ pre, post }) {
  if (pre == null && post == null) return <span className="text-gray-400">—</span>;
  const up = pre != null && post != null ? post - pre : null;
  return (
    <span className="whitespace-nowrap text-sm text-gray-700">
      {pre ?? '—'} <span className="text-gray-400">→</span> <span className="font-bold">{post ?? '—'}</span>
      {up != null && up !== 0 && (
        <span className={`ml-1.5 text-xs font-bold ${up > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{up > 0 ? `+${up}` : up}</span>
      )}
    </span>
  );
}

export default function TrainingList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);           // ประวัติอบรมรายคน
  const [enrolls, setEnrolls] = useState([]);     // คนในรุ่นอบรม
  const [tab, setTab] = useState('batch');
  const [batchFilter, setBatchFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = () => Promise.all([getBatchEnrollments(), getAllTraining()])
    .then(([e, r]) => {
      setEnrolls(e.data);
      setRows(r.data);
      // เปิดแท็บที่มีข้อมูลก่อน (ระบบเดิมบางแห่งยังไม่ใช้รุ่น)
      if (e.data.length === 0 && r.data.length > 0) setTab('records');
      setLoading(false);
    })
    .catch(() => { setLoadError(true); setLoading(false); });   // เดิมไม่มี catch → โหลดพังแล้วหมุนค้างตลอด
  useEffect(() => { load(); }, []);
  const retry = () => { setLoadError(false); setLoading(true); load(); };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        <span className="text-orange-400 text-sm">กำลังโหลด...</span>
      </div>
    </div>
  );

  if (loadError) return <LoadError onRetry={retry} />;

  // รายชื่อรุ่นสำหรับตัวกรอง (เรียงใหม่สุดก่อน ตามที่หลังบ้านส่งมา)
  const batchOptions = [...new Map(enrolls.map((e) => [e.batchId, e])).values()];
  const shownEnrolls = batchFilter ? enrolls.filter((e) => String(e.batchId) === batchFilter) : enrolls;

  const tabBtn = (id, label, count) => (
    <button onClick={() => setTab(id)}
      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === id ? 'bg-orange-600 text-white shadow-sm' : 'bg-white text-gray-500 border border-orange-100 hover:text-orange-600 hover:border-orange-200'}`}>
      {label} <span className={`ml-1 text-xs ${tab === id ? 'text-white/80' : 'text-gray-400'}`}>({count})</span>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
          <GraduationCap size={22} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-black page-title leading-tight">การอบรม & ฝึกงาน</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            ผู้เข้าอบรมตามรุ่น <span className="text-orange-600 font-bold">{enrolls.length}</span> คน
            · ประวัติอบรมรายคน <span className="text-orange-600 font-bold">{rows.length}</span> รายการ
          </p>
        </div>
      </div>

      {/* Tabs + ตัวกรองรุ่น */}
      <div className="flex flex-wrap items-center gap-2">
        {tabBtn('batch', 'ตามรุ่นอบรม', enrolls.length)}
        {tabBtn('records', 'ประวัติอบรมรายคน', rows.length)}
        {tab === 'batch' && batchOptions.length > 1 && (
          <div className="relative ml-auto">
            <Layers size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none" />
            <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}
              className="appearance-none text-sm font-semibold rounded-xl border border-orange-200 bg-white text-gray-700 pl-8 pr-9 py-2 hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 cursor-pointer transition-all">
              <option value="">ทุกรุ่น</option>
              {batchOptions.map((b) => <option key={b.batchId} value={String(b.batchId)}>รุ่นที่ {b.batchNumber}/{b.year}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* จอคอม = ตาราง · มือถือ = การ์ด (เดิมตาราง 6-7 คอลัมน์ต้องเลื่อนข้าง) */}
      <div className="bg-white rounded-3xl border border-orange-100/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto hidden md:block">
          {tab === 'batch' ? (
            <table className="w-full text-sm" style={{ minWidth: '760px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['ชื่อ', 'รุ่น', 'หลักสูตร', 'ช่วงเวลา', 'สถานะรุ่น', 'คะแนน ก่อน → หลัง'].map((h) => <th key={h} className={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {shownEnrolls.length === 0 && <EmptyRow cols={6} text="ยังไม่มีคนในรุ่นอบรม — เลือกรุ่นได้ที่ฟอร์มข้อมูลคนพิการ" />}
                {shownEnrolls.map((e) => (
                  <tr key={e.personId} className="row-link border-b border-gray-50" title="กดเพื่อดูรายละเอียด" onClick={() => navigate(`/persons/${e.personId}`)}>
                    <td className="px-4 py-3.5"><PersonCell name={e.personName} /></td>
                    <td className="px-4 py-3.5 font-bold text-gray-700 whitespace-nowrap">รุ่นที่ {e.batchNumber}/{e.year}</td>
                    <td className="px-4 py-3.5 text-gray-600 max-w-[220px]">
                      <p className="font-semibold text-gray-800 truncate">{e.course || '—'}</p>
                      <p className="text-xs text-gray-400 truncate">{e.program}</p>
                    </td>
                    <td className="px-4 py-3.5"><DateRange start={e.startDate} end={e.endDate} /></td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${e.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {e.status === 'ACTIVE' ? 'กำลังอบรม' : 'จบแล้ว'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5"><ScoreCell pre={e.preTestScore} post={e.postTestScore} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm" style={{ minWidth: '720px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['ชื่อ', 'หลักสูตร', 'หน่วยงาน', 'รูปแบบ', 'ช่วงเวลา', 'ทักษะที่ได้', 'ผลประเมิน'].map((h) => <th key={h} className={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <EmptyRow cols={7} text={'ไม่มีประวัติอบรมรายคน — เพิ่มได้ที่แท็บ "การอบรม" ในหน้ารายละเอียดคนพิการ'} />}
                {rows.map((t) => {
                  const tp = TYPE[t.trainingType];
                  return (
                    <tr key={t.id} className="row-link border-b border-gray-50" title="กดเพื่อดูรายละเอียด" onClick={() => navigate(`/persons/${t.personId}`)}>
                      <td className="px-4 py-3.5"><PersonCell name={t.personName} /></td>
                      <td className="px-4 py-3.5 font-semibold text-gray-800 max-w-[160px] truncate">{t.courseName}</td>
                      <td className="px-4 py-3.5 text-gray-500 text-sm">{t.organizer || '—'}</td>
                      <td className="px-4 py-3.5">
                        {tp
                          ? <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${tp.bg}`}>{tp.label}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5"><DateRange start={t.startDate} end={t.endDate} /></td>
                      <td className="px-4 py-3.5 text-gray-400 text-xs max-w-[140px] truncate">{t.skillsGained || '—'}</td>
                      <td className="px-4 py-3.5 text-gray-500 text-sm">{t.evaluationResult || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="md:hidden divide-y divide-gray-100">
          {tab === 'batch' ? <>
            {shownEnrolls.length === 0 && <MobileEmpty text="ยังไม่มีคนในรุ่นอบรม — เลือกรุ่นได้ที่ฟอร์มข้อมูลคนพิการ" />}
            {shownEnrolls.map((e) => (
              <MobileCard key={e.personId} onClick={() => navigate(`/persons/${e.personId}`)}
                title={e.personName}
                subtitle={[e.course, e.program].filter(Boolean).join(' · ')}
                chips={<>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">รุ่น {e.batchNumber}/{e.year}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap ${e.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {e.status === 'ACTIVE' ? 'กำลังอบรม' : 'จบแล้ว'}
                  </span>
                </>}
                details={[
                  ['ช่วงเวลา', rangeText(e.startDate, e.endDate)],
                  ['คะแนน', e.preTestScore != null || e.postTestScore != null ? <ScoreCell pre={e.preTestScore} post={e.postTestScore} /> : ''],
                ]} />
            ))}
          </> : <>
            {rows.length === 0 && <MobileEmpty text={'ไม่มีประวัติอบรมรายคน — เพิ่มได้ที่แท็บ "การอบรม" ในหน้ารายละเอียดคนพิการ'} />}
            {rows.map((t) => {
              const tp = TYPE[t.trainingType];
              return (
                <MobileCard key={t.id} onClick={() => navigate(`/persons/${t.personId}`)}
                  title={t.personName}
                  subtitle={t.courseName}
                  chips={tp && <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${tp.bg}`}>{tp.label}</span>}
                  details={[
                    ['ช่วงเวลา', rangeText(t.startDate, t.endDate)],
                    ['หน่วยงาน', t.organizer],
                    ['ทักษะที่ได้', t.skillsGained],
                    ['ผลประเมิน', t.evaluationResult],
                  ]} />
              );
            })}
          </>}
        </div>
      </div>
    </div>
  );
}
