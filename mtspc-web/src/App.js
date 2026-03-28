import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import DistributeurPage from './pages/DistributeurPage';
import { useAuth } from './contexts/AuthContext';
function HomeRedirect() {
    const { hasRole } = useAuth();
    if (hasRole('SUPER_ADMIN'))
        return _jsx(Navigate, { to: "/superadmin", replace: true });
    if (hasRole('ADMIN_ENTREPOT'))
        return _jsx(Navigate, { to: "/admin", replace: true });
    if (hasRole('DISTRIBUTEUR'))
        return _jsx(Navigate, { to: "/mobile-only", replace: true });
    return _jsx(Navigate, { to: "/mobile-only", replace: true });
}
export default function App() {
    const { isLoading } = useAuth();
    // Keycloak est en cours d'initialisation → écran de chargement
    if (isLoading) {
        return (_jsxs(Box, { sx: {
                height: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 2,
            }, children: [_jsx(CircularProgress, { size: 48 }), _jsx(Typography, { color: "text.secondary", children: "Connexion au serveur d'authentification Keycloak\u2026" })] }));
    }
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/mobile-only", element: _jsx(DistributeurPage, {}) }), _jsx(Route, { path: "/*", element: _jsxs(_Fragment, { children: [_jsx(Navbar, {}), _jsx(Box, { sx: { mt: '64px', p: 3, minHeight: 'calc(100vh - 64px)' }, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(HomeRedirect, {}) }), _jsx(Route, { path: "/admin/*", element: _jsx(ProtectedRoute, { allowedRoles: ['ADMIN_ENTREPOT'], children: _jsx(AdminDashboard, {}) }) }), _jsx(Route, { path: "/superadmin/*", element: _jsx(ProtectedRoute, { allowedRoles: ['SUPER_ADMIN'], children: _jsx(SuperAdminDashboard, {}) }) })] }) })] }) })] }));
}
