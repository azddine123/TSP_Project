import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Box, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../contexts/AuthContext';
export default function ProtectedRoute({ allowedRoles, children }) {
    const { user, hasRole, logout } = useAuth();
    const isAllowed = allowedRoles.some((role) => hasRole(role));
    if (!isAllowed) {
        return (_jsxs(Box, { sx: {
                height: '80vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
            }, children: [_jsx(LockIcon, { sx: { fontSize: 64, color: 'error.main' } }), _jsx(Typography, { variant: "h5", fontWeight: "bold", children: "Acc\u00E8s Refus\u00E9" }), _jsxs(Typography, { color: "text.secondary", textAlign: "center", children: ["Votre r\u00F4le ", _jsx("strong", { children: user?.roles[0] || 'inconnu' }), " ne permet pas d'acc\u00E9der \u00E0 cet espace.", _jsx("br", {}), "R\u00F4le(s) requis : ", _jsx("strong", { children: allowedRoles.join(', ') })] }), _jsx(Button, { variant: "outlined", color: "error", onClick: logout, children: "Se d\u00E9connecter" })] }));
    }
    return _jsx(_Fragment, { children: children });
}
