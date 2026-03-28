/**
 * APP — Routage principal par rôle Keycloak
 * ==========================================
 *
 * /admin      → ADMIN_ENTREPOT uniquement (Stock + Missions)
 * /superadmin → SUPER_ADMIN uniquement   (Carte + Audit Logs)
 * /           → Redirige selon le rôle détecté automatiquement
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import Navbar              from './components/Navbar';
import ProtectedRoute      from './components/ProtectedRoute';
import AdminDashboard      from './pages/admin/AdminDashboard';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import DistributeurPage    from './pages/DistributeurPage';
import { useAuth }         from './contexts/AuthContext';

function HomeRedirect() {
  const { hasRole } = useAuth();
  if (hasRole('SUPER_ADMIN'))    return <Navigate to="/superadmin"   replace />;
  if (hasRole('ADMIN_ENTREPOT')) return <Navigate to="/admin"        replace />;
  if (hasRole('DISTRIBUTEUR'))   return <Navigate to="/mobile-only"  replace />;
  return <Navigate to="/mobile-only" replace />;
}

export default function App() {
  const { isLoading } = useAuth();

  // Keycloak est en cours d'initialisation → écran de chargement
  if (isLoading) {
    return (
      <Box sx={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
      }}>
        <CircularProgress size={48} />
        <Typography color="text.secondary">
          Connexion au serveur d'authentification Keycloak…
        </Typography>
      </Box>
    );
  }

  return (
    <Routes>
      {/* Route DISTRIBUTEUR — plein écran, sans Navbar ni padding */}
      <Route path="/mobile-only" element={<DistributeurPage />} />

      {/* Toutes les autres routes — avec Navbar */}
      <Route
        path="/*"
        element={
          <>
            <Navbar />
            <Box sx={{ mt: '64px', p: 3, minHeight: 'calc(100vh - 64px)' }}>
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
