import { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllFollowUp } from '../api';

const EMP = {
  EMPLOYED:   { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'มีงานทำ' },
  UNEMPLOYED: { bg: 'bg-gray-100 text-gray-500 border-gray-200',         label: 'ว่างงาน' },
  STUDYING:   { bg: 'bg-sky-100 text-sky-700 border-sky-200',            label: 'ศึกษาต่อ' },
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

export default function FollowUpList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllFollowUp().then(r => {
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
          <Target size={22} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-800 leading-tight">ติดตามผล</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            <span className="text-orange-600 font-bold">{rows.length}</span> รายการในระบบ
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-orange-100/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '760px' }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['วันที่ติดตาม', 'ชื่อ', 'สถานะงาน', 'ประเภทงาน', 'รายได้', 'ทักษะสอดคล้อง', 'ความพึงพอใจ', 'ปัญหา'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-300">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-3xl bg-orange-50 flex items-center justify-center">
                        <Target size={28} className="text-orange-200" />
                      </div>
                      <p className="text-sm font-medium">ไม่มีข้อมูลการติดตามผล</p>
                    </div>
                  </td>
                </tr>
              )}
              {rows.map((f, i) => {
                const e = EMP[f.employmentStatus] || EMP.UNEMPLOYED;
                return (
                  <tr key={f.id} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2.5 py-1 rounded-lg border border-orange-100">
                        {fmtDate(f.followUpDate) || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => navigate(`/persons/${f.personId}`)}
                        className="flex items-center gap-2.5 text-left group">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[i % 5]} text-white text-xs font-black flex items-center justify-center flex-shrink-0`}>
                          {f.personName?.slice(0, 2)}
                        </div>
                        <span className="font-semibold text-gray-800 text-sm group-hover:text-orange-600 transition-colors">{f.personName}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${e.bg}`}>{e.label}</span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-sm">{f.jobType || '—'}</td>
                    <td className="px-4 py-3.5 font-semibold text-gray-700 text-sm">
                      {f.income ? `฿${Number(f.income).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {f.skillMatch === 'MATCH' && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">ตรงสาย</span>}
                      {f.skillMatch === 'NOT_MATCH' && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">ไม่ตรง</span>}
                      {!f.skillMatch && <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-sm">{f.satisfaction || '—'}</td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs max-w-[140px] truncate">{f.issues || '—'}</td>
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
