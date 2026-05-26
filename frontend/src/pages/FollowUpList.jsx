import { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPersons, getFollowUp } from '../api';

const EMP = {
  EMPLOYED:   { cls: 'badge-success',  label: 'มีงานทำ' },
  UNEMPLOYED: { cls: 'badge-ghost',    label: 'ว่างงาน' },
  STUDYING:   { cls: 'badge-info',     label: 'ศึกษาต่อ' },
};

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
    getPersons().then(async (r) => {
      const results = await Promise.all(
        r.data.map((p) => getFollowUp(p.id).then((fu) => fu.data.map((f) => ({ ...f, personName: p.fullName, personId: p.id }))))
      );
      setRows(results.flat().sort((a, b) => new Date(b.followUpDate) - new Date(a.followUpDate)));
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );

  return (
    <div>
      <div className="mb-7 rounded-2xl overflow-hidden relative shadow-md border border-orange-100"
        style={{ background: 'linear-gradient(135deg,#fff7ed 0%,#ffedd5 60%,#fed7aa 100%)' }}>
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle,#ea580c,transparent)' }} />
        <div className="absolute right-28 -bottom-8 w-32 h-32 rounded-full opacity-10"
          style={{ background: '#c2410c' }} />
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: 'linear-gradient(180deg,#ea580c,#fb923c)' }} />
        <div className="relative px-8 py-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>
            <Target size={22} color="white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="h-px w-5 bg-orange-400 rounded-full" />
              <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">ภาพรวม</span>
            </div>
            <h1 className="text-2xl font-extrabold text-orange-950 leading-tight">ติดตามผล</h1>
            <p className="text-sm text-orange-400 font-semibold mt-0.5">{rows.length} รายการในระบบ</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr className="bg-orange-50 text-orange-600 text-xs uppercase tracking-wider">
              <th>วันที่ติดตาม</th>
              <th>ชื่อ</th>
              <th>สถานะงาน</th>
              <th>ประเภทงาน</th>
              <th>รายได้</th>
              <th>ทักษะสอดคล้อง</th>
              <th>ความพึงพอใจ</th>
              <th>ปัญหา</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-14 text-gray-400">
                  <Target size={40} className="mx-auto mb-2 text-gray-200" />
                  ไม่มีข้อมูลการติดตามผล
                </td>
              </tr>
            )}
            {rows.map((f) => {
              const e = EMP[f.employmentStatus] || EMP.UNEMPLOYED;
              return (
                <tr key={f.id} className="hover:bg-orange-50/40 transition-colors">
                  <td>
                    <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2.5 py-1 rounded-lg">
                      {fmtDate(f.followUpDate) || '—'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => navigate(`/persons/${f.personId}`)}
                      className="flex items-center gap-2.5 hover:underline text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {f.personName?.slice(0, 2)}
                      </div>
                      <span className="font-semibold text-orange-950 text-sm">{f.personName}</span>
                    </button>
                  </td>
                  <td>
                    <span className={`badge badge-sm font-semibold ${e.cls}`}>{e.label}</span>
                  </td>
                  <td className="text-sm text-gray-600">{f.jobType || '—'}</td>
                  <td className="text-sm font-semibold text-gray-700">
                    {f.income ? `฿${Number(f.income).toLocaleString()}` : '—'}
                  </td>
                  <td>
                    {f.skillMatch === 'MATCH' && <span className="badge badge-sm badge-success font-semibold">ตรง</span>}
                    {f.skillMatch === 'NOT_MATCH' && <span className="badge badge-sm badge-error font-semibold">ไม่ตรง</span>}
                    {!f.skillMatch && <span className="text-gray-300">—</span>}
                  </td>
                  <td className="text-sm text-gray-600">{f.satisfaction || '—'}</td>
                  <td className="text-sm text-gray-600 max-w-xs truncate">{f.issues || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
