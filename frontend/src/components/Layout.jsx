import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, Target, Building2, UserCog, LogOut, Shield, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const menu = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'ข้อมูลคนพิการ', icon: Users, path: '/persons' },
  { label: 'การอบรม & ฝึกงาน', icon: GraduationCap, path: '/training' },
  { label: 'ติดตามผล', icon: Target, path: '/followup' },
  { label: 'สถานประกอบการ', icon: Building2, path: '/organizations' },
];

const ROLE_LABEL = { ADMIN: 'ผู้ดูแลระบบ', STAFF: 'เจ้าหน้าที่', VIEWER: 'ผู้ดูข้อมูล' };
const ROLE_ICON = { ADMIN: Shield, STAFF: UserCog, VIEWER: Eye };

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const RoleIcon = ROLE_ICON[user?.role] || UserCog;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col"
        style={{ background: 'linear-gradient(160deg,#431407 0%,#9a3412 60%,#431407 100%)' }}>

        {/* Logo */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="bg-white rounded-2xl px-3 py-3 shadow-lg flex items-center gap-3">
            <img src="/logo-icon.png" alt="KMUTT" className="h-11 w-11 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-orange-700 font-black text-sm leading-none tracking-tight">PWDs</p>
              <p className="text-orange-500 text-[10px] font-medium leading-snug mt-0.5">ระบบฐานข้อมูลคนพิการ<br/>มจธ.</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="text-orange-500 text-xs font-bold tracking-widest px-3 mb-2 uppercase">เมนูหลัก</p>
          {menu.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
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
                onClick={() => navigate('/users')}
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

      {/* Main */}
      <main className="flex-1 overflow-auto p-7 bg-orange-50 min-h-screen">
        {children}
      </main>
    </div>
  );
}
