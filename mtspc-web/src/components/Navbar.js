import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AppBar, Toolbar, Typography, Button, Box, Chip, Tooltip, } from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import LogoutIcon from '@mui/icons-material/Logout';
import MapIcon from '@mui/icons-material/Map';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
const ROLE_COLOR = {
    SUPER_ADMIN: 'error',
    ADMIN_ENTREPOT: 'warning',
    DISTRIBUTEUR: 'info',
};
export default function Navbar() {
    const { user, logout, hasRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const primaryRole = user?.roles[0] || '';
    return (_jsx(AppBar, { position: "fixed", elevation: 2, children: _jsxs(Toolbar, { sx: { gap: 1 }, children: [_jsx(WarehouseIcon, { sx: { mr: 1 } }), _jsx(Typography, { variant: "h6", fontWeight: "bold", sx: { flexGrow: 0, mr: 3 }, children: "MTSPC26 \u00B7 Logistique" }), _jsxs(Box, { sx: { flexGrow: 1, display: 'flex', gap: 1 }, children: [hasRole('ADMIN_ENTREPOT') && (_jsx(Button, { color: "inherit", startIcon: _jsx(InventoryIcon, {}), onClick: () => navigate('/admin'), sx: {
                                borderBottom: location.pathname.startsWith('/admin')
                                    ? '2px solid white' : 'none',
                            }, children: "Mon Stock & Missions" })), hasRole('SUPER_ADMIN') && (_jsx(Button, { color: "inherit", startIcon: _jsx(MapIcon, {}), onClick: () => navigate('/superadmin'), sx: {
                                borderBottom: location.pathname.startsWith('/superadmin')
                                    ? '2px solid white' : 'none',
                            }, children: "Audit & Carte R\u00E9gionale" }))] }), _jsx(Tooltip, { title: `Connecté en tant que ${user?.email}`, children: _jsx(Chip, { label: user?.username, color: ROLE_COLOR[primaryRole] || 'default', size: "small", sx: { color: 'white', fontWeight: 'bold', mr: 1 } }) }), _jsx(Chip, { label: primaryRole, variant: "outlined", size: "small", sx: { color: 'white', borderColor: 'rgba(255,255,255,0.5)', mr: 2 } }), _jsx(Button, { color: "inherit", startIcon: _jsx(LogoutIcon, {}), onClick: logout, children: "D\u00E9connexion" })] }) }));
}
