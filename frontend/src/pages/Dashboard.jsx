import { useEffect, useState, useCallback } from 'react';
import { Users, Building2, GraduationCap, TrendingUp, Layers, CheckCircle, Clock, ArrowRight, Sparkles, UserPlus, ClipboardList } from 'lucide-react';
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
  { key: 'totalPersons', label: 'คนพิการทั้งหมด', icon: Users, chip: 'bg-orange-50', text: 'text-orange-600', ring: 'ring-orange-100' },
  { key: 'totalOrgs', label: 'สถานประกอบการ', icon: Building2, chip: 'bg-cyan-50', text: 'text-cyan-600', ring: 'ring-cyan-100' },
  { key: 'totalTraining', label: 'บันทึกการอบรม', icon: GraduationCap, chip: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
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
  const hasData = (stats.totalPersons || 0) > 0;

  return (
    <div className="space-y-6">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">ภาพรวมระบบฐานข้อมูลคนพิการ · โครงการฝึกอบรม-ฝึกงาน มจธ.</p>
        </div>
        <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-bold text-orange-600 shadow-sm">
          <img src="/logo-icon.png" className="h-4 w-4 object-contain" alt="" /> KMUTT
        </span>
      </div>

      {/* ═══ STAT CARDS ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map(({ key, label, icon: Icon, chip, text, ring }) => (
          <div key={key} className="group bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ring-1 ${chip} ${ring} group-hover:scale-105 transition-transform`}>
              <Icon size={22} className={text} />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-black text-gray-800 leading-none tracking-tight">{stats[key]}</p>
              <p className="text-gray-400 text-sm mt-1.5">{label}</p>
            </div>
          </div>
        ))}
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

      {/* ═══ EMPTY STATE — ยังไม่มีข้อมูล (แบบ onboarding) ═══ */}
      {!hasData && <EmptyDashboard onAdd={() => navigate('/persons')} onBatch={() => navigate('/batches')} />}

      {/* ═══ CHARTS — แสดงเมื่อมีข้อมูล ═══ */}
      {hasData && (<>
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
      </>)}
    </div>
  );
}

function EmptyDashboard({ onAdd, onBatch }) {
  const steps = [
    { icon: UserPlus, title: 'เพิ่มข้อมูลคนพิการ', desc: 'บันทึกประวัติ ความพิการ และข้อมูลติดต่อ' },
    { icon: Layers, title: 'สร้างรุ่นฝึกอบรม', desc: 'จัดกลุ่มผู้เข้าร่วมตามรุ่น พร้อมประเมินทักษะ' },
    { icon: ClipboardList, title: 'ออกรายงาน', desc: 'พิมพ์รายชื่อ ใบ Certificate และรายงานต่างๆ' },
  ];
  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm px-6 py-12 md:py-16 text-center">
      <div className="w-16 h-16 rounded-3xl bg-orange-50 ring-1 ring-orange-100 flex items-center justify-center mx-auto mb-5">
        <Sparkles size={28} className="text-orange-500" />
      </div>
      <h2 className="text-xl font-black text-gray-800 mb-2">เริ่มต้นใช้งานระบบ</h2>
      <p className="text-gray-400 text-sm max-w-md mx-auto mb-7 leading-relaxed">
        ยังไม่มีข้อมูลในระบบ — เพิ่มข้อมูลคนพิการและสร้างรุ่นฝึกอบรม แล้วสถิติและกราฟภาพรวมจะแสดงที่นี่โดยอัตโนมัติ
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
        <button onClick={onAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 active:scale-95 transition-all shadow-sm">
          <UserPlus size={16} /> เพิ่มข้อมูลคนพิการ
        </button>
        <button onClick={onBatch}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:border-orange-300 hover:text-orange-600 active:scale-95 transition-all">
          <Layers size={16} /> สร้างรุ่นฝึกอบรม
        </button>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 max-w-3xl mx-auto text-left">
        {steps.map(({ icon: Icon, title, desc }, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-orange-500" />
              </div>
              <span className="text-xs font-black text-gray-300">ขั้นที่ {i + 1}</span>
            </div>
            <p className="font-bold text-gray-700 text-sm mb-0.5">{title}</p>
            <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
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
