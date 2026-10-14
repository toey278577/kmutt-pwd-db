import { useNavigate } from 'react-router-dom';
import { BellRing, Phone, ArrowRight, AlertTriangle, PartyPopper } from 'lucide-react';

// รายชื่อคนที่ถึงรอบติดตามผล (3 เดือน / 6 เดือน / 1 ปี หลังจบรุ่น)
// ใช้ 2 ที่: Dashboard (limit=5 + ปุ่มดูทั้งหมด) และหน้าติดตามผล (แสดงทั้งหมด)

const ROUND_LABEL = { 3: '3 เดือน', 6: '6 เดือน', 12: '1 ปี' };
const ROUND_SHORT = { 3: '3ด', 6: '6ด', 12: '1ปี' };
const ROUND_STATE = {
  done:    { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', title: 'ติดตามแล้ว' },
  missed:  { cls: 'bg-gray-100 text-gray-400 border-gray-200 line-through', title: 'ขาด (เลยช่วงไปแล้ว)' },
  current: { cls: 'bg-orange-50 text-orange-600 border-orange-300 ring-1 ring-orange-200', title: 'รอบนี้' },
  future:  { cls: 'bg-white text-gray-300 border-gray-100', title: 'ยังไม่ถึง' },
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${parseInt(y) + 543}`;
};

function StatusPill({ status, daysLeft }) {
  if (status === 'upcoming') {
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-amber-100 text-amber-700 border-amber-200 whitespace-nowrap">อีก {daysLeft} วัน</span>;
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-red-100 text-red-700 border-red-200 whitespace-nowrap">
      {daysLeft === 0 ? 'ครบกำหนดวันนี้' : `เลยกำหนด ${-daysLeft} วัน`}
    </span>
  );
}

export default function FollowUpDue({ data, limit, onViewAll }) {
  const navigate = useNavigate();
  const { items = [], summary = { overdue: 0, upcoming: 0 }, noEndDateBatches = [] } = data || {};
  const shown = limit ? items.slice(0, limit) : items;

  return (
    <div className="bg-white rounded-3xl border border-orange-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex flex-wrap items-center justify-between gap-2 border-b border-orange-50">
        <div className="flex items-center gap-2 flex-wrap">
          <BellRing size={16} className="text-orange-500" />
          <span className="font-bold text-gray-800 text-sm">ถึงรอบติดตามผล</span>
          <span className="text-xs text-gray-400">(3 เดือน / 6 เดือน / 1 ปี หลังจบรุ่น)</span>
          {summary.overdue > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">เลยกำหนด {summary.overdue}</span>}
          {summary.upcoming > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">ใกล้ถึง {summary.upcoming}</span>}
        </div>
        {onViewAll && items.length > 0 && (
          <button onClick={onViewAll}
            className="text-xs text-orange-500 font-semibold flex items-center gap-1 hover:text-orange-700 transition-colors">
            ดูทั้งหมด{items.length > shown.length ? ` (${items.length})` : ''} <ArrowRight size={12} />
          </button>
        )}
      </div>

      {/* รุ่นที่จบแล้วแต่ยังไม่ใส่วันสิ้นสุด */}
      {noEndDateBatches.length > 0 && (
        <div className="mx-4 mt-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5 text-amber-500" />
          <div className="flex-1">
            <span className="font-bold">
              {noEndDateBatches.map((b) => `รุ่นที่ ${b.batchNumber}/${b.year} (${b.persons} คน)`).join(', ')}
            </span>{' '}
            ยังไม่ได้ใส่วันสิ้นสุดอบรม ระบบเลยคำนวณรอบติดตามผลให้ไม่ได้
            <button onClick={() => navigate('/batches')} className="ml-1 font-bold text-orange-600 hover:underline">ไปใส่ที่หน้าจัดการรุ่น →</button>
          </div>
        </div>
      )}

      {/* รายชื่อ */}
      {shown.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
          <PartyPopper size={18} className="text-emerald-400" /> ไม่มีใครค้างติดตามผลตอนนี้
        </div>
      ) : (
        <div className="p-3 space-y-2">
          {shown.map((it) => (
            <div key={it.personId}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 rounded-2xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/40 transition-all">
              {/* ชื่อ + รุ่น */}
              <button onClick={() => navigate(`/persons/${it.personId}`)} className="text-left min-w-[180px] flex-1 group">
                <p className="text-sm font-bold text-gray-800 group-hover:text-orange-600 transition-colors">
                  {it.fullName}{it.nickname ? <span className="font-normal text-gray-400"> ({it.nickname})</span> : null}
                </p>
                <p className="text-xs text-gray-400">รุ่นที่ {it.batch.batchNumber}/{it.batch.year} · จบ {fmtDate(it.batch.endDate)}</p>
              </button>

              {/* รอบ + ความคืบหน้า */}
              <div className="flex items-center gap-2">
                <div className="sm:text-right">
                  <p className="text-xs font-bold text-gray-700 whitespace-nowrap">รอบ {ROUND_LABEL[it.round]}</p>
                  <p className="text-[11px] text-gray-400 whitespace-nowrap">กำหนด {fmtDate(it.dueDate)}</p>
                </div>
                <div className="flex gap-1">
                  {it.rounds.map((r) => (
                    <span key={r.months} title={`รอบ ${ROUND_LABEL[r.months]}: ${ROUND_STATE[r.state].title}`}
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${ROUND_STATE[r.state].cls}`}>
                      {ROUND_SHORT[r.months]}
                    </span>
                  ))}
                </div>
              </div>

              {/* สถานะ + โทร */}
              <div className="flex items-center gap-2 ml-auto">
                <StatusPill status={it.status} daysLeft={it.daysLeft} />
                {it.phone ? (
                  <a href={`tel:${it.phone.replace(/[^\d+]/g, '')}`} title={`โทร ${it.phone}`}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-all whitespace-nowrap">
                    <Phone size={12} /> {it.phone}
                  </a>
                ) : (
                  <span className="text-xs text-gray-300 whitespace-nowrap">ไม่มีเบอร์</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
