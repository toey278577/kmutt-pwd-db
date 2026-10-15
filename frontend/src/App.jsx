import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ErrorBoundary, { ReconnectingBanner } from './components/ErrorBoundary';
import UpdateBanner from './components/UpdateBanner';

// แท็บที่เปิดค้างตั้งแต่ก่อนอัปเดต จะเรียกไฟล์หน้าชื่อเก่าที่ถูกลบไปแล้ว → โหลดหน้าใหม่ให้เอง 1 ครั้ง (เดิมขึ้น "เกิดข้อผิดพลาด")
const lazyPage = (load) => lazy(() => load()
  .then((m) => { sessionStorage.removeItem('page-reloaded'); return m; })
  .catch((err) => {
    if (sessionStorage.getItem('page-reloaded')) throw err;   // โหลดใหม่แล้วยังไม่ได้ = พังจริง ให้กล่องแจ้งเตือนทำงาน
    sessionStorage.setItem('page-reloaded', '1');
    window.location.reload();
    return new Promise(() => {});
  }));

// Lazy load ทุก page — โหลดเฉพาะหน้าที่ผู้ใช้เปิด
const Dashboard        = lazyPage(() => import('./pages/Dashboard'));
const PersonList       = lazyPage(() => import('./pages/PersonList'));
const PersonDetail     = lazyPage(() => import('./pages/PersonDetail'));
const OrganizationList = lazyPage(() => import('./pages/OrganizationList'));
const FollowUpList     = lazyPage(() => import('./pages/FollowUpList'));
const TrainingList     = lazyPage(() => import('./pages/TrainingList'));
const UserManagement   = lazyPage(() => import('./pages/UserManagement'));
const Help             = lazyPage(() => import('./pages/Help'));
const ReportPage       = lazyPage(() => import('./pages/ReportPage'));
const BatchPage        = lazyPage(() => import('./pages/BatchPage'));
const AuditLog         = lazyPage(() => import('./pages/AuditLog'));
const DisabilityTypes  = lazyPage(() => import('./pages/DisabilityTypes'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        <span className="text-orange-400 text-sm font-medium">กำลังโหลด...</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/"             element={<Dashboard />} />
                <Route path="/persons"      element={<PersonList />} />
                <Route path="/persons/:id"  element={<PersonDetail />} />
                <Route path="/training"     element={<TrainingList />} />
                <Route path="/followup"     element={<FollowUpList />} />
                <Route path="/organizations" element={<OrganizationList />} />
                <Route path="/help"         element={<Help />} />
                <Route path="/report"       element={<ReportPage />} />
                <Route path="/batches"      element={<BatchPage />} />
                <Route path="/users"        element={
                  <ProtectedRoute adminOnly>
                    <UserManagement />
                  </ProtectedRoute>
                } />
                <Route path="/audit"        element={
                  <ProtectedRoute adminOnly>
                    <AuditLog />
                  </ProtectedRoute>
                } />
                <Route path="/disability-types" element={
                  <ProtectedRoute adminOnly>
                    <DisabilityTypes />
                  </ProtectedRoute>
                } />
              </Routes>
            </Suspense>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <ReconnectingBanner />
              <UpdateBanner />
              <AppRoutes />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
