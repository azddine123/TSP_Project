import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Typography, Button, Paper } from '@mui/material';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../contexts/AuthContext';
export default function DistributeurPage() {
    const { user, logout } = useAuth();
    return (_jsx(Box, { sx: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
            p: 3,
        }, children: _jsxs(Paper, { elevation: 8, sx: {
                maxWidth: 520,
                width: '100%',
                borderRadius: 4,
                overflow: 'hidden',
                textAlign: 'center',
            }, children: [_jsx(Box, { sx: { bgcolor: 'error.main', py: 2 }, children: _jsx(Typography, { variant: "overline", sx: { color: '#fff', fontWeight: 'bold', letterSpacing: 2 }, children: "Acc\u00E8s Refus\u00E9" }) }), _jsxs(Box, { sx: { px: 4, py: 5 }, children: [_jsx(Box, { sx: {
                                width: 96,
                                height: 96,
                                borderRadius: '50%',
                                bgcolor: 'primary.light',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 3,
                                boxShadow: '0 4px 20px rgba(21,101,192,0.25)',
                            }, children: _jsx(PhoneAndroidIcon, { sx: { fontSize: 52, color: 'primary.main' } }) }), _jsx(Typography, { variant: "h5", fontWeight: "bold", gutterBottom: true, children: "Espace R\u00E9serv\u00E9 \u2014 Application Mobile" }), user && (_jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: ["Connect\u00E9 en tant que ", _jsx("strong", { children: user.username }), " \u00B7 R\u00F4le : ", _jsx("strong", { children: "DISTRIBUTEUR" })] })), _jsxs(Typography, { variant: "body1", color: "text.secondary", sx: { lineHeight: 1.8, mb: 4 }, children: ["En tant que ", _jsx("strong", { children: "Distributeur" }), ", vous n'avez pas acc\u00E8s au portail Web de gestion logistique.", _jsx("br", {}), _jsx("br", {}), "Veuillez utiliser l'", _jsx("strong", { children: "Application Mobile d\u00E9di\u00E9e" }), " install\u00E9e sur votre t\u00E9l\u00E9phone pour consulter et valider vos missions de livraison."] }), _jsxs(Box, { sx: {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 1.5,
                                bgcolor: '#EFF3FB',
                                border: '1px solid',
                                borderColor: 'primary.light',
                                borderRadius: 3,
                                px: 3,
                                py: 2,
                                mb: 4,
                            }, children: [_jsx(PhoneAndroidIcon, { color: "primary" }), _jsx(Typography, { variant: "body2", color: "primary.dark", fontWeight: "bold", children: "Ouvrez l'app Logistique MTSPC26 sur votre t\u00E9l\u00E9phone" })] }), _jsx(Button, { variant: "outlined", color: "error", startIcon: _jsx(LogoutIcon, {}), onClick: logout, fullWidth: true, size: "large", children: "Se d\u00E9connecter" })] })] }) }));
}
