import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, Target, Building2, UserCog, LogOut, Shield, Eye, BookOpen, Printer, Menu, X, ChevronRight, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const menu = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'ข้อมูลคนพิการ', icon: Users, path: '/persons' },
  { label: 'การอบรม & ฝึกงาน', icon: GraduationCap, path: '/training' },
  { label: 'ติดตามผล', icon: Target, path: '/followup' },
  { label: 'สถานประกอบการ', icon: Building2, path: '/organizations' },
  { label: 'ออกรายงาน', icon: Printer, path: '/report' },
  { label: 'คู่มือการใช้งาน', icon: BookOpen, path: '/help' },
];

const ROLE_LABEL = { ADMIN: 'ผู้ดูแลระบบ', STAFF: 'เจ้าหน้าที่', VIEWER: 'ผู้ดูข้อมูล' };
const ROLE_COLOR = { ADMIN: 'from-red-400 to-orange-500', STAFF: 'from-orange-400 to-amber-500', VIEWER: 'from-sky-400 to-cyan-500' };
const ROLE_BADGE = { ADMIN: 'bg-red-500/20 text-red-200 border-red-500/30', STAFF: 'bg-orange-500/20 text-orange-200 border-orange-500/30', VIEWER: 'bg-sky-500/20 text-sky-200 border-sky-500/30' };

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };
  const handleNav = (path) => { navigate(path); setOpen(false); };

  const initials = user?.name?.slice(0, 2) || 'U';

  return (
    <div className="flex min-h-screen bg-orange-50/50">

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 shadow-lg print-hide"
        style={{
          background: 'linear-gradient(135deg,#1c0a00 0%,#7c2d12 100%)',
          paddingTop: 'max(14px, env(safe-area-inset-top))',
          paddingBottom: '10px',
          paddingLeft: '16px',
          paddingRight: '16px',
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
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed md:sticky md:top-0 md:h-screen inset-y-0 left-0 z-50 w-64 flex-shrink-0 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{ background: 'linear-gradient(180deg,#1c0a00 0%,#431407 40%,#7c2d12 100%)' }}>

        {/* Glow blob */}
        <div className="absolute top-0 left-0 w-full h-64 pointer-events-none overflow-hidden rounded-none">
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle,#ea580c,transparent)' }} />
        </div>

        {/* ── Logo ── */}
        <div className="relative px-4 pb-4 flex items-center gap-3 border-b border-white/5"
          style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-lg flex-shrink-0">
              <img src="/logo-icon.png" alt="KMUTT" className="h-8 w-8 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-orange-400 font-black text-sm leading-none tracking-tight">PWDs</p>
              <p className="text-orange-200/50 text-[10px] font-medium leading-snug mt-0.5">ระบบฐานข้อมูลคนพิการ<br/>มจธ.</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="md:hidden text-white/40 hover:text-white flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* ── Menu ── */}
        <nav className="relative flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-orange-500/60 text-[10px] font-bold tracking-[0.15em] px-3 mb-3 uppercase">เมนูหลัก</p>
          {menu.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path;
            return (
              <button key={path} onClick={() => handleNav(path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-200 group relative
                  ${active
                    ? 'text-white'
                    : 'text-orange-200/50 hover:text-orange-100 hover:bg-white/5'
                  }`}
                style={active ? { background: 'linear-gradient(135deg,rgba(234,88,12,0.3),rgba(194,65,12,0.2))', boxShadow: 'inset 0 0 0 1px rgba(251,146,60,0.2)' } : {}}>

                {active && (
                  <div className="absolute inset-0 rounded-2xl blur-sm opacity-30"
                    style={{ background: 'linear-gradient(135deg,#ea580c,#c2410c)' }} />
                )}
                <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${active ? 'text-orange-300' : 'text-orange-400/50 group-hover:text-orange-300'}`}
                  style={active ? { background: 'rgba(234,88,12,0.25)' } : {}}>
                  <Icon size={16} />
                </div>
                <span className={`relative text-sm flex-1 ${active ? 'font-bold' : 'font-normal'}`}>{label}</span>
                {active && <ChevronRight size={14} className="relative text-orange-400 flex-shrink-0" />}
              </button>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-3 pb-1">
                <p className="text-orange-500/60 text-[10px] font-bold tracking-[0.15em] px-3 uppercase">ผู้ดูแลระบบ</p>
              </div>
              <button onClick={() => handleNav('/users')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-200 group relative
                  ${location.pathname === '/users' ? 'text-white' : 'text-orange-200/50 hover:text-orange-100 hover:bg-white/5'}`}
                style={location.pathname === '/users' ? { background: 'linear-gradient(135deg,rgba(234,88,12,0.3),rgba(194,65,12,0.2))', boxShadow: 'inset 0 0 0 1px rgba(251,146,60,0.2)' } : {}}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${location.pathname === '/users' ? 'text-orange-300' : 'text-orange-400/50 group-hover:text-orange-300'}`}
                  style={location.pathname === '/users' ? { background: 'rgba(234,88,12,0.25)' } : {}}>
                  <UserCog size={16} />
                </div>
                <span className={`text-sm flex-1 ${location.pathname === '/users' ? 'font-bold' : 'font-normal'}`}>จัดการผู้ใช้</span>
                {location.pathname === '/users' && <ChevronRight size={14} className="text-orange-400" />}
              </button>
            </>
          )}
        </nav>

        {/* ── Theme Toggle ── */}
        <div className="relative px-4 py-2.5 border-t border-white/5 flex items-center justify-between">
          <span className="text-orange-200/40 text-[10px] font-bold tracking-widest uppercase">
            {dark ? 'Dark Mode' : 'Light Mode'}
          </span>
          <button onClick={toggle} title={dark ? 'เปลี่ยนเป็น Light' : 'เปลี่ยนเป็น Dark'}
            className="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0"
            style={{ background: dark ? 'rgba(234,88,12,0.35)' : 'rgba(255,255,255,0.12)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center
              ${dark ? 'bg-orange-400' : 'bg-white/80'}`}
              style={{ left: dark ? '22px' : '2px' }}>
              {dark
                ? <Moon size={10} className="text-orange-950" />
                : <Sun size={10} className="text-orange-600" />}
            </span>
          </button>
        </div>

        {/* ── User Card ── */}
        <div className="relative p-3 border-t border-white/5" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-3 px-3 py-3 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)' }}>
            {/* Avatar */}
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${ROLE_COLOR[user?.role] || 'from-orange-400 to-amber-500'} flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-lg`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold leading-none truncate">{user?.name}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${ROLE_BADGE[user?.role] || ROLE_BADGE.STAFF}`}>
                {ROLE_LABEL[user?.role] || 'เจ้าหน้าที่'}
              </span>
            </div>
            <button onClick={handleLogout} title="ออกจากระบบ"
              className="text-orange-400/40 hover:text-red-400 transition-colors p-1.5 rounded-xl hover:bg-red-500/10 flex-shrink-0">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto min-h-screen">
        {/* Spacer = 10px paddingBottom + 40px (h-10) + safe-area-top */}
        <div className="md:hidden print-hide" style={{ height: 'calc(50px + max(14px, env(safe-area-inset-top)))' }} />
        <div className="p-4 md:p-7" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
