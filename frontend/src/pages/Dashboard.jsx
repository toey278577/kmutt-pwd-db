import { useEffect, useState } from 'react';
import { Users, Building2, GraduationCap, TrendingUp } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar,
  XAxis, YAxis, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { getDashboardStats } from '../api';

const COLORS = ['#ea580c', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const GENDER_LABELS = { MALE: 'ชาย', FEMALE: 'หญิง', OTHER: 'อื่นๆ' };
const EMP_LABELS = { EMPLOYED: 'มีงานทำ', UNEMPLOYED: 'ว่างงาน', STUDYING: 'ศึกษาต่อ' };

const statCards = [
  { key: 'totalPersons', label: 'คนพิการทั้งหมด', icon: Users, from: '#ea580c', to: '#c2410c' },
  { key: 'totalOrgs', label: 'สถานประกอบการ', icon: Building2, from: '#0891b2', to: '#0284c7' },
  { key: 'totalTraining', label: 'บันทึกการอบรม', icon: GraduationCap, from: '#059669', to: '#047857' },
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-orange-950 text-white px-3 py-2 rounded-xl text-xs shadow-xl">
      <b>{payload[0].name}</b>: {payload[0].value}
    </div>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getDashboardStats().then((r) => setStats(r.data));
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const genderData = stats.byGender.map((g) => ({ ...g, name: GENDER_LABELS[g.name] || g.name }));
  const empData = stats.byEmployment.map((e) => ({ ...e, name: EMP_LABELS[e.name] || e.name }));

  return (
    <div>
      {/* Hero Banner */}
      <div className="mb-7 rounded-2xl overflow-hidden relative shadow-md border border-orange-100"
        style={{ background: 'linear-gradient(135deg,#fff7ed 0%,#ffedd5 60%,#fed7aa 100%)' }}>
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle,#ea580c,transparent)' }} />
        <div className="absolute right-28 -bottom-8 w-32 h-32 rounded-full opacity-10"
          style={{ background: '#c2410c' }} />
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: 'linear-gradient(180deg,#ea580c,#fb923c)' }} />
        <div className="relative px-8 py-6 flex items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px w-6 bg-orange-400 rounded-full" />
              <span className="text-orange-500 text-[11px] font-bold tracking-widest uppercase">King Mongkut's University of Technology Thonburi</span>
            </div>
            <h1 className="text-2xl font-extrabold text-orange-950 leading-tight">ระบบฐานข้อมูลคนพิการ</h1>
            <p className="text-sm text-orange-700/60 mt-1 font-medium">โครงการฝึกอบรม-ฝึกงาน มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี</p>
          </div>
          <img src="/logo.jpg" alt="KMUTT" className="h-16 object-contain opacity-90 flex-shrink-0 relative" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-7">
        {statCards.map(({ key, label, icon: Icon, from, to }) => (
          <div key={key} className="rounded-2xl p-5 relative overflow-hidden shadow-lg"
            style={{ background: `linear-gradient(135deg,${from},${to})` }}>
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 right-8 w-16 h-16 rounded-full bg-white/5" />
            <div className="flex items-start justify-between relative">
              <div>
                <p className="text-white/70 text-xs font-medium mb-1">{label}</p>
                <p className="text-white text-4xl font-black">{stats[key]}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon size={22} color="#fff" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 relative">
              <TrendingUp size={13} color="rgba(255,255,255,0.6)" />
              <span className="text-white/60 text-xs">ข้อมูลล่าสุด</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Gender */}
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#ea580c,#fb923c)' }} />
            <span className="font-bold text-orange-950 text-sm">แยกตามเพศ</span>
          </div>
          {genderData.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={72} innerRadius={32} paddingAngle={3}>
                  {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.78rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Disability Type */}
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#06b6d4,#0284c7)' }} />
            <span className="font-bold text-orange-950 text-sm">ประเภทความพิการ</span>
          </div>
          {stats.byDisabilityType.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={stats.byDisabilityType} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={72} innerRadius={32} paddingAngle={3}>
                  {stats.byDisabilityType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.72rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Employment */}
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#10b981,#059669)' }} />
            <span className="font-bold text-orange-950 text-sm">สถานะการมีงานทำ</span>
          </div>
          {empData.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={empData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fff7ed" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(234,88,12,0.04)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {empData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-52 flex flex-col items-center justify-center gap-2">
      <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
        <TrendingUp size={20} className="text-orange-200" />
      </div>
      <p className="text-slate-400 text-xs">ยังไม่มีข้อมูล</p>
    </div>
  );
}
