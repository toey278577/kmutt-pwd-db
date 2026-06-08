import { createContext, useContext, useState, useEffect } from 'react';
import { getHealth } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('token'));

  // ถ้า user กลับมาด้วย session เดิม → ping เพื่อ warm backend ทันที
  useEffect(() => {
    if (token) getHealth().catch(() => {});
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
