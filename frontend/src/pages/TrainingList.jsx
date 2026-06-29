import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllTraining } from '../api';

const TYPE = {
  TRAIN: { bg: 'bg-amber-100 text-amber-700 border-amber-200',   label: 'อบรม' },
  LEARN: { bg: 'bg-cyan-100 text-cyan-700 border-cyan-200',      label: 'เรียนรู้' },
  EARN:  { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'ฝึกงาน' },
};

const AVATAR_COLORS = [
  'from-orange-500 to-red-500', 'from-cyan-500 to-blue-500',
  'from-emerald-500 to-teal-500', 'from-violet-500 to-purple-500',
  'from-pink-500 to-rose-500',
];

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
    <span className="text-gray-300 text-xs">→</span>
    <span className="bg-gray-50 text-gray-400 text-xs font-medium px-2 py-0.5 rounded-lg border border-gray-100">
      {fmtDate(end) || '—'}
    </span>
  </div>
);

export default function TrainingList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllTraining().then(r => {
      setRows(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        <span className="text-orange-400 text-sm">กำลังโหลด...</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
          <GraduationCap size={22} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-800 leading-tight">การอบรม & ฝึกงาน</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            <span className="text-orange-600 font-bold">{rows.length}</span> รายการในระบบ
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-orange-100/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '720px' }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['ชื่อ', 'หลักสูตร', 'หน่วยงาน', 'รูปแบบ', 'ช่วงเวลา', 'ทักษะที่ได้', 'ผลประเมิน'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-300">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-3xl bg-orange-50 flex items-center justify-center">
                        <GraduationCap size={28} className="text-orange-200" />
                      </div>
                      <p className="text-sm font-medium">ไม่มีข้อมูลการอบรม</p>
                    </div>
                  </td>
                </tr>
              )}
              {rows.map((t, i) => {
                const tp = TYPE[t.trainingType];
                return (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <button onClick={() => navigate(`/persons/${t.personId}`)}
                        className="flex items-center gap-2.5 text-left group">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[i % 5]} text-white text-xs font-black flex items-center justify-center flex-shrink-0`}>
                          {t.personName?.slice(0, 2)}
                        </div>
                        <span className="font-semibold text-gray-800 text-sm group-hover:text-orange-600 transition-colors">{t.personName}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-gray-800 max-w-[160px] truncate">{t.courseName}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-sm">{t.organizer || '—'}</td>
                    <td className="px-4 py-3.5">
                      {tp
                        ? <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${tp.bg}`}>{tp.label}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5"><DateRange start={t.startDate} end={t.endDate} /></td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs max-w-[140px] truncate">{t.skillsGained || '—'}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-sm">{t.evaluationResult || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
