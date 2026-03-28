import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
const theme = createTheme({
    palette: {
        primary: { main: '#1565C0' }, // Bleu institutionnel
        secondary: { main: '#E53935' }, // Rouge urgence
        background: { default: '#F4F6F9' },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", sans-serif',
    },
});
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(BrowserRouter, { children: _jsxs(ThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), _jsx(AuthProvider, { children: _jsx(App, {}) })] }) }) }));
