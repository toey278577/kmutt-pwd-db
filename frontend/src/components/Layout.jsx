import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, Target, Building2, UserCog, LogOut, BookOpen, Printer, Menu, X, Sun, Moon, Layers, History, Accessibility, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getIncomplete } from '../api';

const menu = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'ข้อมูลคนพิการ', icon: Users, path: '/persons' },
  { label: 'การอบรม & ฝึกงาน', icon: GraduationCap, path: '/training' },
  { label: 'ติดตามผล', icon: Target, path: '/followup' },
  { label: 'ข้อมูลยังไม่ครบ', icon: ClipboardCheck, path: '/data-check' },
  { label: 'สถานประกอบการ', icon: Building2, path: '/organizations' },
  { label: 'จัดการรุ่น', icon: Layers, path: '/batches' },
  { label: 'ออกรายงาน', icon: Printer, path: '/report' },
  { label: 'คู่มือการใช้งาน', icon: BookOpen, path: '/help' },
];

const ROLE_LABEL = { ADMIN: 'ผู้ดูแลระบบ', STAFF: 'เจ้าหน้าที่', VIEWER: 'ผู้ดูข้อมูล' };

// โทนส้มสว่าง (ลดสว่างลงนิด อิ่มขึ้น) + ลายจุดจางๆ + แสงเรืองมุมบน (รวมใน background เดียว — ปลอดภัย ไม่เพิ่ม DOM)
const SIDEBAR_BG = `
  radial-gradient(circle at 1px 1px, rgba(255,255,255,0.09) 1px, transparent 0) 0 0 / 22px 22px,
  radial-gradient(125% 55% at 100% 0%, rgba(255,255,255,0.16), transparent 60%),
  linear-gradient(165deg,#f2622b 0%,#ec4f1a 42%,#e74111 74%,#c9370c 100%)`;

// อยู่นอก Layout — ถ้าประกาศข้างใน React จะสร้างปุ่มเมนูใหม่หมดทุกครั้งที่ Layout render (แอนิเมชันกระตุก)
function NavItem({ label, icon: Icon, path, active, onNav, badge = 0 }) {
  return (
      <button onClick={() => onNav(path)}
        className={`group relative overflow-hidden w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-left transition-all duration-200
          ${active
            ? 'bg-white text-orange-600 shadow-lg shadow-orange-950/25'
            : 'text-white/85 hover:text-white hover:bg-white/15 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/15'}`}>
        {/* แสงวิ่งผ่านตอนชี้ (เฉพาะเมนูที่ยังไม่ถูกเลือก) */}
        {!active && (
          <span className="pointer-events-none absolute top-0 -left-full h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:left-[140%] transition-all duration-700 ease-out z-0" />
        )}
        {/* active accent bar */}
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full z-10 transition-all duration-200
          ${active ? 'h-6 bg-orange-500' : 'h-0 bg-transparent'}`} />
        <Icon size={17} className={`relative z-10 flex-shrink-0 transition-colors ${active ? 'text-orange-600' : 'text-white/70 group-hover:text-white'}`} />
        <span className={`relative z-10 text-sm flex-1 ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
        {badge > 0 && (
          <span data-nav-badge title={`${badge} คนยังขาดข้อมูล`}
            className={`relative z-10 min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-black flex items-center justify-center flex-shrink-0 ${active ? 'bg-orange-600 text-white' : 'bg-white text-orange-700 shadow-sm'}`}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
  );
}

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };
  const handleNav = (path) => { navigate(path); setOpen(false); };
  const nav = (path) => ({ path, active: location.pathname === path, onNav: handleNav });

  // ตัวเลขข้างเมนู "ข้อมูลยังไม่ครบ" — เช็คใหม่ทุกครั้งที่เปลี่ยนหน้า (จำผลไว้ 30 วิ แก้ข้อมูลแล้วล้างเอง)
  const [incomplete, setIncomplete] = useState(0);
  useEffect(() => {
    getIncomplete().then((r) => setIncomplete(r.data.items.length)).catch(() => {});
  }, [location.pathname]);

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
          <span className="w-8 h-8 rounded-full bg-white shadow ring-2 ring-white/40 flex items-center justify-center flex-shrink-0"><img src="/logo-seal.png" alt="KMUTT" className="w-7 h-7 rounded-full" /></span>
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
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-md ring-2 ring-white/40 flex-shrink-0">
            <img src="/logo-seal.png" alt="KMUTT" className="h-10 w-10 rounded-full" />
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
          {menu.map((m) => <NavItem key={m.path} label={m.label} icon={m.icon} {...nav(m.path)} badge={m.path === '/data-check' ? incomplete : 0} />)}

          {isAdmin && (
            <>
              <p className="text-white/60 text-[10px] font-bold tracking-[0.15em] px-4 mb-2 mt-4 uppercase">ผู้ดูแลระบบ</p>
              <NavItem label="จัดการผู้ใช้" icon={UserCog} {...nav("/users")} />
              <NavItem label="ประวัติการใช้งาน" icon={History} {...nav("/audit")} />
              <NavItem label="ประเภทความพิการ" icon={Accessibility} {...nav("/disability-types")} />
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
            style={{ background: dark ? 'rgba(231,65,17,0.35)' : 'rgba(255,255,255,0.12)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center ${dark ? 'bg-orange-400' : 'bg-white/90'}`}
              style={{ left: dark ? '22px' : '2px' }}>
              {dark ? <Moon size={10} className="text-orange-950" /> : <Sun size={10} className="text-orange-600" />}
            </span>
          </button>
        </div>

        {/* ── User Card — การ์ดใสบนพื้นส้ม ตัวหนังสือเรืองแสง (พี่เต้ย 15 ต.ค. 69: การ์ดขาวไม่สวย "เอาสีใสๆ") ── */}
        <div className="p-3 border-t border-white/15" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div data-user-card className="user-card-glass flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl">
            <div className="flex-1 min-w-0">
              <p className="user-card-glow text-white text-sm font-extrabold leading-tight break-words">{user?.name}</p>
              {/* บทบาทซ้ำกับชื่อ (บัญชีแอดมินชื่อ "ผู้ดูแลระบบ") → ไม่ต้องโชว์ซ้ำ */}
              {ROLE_LABEL[user?.role] && ROLE_LABEL[user?.role] !== user?.name && (
                <p className="text-orange-50 text-xs font-semibold mt-0.5 truncate">{ROLE_LABEL[user?.role]}</p>
              )}
            </div>
            <button onClick={handleLogout} title="ออกจากระบบ" aria-label="ออกจากระบบ"
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 border border-white/35 text-white hover:bg-red-500 hover:border-red-400 transition-all active:scale-90">
              <LogOut size={16} />
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
