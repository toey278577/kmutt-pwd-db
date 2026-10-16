import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api';
import { isExpired } from '../utils/session';

const AuthContext = createContext(null);

// เปิดหน้าใหม่ตอนตั๋วหมดอายุไปแล้ว (เช่น แท็บค้างข้ามคืนแล้วกดรีเฟรช) → ไปหน้าเข้าสู่ระบบเลย ไม่มีข้อมูลค้างให้เสีย
// (หมดเวลาระหว่างใช้งาน = กล่องขอรหัสผ่านใน components/SessionGuard.jsx)
function readToken() {
  const t = sessionStorage.getItem('token');
  if (t && isExpired(t)) { sessionStorage.removeItem('token'); sessionStorage.removeItem('user'); return null; }
  return t;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState(() => {
    if (!sessionStorage.getItem('token')) return null;
    try { return JSON.parse(sessionStorage.getItem('user')); } catch { return null; }
  });

  // ถ้า user กลับมาด้วย session เดิม → ดึงข้อมูลตัวเองใหม่ (warm backend ไปในตัว)
  // เผื่อแอดมินเปลี่ยนบทบาทให้ระหว่างนั้น จะได้เห็นเมนูตามสิทธิ์ใหม่ทันทีที่รีเฟรช
  useEffect(() => {
    if (!sessionStorage.getItem('token')) return;   // ทำครั้งเดียวตอนเปิดหน้า (ล็อกอินใหม่ได้ข้อมูลสดอยู่แล้ว)
    getMe()
      .then(({ data }) => {
        const fresh = { id: data.id, name: data.name, email: data.email, role: data.role };
        sessionStorage.setItem('user', JSON.stringify(fresh));
        setUser(fresh);
      })
      .catch(() => {});   // 401 มี interceptor เตะออกให้อยู่แล้ว
  }, []);

  const loginSuccess = (data) => {
    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isViewer = user?.role === 'VIEWER';
  const canEdit = user?.role === 'ADMIN' || user?.role === 'STAFF';

  return (
    <AuthContext.Provider value={{ user, token, loginSuccess, logout, isAdmin, isViewer, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
