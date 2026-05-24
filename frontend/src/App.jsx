import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PersonList from './pages/PersonList';
import PersonDetail from './pages/PersonDetail';
import OrganizationList from './pages/OrganizationList';
import FollowUpList from './pages/FollowUpList';
import TrainingList from './pages/TrainingList';
import UserManagement from './pages/UserManagement';

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
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/persons" element={<PersonList />} />
              <Route path="/persons/:id" element={<PersonDetail />} />
              <Route path="/training" element={<TrainingList />} />
              <Route path="/followup" element={<FollowUpList />} />
              <Route path="/organizations" element={<OrganizationList />} />
              <Route path="/users" element={
                <ProtectedRoute adminOnly>
                  <UserManagement />
                </ProtectedRoute>
              } />
            </Routes>
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
