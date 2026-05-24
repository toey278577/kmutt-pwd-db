import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPersons, getTraining } from '../api';

const TYPE = {
  TRAIN: { cls: 'badge-warning',  label: 'อบรม' },
  LEARN: { cls: 'badge-info',     label: 'เรียนรู้' },
  EARN:  { cls: 'badge-success',  label: 'ฝึกงาน' },
};

export default function TrainingList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPersons().then(async (r) => {
      const results = await Promise.all(
        r.data.map((p) =>
          getTraining(p.id).then((tr) =>
            tr.data.map((t) => ({ ...t, personName: p.fullName, personId: p.id }))
          )
        )
      );
      setRows(results.flat().sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0)));
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
            <GraduationCap size={22} color="white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="h-px w-5 bg-orange-400 rounded-full" />
              <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">ภาพรวม</span>
            </div>
            <h1 className="text-2xl font-extrabold text-orange-950 leading-tight">การอบรม & ฝึกงาน</h1>
            <p className="text-sm text-orange-400 font-semibold mt-0.5">{rows.length} รายการในระบบ</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr className="bg-orange-50 text-orange-600 text-xs uppercase tracking-wider">
              <th>ชื่อ</th>
              <th>หลักสูตร</th>
              <th>หน่วยงาน</th>
              <th>รูปแบบ</th>
              <th>ช่วงเวลา</th>
              <th>ทักษะที่ได้</th>
              <th>ผลประเมิน</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-14 text-gray-400">
                  <GraduationCap size={40} className="mx-auto mb-2 text-gray-200" />
                  ไม่มีข้อมูลการอบรม
                </td>
              </tr>
            )}
            {rows.map((t) => {
              const tp = TYPE[t.trainingType];
              return (
                <tr key={t.id} className="hover:bg-orange-50/40 transition-colors">
                  <td>
                    <button
                      onClick={() => navigate(`/persons/${t.personId}`)}
                      className="flex items-center gap-2.5 hover:underline text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {t.personName?.slice(0, 2)}
                      </div>
                      <span className="font-semibold text-orange-950 text-sm">{t.personName}</span>
                    </button>
                  </td>
                  <td className="font-semibold text-orange-950 text-sm">{t.courseName}</td>
                  <td className="text-sm text-gray-600">{t.organizer || '—'}</td>
                  <td>
                    {tp
                      ? <span className={`badge badge-sm font-semibold ${tp.cls}`}>{tp.label}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="text-xs text-gray-500">
                    <span className="bg-orange-50 text-orange-600 font-bold px-2 py-1 rounded-lg">
                      {t.startDate?.slice(0, 10) || '—'}
                    </span>
                    {t.endDate && <span className="ml-1">– {t.endDate.slice(0, 10)}</span>}
                  </td>
                  <td className="text-sm text-gray-600 max-w-xs truncate">{t.skillsGained || '—'}</td>
                  <td className="text-sm text-gray-600">{t.evaluationResult || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
