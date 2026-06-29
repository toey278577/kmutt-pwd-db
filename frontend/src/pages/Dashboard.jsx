import { useEffect, useState, useCallback } from 'react';
import { Users, Building2, GraduationCap, TrendingUp, Layers, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar,
  XAxis, YAxis, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getBatches } from '../api';

const COLORS = ['#ea580c', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#f97316'];
const GENDER_LABELS = { MALE: 'ชาย', FEMALE: 'หญิง', OTHER: 'อื่นๆ' };
const EMP_LABELS = { EMPLOYED: 'มีงานทำ', UNEMPLOYED: 'ว่างงาน', STUDYING: 'ศึกษาต่อ' };

const statCards = [
  { key: 'totalPersons', label: 'คนพิการทั้งหมด', icon: Users, gradient: 'from-orange-500 to-red-500', glow: 'shadow-orange-200', bg: 'bg-orange-50', text: 'text-orange-600' },
  { key: 'totalOrgs', label: 'สถานประกอบการ', icon: Building2, gradient: 'from-cyan-500 to-blue-500', glow: 'shadow-cyan-200', bg: 'bg-cyan-50', text: 'text-cyan-600' },
  { key: 'totalTraining', label: 'บันทึกการอบรม', icon: GraduationCap, gradient: 'from-emerald-500 to-teal-500', glow: 'shadow-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-600' },
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/90 backdrop-blur-sm text-white px-3 py-2 rounded-xl text-xs shadow-2xl border border-white/10">
      <b>{payload[0].name}</b>: {payload[0].value}
    </div>
  );
};

const RADIAN = Math.PI / 180;
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="700">{`${(percent*100).toFixed(0)}%`}</text>;
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setError(false);
    getDashboardStats().then(r => setStats(r.data)).catch(() => setError(true));
    getBatches().then(r => setBatches(r.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <p className="text-gray-500 text-sm">โหลดข้อมูลไม่สำเร็จ</p>
      <button onClick={load} className="px-4 py-2 rounded-xl text-white text-sm font-bold"
        style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }}>ลองใหม่</button>
    </div>
  );

  if (!stats) return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl animate-pulse" style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }} />
        <span className="text-orange-400 text-sm font-semibold">กำลังโหลด...</span>
      </div>
    </div>
  );

  const genderData = stats.byGender.map(g => ({ ...g, name: GENDER_LABELS[g.name] || g.name }));
  const empData = stats.byEmployment.map(e => ({ ...e, name: EMP_LABELS[e.name] || e.name }));

  return (
    <div className="space-y-6">

      {/* ═══ HERO BANNER ═══ */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8"
        style={{ background: 'linear-gradient(135deg,#431407 0%,#9a3412 50%,#ea580c 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle,#fb923c,transparent)' }} />
        <div className="absolute -bottom-10 left-20 w-48 h-48 rounded-full opacity-15 blur-2xl" style={{ background: 'radial-gradient(circle,#fbbf24,transparent)' }} />
        <div className="absolute top-0 right-0 w-full h-full opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative flex items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-orange-200 text-xs font-bold tracking-widest uppercase border border-white/10">
                KMUTT · มจธ.
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-1">
              ระบบฐานข้อมูลคนพิการ
            </h1>
            <p className="text-orange-200/70 text-sm font-medium">
              โครงการฝึกอบรม-ฝึกงาน เพื่อเตรียมความพร้อมเข้าสู่สถานประกอบการ
            </p>
          </div>
          <img src="/logo.jpg" alt="KMUTT"
            className="h-16 md:h-20 object-contain opacity-90 flex-shrink-0 drop-shadow-2xl" />
        </div>

        {/* Mini stat strip */}
        <div className="relative mt-5 grid grid-cols-3 gap-3">
          {statCards.map(({ key, label, icon: Icon }) => (
            <div key={key} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-3 flex items-center gap-3">
              <Icon size={18} className="text-orange-200 flex-shrink-0" />
              <div>
                <p className="text-white text-xl font-black leading-none">{stats[key]}</p>
                <p className="text-orange-200/70 text-xs mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ BATCH STATUS ═══ */}
      {batches.length > 0 && (
        <div className="bg-white rounded-3xl border border-orange-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-orange-50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" style={{ boxShadow: '0 0 6px #ea580c' }} />
              <span className="font-bold text-gray-800 text-sm">สถานะรุ่นการฝึกอบรม</span>
            </div>
            <button onClick={() => navigate('/batches')}
              className="text-xs text-orange-500 font-semibold flex items-center gap-1 hover:text-orange-700 transition-colors">
              จัดการรุ่น <ArrowRight size={12} />
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {batches.slice(0, 4).map(b => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/40 transition-all">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${b.status === 'ACTIVE' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  {b.status === 'ACTIVE'
                    ? <CheckCircle size={16} className="text-emerald-600" />
                    : <Clock size={16} className="text-gray-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">รุ่นที่ {b.batchNumber} ปี พ.ศ. {b.year}</p>
                  <p className="text-xs text-gray-400 truncate">{b.courseName}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${b.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                  {b.status === 'ACTIVE' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ CHART ROW 1 ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <GlassChart title="แยกตามเพศ" accent="#ea580c">
          {genderData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={75} innerRadius={35} paddingAngle={4} labelLine={false} label={renderLabel}>
                  {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </GlassChart>

        <GlassChart title="ประเภทความพิการ" accent="#06b6d4">
          {stats.byDisabilityType.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.byDisabilityType} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={75} innerRadius={35} paddingAngle={4} labelLine={false} label={renderLabel}>
                  {stats.byDisabilityType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.68rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </GlassChart>

        <GlassChart title="สถานะการมีงานทำ" accent="#10b981">
          {empData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={empData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(234,88,12,0.05)', radius: 8 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {empData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </GlassChart>
      </div>

      {/* ═══ CHART ROW 2 ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <GlassChart title="วุฒิการศึกษา" accent="#f59e0b">
          {stats.byEducation?.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={stats.byEducation} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={75} innerRadius={35} paddingAngle={4} labelLine={false} label={renderLabel}>
                  {stats.byEducation.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.68rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </GlassChart>

        <GlassChart title="ช่วงอายุ" accent="#8b5cf6">
          {stats.byAgeGroup?.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={stats.byAgeGroup} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={75} innerRadius={35} paddingAngle={4} labelLine={false} label={renderLabel}>
                  {stats.byAgeGroup.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </GlassChart>

        <GlassChart title="ภูมิภาค" accent="#ec4899">
          {stats.byRegion?.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={stats.byRegion} barSize={16} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={75} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(234,88,12,0.05)' }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {stats.byRegion.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </GlassChart>
      </div>
    </div>
  );
}

function GlassChart({ title, accent, children }) {
  return (
    <div className="bg-white rounded-3xl overflow-hidden chart-card">
      <div className="px-5 pt-4 pb-3 flex items-center gap-2 chart-card-header">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
        <span className="font-bold text-gray-800 text-sm">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-48 flex flex-col items-center justify-center gap-2">
      <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
        <TrendingUp size={18} className="text-orange-200" />
      </div>
      <p className="text-gray-300 text-xs">ยังไม่มีข้อมูล</p>
    </div>
  );
}
