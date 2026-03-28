import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';

const theme = createTheme({
  palette: {
    primary:   { main: '#1565C0' }, // Bleu institutionnel
    secondary: { main: '#E53935' }, // Rouge urgence
    background:{ default: '#F4F6F9' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", sans-serif',
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* AuthProvider initialise Keycloak et redirige vers login si non connecté */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
