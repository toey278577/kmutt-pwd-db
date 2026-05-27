import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, Target, Building2, UserCog, LogOut, Shield, Eye, BookOpen, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const menu = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'ข้อมูลคนพิการ', icon: Users, path: '/persons' },
  { label: 'การอบรม & ฝึกงาน', icon: GraduationCap, path: '/training' },
  { label: 'ติดตามผล', icon: Target, path: '/followup' },
  { label: 'สถานประกอบการ', icon: Building2, path: '/organizations' },
  { label: 'คู่มือการใช้งาน', icon: BookOpen, path: '/help' },
];

const ROLE_LABEL = { ADMIN: 'ผู้ดูแลระบบ', STAFF: 'เจ้าหน้าที่', VIEWER: 'ผู้ดูข้อมูล' };
const ROLE_ICON = { ADMIN: Shield, STAFF: UserCog, VIEWER: Eye };

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleNav = (path) => {
    navigate(path);
    setOpen(false);
  };

  const RoleIcon = ROLE_ICON[user?.role] || UserCog;

  return (
    <div className="flex min-h-screen">

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 shadow-md"
        style={{
          background: 'linear-gradient(160deg,#431407 0%,#9a3412 100%)',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          paddingBottom: '12px',
        }}>
        <button onClick={() => setOpen(true)} className="text-white/80 hover:text-white p-1 -ml-1">
          <Menu size={22} />
        </button>
        <img src="/logo-icon.png" alt="KMUTT" className="h-7 w-7 object-contain rounded-md bg-white/10 p-0.5 flex-shrink-0" />
        <span className="text-white font-bold text-sm truncate">ระบบฐานข้อมูลคนพิการ มจธ.</span>
      </div>

      {/* ── Backdrop ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 w-64 flex-shrink-0 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{ background: 'linear-gradient(160deg,#431407 0%,#9a3412 60%,#431407 100%)' }}
      >
        {/* Logo */}
        <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
          <div className="bg-white rounded-2xl px-3 py-3 shadow-lg flex items-center gap-3 flex-1 min-w-0">
            <img src="/logo-icon.png" alt="KMUTT" className="h-11 w-11 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-orange-700 font-black text-sm leading-none tracking-tight">PWDs</p>
              <p className="text-orange-500 text-[10px] font-medium leading-snug mt-0.5">ระบบฐานข้อมูลคนพิการ<br/>มจธ.</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="md:hidden text-white/60 hover:text-white flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-orange-500 text-xs font-bold tracking-widest px-3 mb-2 uppercase">เมนูหลัก</p>
          {menu.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => handleNav(path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group
                  ${active
                    ? 'bg-white/10 border border-white/20 text-white'
                    : 'text-orange-200/70 hover:bg-white/5 hover:text-orange-100 border border-transparent'
                  }`}
              >
                <Icon size={17} className={active ? 'text-orange-300' : 'text-orange-400/60 group-hover:text-orange-300'} />
                <span className={`text-sm flex-1 ${active ? 'font-semibold' : 'font-normal'}`}>{label}</span>
                {active && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_#fb923c]" />}
              </button>
            );
          })}

          {isAdmin && (
            <>
              <p className="text-orange-500 text-xs font-bold tracking-widest px-3 mt-4 mb-2 uppercase">ผู้ดูแลระบบ</p>
              <button
                onClick={() => handleNav('/users')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group
                  ${location.pathname === '/users'
                    ? 'bg-white/10 border border-white/20 text-white'
                    : 'text-orange-200/70 hover:bg-white/5 hover:text-orange-100 border border-transparent'
                  }`}
              >
                <UserCog size={17} className={location.pathname === '/users' ? 'text-orange-300' : 'text-orange-400/60 group-hover:text-orange-300'} />
                <span className={`text-sm flex-1 ${location.pathname === '/users' ? 'font-semibold' : 'font-normal'}`}>จัดการผู้ใช้</span>
                {location.pathname === '/users' && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_#fb923c]" />}
              </button>
            </>
          )}
        </nav>

        {/* User Footer */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-orange-600/40 border border-orange-500/30 text-orange-200 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {user?.name?.slice(0, 2) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold leading-none truncate">{user?.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <RoleIcon size={10} className="text-orange-400" />
                <p className="text-orange-400 text-xs">{ROLE_LABEL[user?.role] || 'เจ้าหน้าที่'}</p>
              </div>
            </div>
            <button onClick={handleLogout} title="ออกจากระบบ"
              className="text-orange-400/60 hover:text-orange-200 transition-colors p-1 rounded-lg hover:bg-white/5">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto bg-orange-50 min-h-screen md:p-7">
        {/* Safe-area spacer — mobile only */}
        <div className="md:hidden" style={{ height: 'max(56px, calc(env(safe-area-inset-top) + 44px))' }} />
        <div className="p-4 md:p-0">
          {children}
        </div>
      </main>
    </div>
  );
}
