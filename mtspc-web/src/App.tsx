/**
 * APP — Routage principal par rôle Keycloak
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import Navbar              from './components/Navbar';
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
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  // Non connecté → page de login personnalisée
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
          <>
            <Navbar />
            <Box sx={{ mt: '56px', p: 3, minHeight: 'calc(100vh - 56px)', bgcolor: 'background.default' }}>
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
            </Box>
          </>
        }
      />
    </Routes>
  );
}
