import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, Target, Building2, UserCog, LogOut, BookOpen, Printer, Menu, X, Sun, Moon, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const menu = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'ข้อมูลคนพิการ', icon: Users, path: '/persons' },
  { label: 'การอบรม & ฝึกงาน', icon: GraduationCap, path: '/training' },
  { label: 'ติดตามผล', icon: Target, path: '/followup' },
  { label: 'สถานประกอบการ', icon: Building2, path: '/organizations' },
  { label: 'จัดการรุ่น', icon: Layers, path: '/batches' },
  { label: 'ออกรายงาน', icon: Printer, path: '/report' },
  { label: 'คู่มือการใช้งาน', icon: BookOpen, path: '/help' },
];

const ROLE_LABEL = { ADMIN: 'ผู้ดูแลระบบ', STAFF: 'เจ้าหน้าที่', VIEWER: 'ผู้ดูข้อมูล' };
const ROLE_COLOR = { ADMIN: 'from-rose-400 to-red-500', STAFF: 'from-amber-300 to-orange-500', VIEWER: 'from-sky-300 to-cyan-500' };
const ROLE_BADGE = 'bg-white/20 text-white border-white/30';

// ไล่สีเข้มพรีเมียม + ลายจุดจางๆ + แสงเรืองมุมบน (รวมใน background เดียว — ปลอดภัย ไม่เพิ่ม DOM)
const SIDEBAR_BG = `
  radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0) 0 0 / 22px 22px,
  radial-gradient(130% 55% at 100% 0%, rgba(253,230,138,0.20), transparent 62%),
  linear-gradient(168deg,#7c2d12 0%,#9a3412 46%,#c2410c 100%)`;

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };
  const handleNav = (path) => { navigate(path); setOpen(false); };
  const initials = user?.name?.slice(0, 2) || 'U';

  const NavItem = ({ label, icon: Icon, path }) => {
    const active = location.pathname === path;
    return (
      <button onClick={() => handleNav(path)}
        className={`group relative w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-left transition-all duration-200
          ${active
            ? 'bg-white text-orange-600 shadow-lg shadow-orange-950/25'
            : 'text-white/80 hover:text-white hover:bg-white/12 hover:translate-x-0.5'}`}>
        {/* active accent bar */}
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full transition-all duration-200
          ${active ? 'h-6 bg-orange-500' : 'h-0 bg-transparent'}`} />
        <Icon size={17} className={`flex-shrink-0 transition-colors ${active ? 'text-orange-600' : 'text-white/60 group-hover:text-white'}`} />
        <span className={`text-sm flex-1 ${active ? 'font-bold' : 'font-normal'}`}>{label}</span>
      </button>
    );
  };

  return (
    <div className="flex min-h-screen">

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 shadow-sm print-hide"
        style={{
          background: SIDEBAR_BG,
          paddingTop: 'max(14px, env(safe-area-inset-top))',
          paddingBottom: '10px', paddingLeft: '16px', paddingRight: '16px',
        }}>
        <div className="flex items-center gap-3 h-10">
          <button onClick={() => setOpen(true)} className="text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-all active:scale-90">
            <Menu size={22} />
          </button>
          <img src="/logo-icon.png" alt="KMUTT" className="h-7 w-7 object-contain rounded-lg bg-white/10 p-0.5 flex-shrink-0" />
          <span className="text-white font-bold text-sm truncate flex-1">ระบบฐานข้อมูลคนพิการ มจธ.</span>
          <button onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'}
            className="text-white/60 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-all active:scale-90 flex-shrink-0">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* ── Backdrop ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed md:sticky md:top-0 md:h-screen inset-y-0 left-0 z-50 w-64 flex-shrink-0 flex flex-col
          border-r border-black/20 transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{ background: SIDEBAR_BG }}>

        {/* ── Logo ── */}
        <div className="px-4 pb-4 flex items-center gap-3 border-b border-white/15"
          style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-md flex-shrink-0">
            <img src="/logo-icon.png" alt="KMUTT" className="h-8 w-8 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-black text-sm leading-none tracking-tight">PWDs <span className="text-amber-200">KMUTT</span></p>
            <p className="text-white/70 text-[10px] font-medium leading-snug mt-1">ระบบฐานข้อมูลคนพิการ มจธ.</p>
          </div>
          <button onClick={() => setOpen(false)} className="md:hidden text-white/40 hover:text-white flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* ── Menu ── */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-white/60 text-[10px] font-bold tracking-[0.15em] px-4 mb-2 uppercase">เมนูหลัก</p>
          {menu.map((m) => <NavItem key={m.path} {...m} />)}

          {isAdmin && (
            <>
              <p className="text-white/60 text-[10px] font-bold tracking-[0.15em] px-4 mb-2 mt-4 uppercase">ผู้ดูแลระบบ</p>
              <NavItem label="จัดการผู้ใช้" icon={UserCog} path="/users" />
            </>
          )}
        </nav>

        {/* ── Theme Toggle ── */}
        <div className="px-4 py-2.5 border-t border-white/15 flex items-center justify-between">
          <span className="text-white/60 text-[10px] font-bold tracking-widest uppercase">
            {dark ? 'Dark Mode' : 'Light Mode'}
          </span>
          <button onClick={toggle} title={dark ? 'เปลี่ยนเป็น Light' : 'เปลี่ยนเป็น Dark'}
            className="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0"
            style={{ background: dark ? 'rgba(234,88,12,0.35)' : 'rgba(255,255,255,0.12)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center ${dark ? 'bg-orange-400' : 'bg-white/90'}`}
              style={{ left: dark ? '22px' : '2px' }}>
              {dark ? <Moon size={10} className="text-orange-950" /> : <Sun size={10} className="text-orange-600" />}
            </span>
          </button>
        </div>

        {/* ── User Card ── */}
        <div className="p-3 border-t border-white/15" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-white/15 border border-white/20">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${ROLE_COLOR[user?.role] || 'from-amber-300 to-orange-500'} flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold leading-none truncate">{user?.name}</p>
              <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${ROLE_BADGE}`}>
                {ROLE_LABEL[user?.role] || 'เจ้าหน้าที่'}
              </span>
            </div>
            <button onClick={handleLogout} title="ออกจากระบบ"
              className="text-white/70 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-white/15 flex-shrink-0">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto min-h-screen">
        <div className="md:hidden print-hide" style={{ height: 'calc(50px + max(14px, env(safe-area-inset-top)))' }} />
        <div className="p-4 md:p-7 page-fade" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
