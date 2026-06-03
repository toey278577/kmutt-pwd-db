import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';

// Lazy load ทุก page — โหลดเฉพาะหน้าที่ผู้ใช้เปิด
const Dashboard        = lazy(() => import('./pages/Dashboard'));
const PersonList       = lazy(() => import('./pages/PersonList'));
const PersonDetail     = lazy(() => import('./pages/PersonDetail'));
const OrganizationList = lazy(() => import('./pages/OrganizationList'));
const FollowUpList     = lazy(() => import('./pages/FollowUpList'));
const TrainingList     = lazy(() => import('./pages/TrainingList'));
const UserManagement   = lazy(() => import('./pages/UserManagement'));
const Help             = lazy(() => import('./pages/Help'));
const ReportPage       = lazy(() => import('./pages/ReportPage'));

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
                <Route path="/users"        element={
                  <ProtectedRoute adminOnly>
                    <UserManagement />
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
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
