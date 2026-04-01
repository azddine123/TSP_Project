/**
 * APP — Routage principal par rôle Keycloak
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout           from './layout/AppLayout';
import ProtectedRoute      from './components/ProtectedRoute';
import AdminDashboard      from './pages/admin/AdminDashboard';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import DistributeurPage    from './pages/DistributeurPage';
import LoginPage           from './pages/LoginPage';
import { useAuth }         from './contexts/AuthContext';

function HomeRedirect() {
  const { hasRole } = useAuth();
  if (hasRole('SUPER_ADMIN'))    return <Navigate to="/superadmin"  replace />;
  if (hasRole('ADMIN_ENTREPOT')) return <Navigate to="/admin"       replace />;
  return <Navigate to="/mobile-only" replace />;
}

export default function App() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Non connecté → page de login standalone (sans layout)
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/mobile-only" element={<DistributeurPage />} />
      <Route
        path="/*"
        element={
          <AppLayout>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN_ENTREPOT']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/*"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <SuperAdminDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AppLayout>
        }
      />
    </Routes>
  );
}
