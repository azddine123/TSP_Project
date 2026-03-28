/**
 * PAGE DE LOGIN PERSONNALISÉE — Formulaire username / password
 * Appel direct à Keycloak sans redirection vers la page Keycloak.
 */
import React, { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, InputAdornment, IconButton,
  CircularProgress,
} from '@mui/material';
import WarehouseIcon      from '@mui/icons-material/Warehouse';
import Visibility         from '@mui/icons-material/Visibility';
import VisibilityOff      from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon   from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon  from '@mui/icons-material/PersonOutline';
import { useAuth }        from '../contexts/AuthContext';
import { useNavigate }    from 'react-router-dom';

export default function LoginPage() {
  const { login }                   = useAuth();
  const navigate                    = useNavigate();
  const [username,   setUsername]   = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Veuillez saisir votre identifiant et mot de passe.');
      return;
    }
    setLoading(true);
    setError(null);
    const err = await login(username.trim(), password);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <Box
      sx={{
        minHeight:       '100vh',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        background:      'linear-gradient(135deg, #0D1B2A 0%, #0A3D62 50%, #0D1B2A 100%)',
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420 }}>

        {/* En-tête */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 64, height: 64, borderRadius: '16px',
              background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 2,
              boxShadow: '0 8px 32px rgba(21,101,192,0.4)',
            }}
          >
            <WarehouseIcon sx={{ fontSize: 32, color: '#fff' }} />
          </Box>
          <Typography variant="h5" fontWeight={800} sx={{ color: '#fff', letterSpacing: 1 }}>
            ReliefChain
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', mt: 0.5 }}>
            Plateforme Logistique Humanitaire · Béni Mellal-Khénifra
          </Typography>
        </Box>

        {/* Carte formulaire */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 0.5 }}>
              Connexion
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', mb: 3 }}>
              Accès réservé au personnel autorisé
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

              {/* Identifiant */}
              <TextField
                label="Identifiant"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={inputSx}
              />

              {/* Mot de passe */}
              <TextField
                label="Mot de passe"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPass(v => !v)} edge="end" size="small">
                        {showPass
                          ? <VisibilityOff sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} />
                          : <Visibility   sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} />
                        }
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={inputSx}
              />

              {/* Bouton */}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{
                  mt: 1, py: 1.5, borderRadius: 2,
                  background: 'linear-gradient(90deg, #1565C0 0%, #0D47A1 100%)',
                  fontWeight: 700, fontSize: '0.95rem', letterSpacing: 0.5,
                  boxShadow: '0 4px 20px rgba(21,101,192,0.4)',
                  '&:hover': { background: 'linear-gradient(90deg, #1976D2 0%, #1565C0 100%)' },
                  '&:disabled': { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' },
                }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Se connecter'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Footer */}
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: 'rgba(255,255,255,0.25)' }}>
          🔒 Authentification sécurisée · Keycloak SSO
        </Typography>
      </Box>
    </Box>
  );
}

// ── Styles MUI pour les inputs dark ───────────────────────────────────────────
const inputSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    '& fieldset':          { borderColor: 'rgba(255,255,255,0.15)' },
    '&:hover fieldset':    { borderColor: 'rgba(255,255,255,0.3)' },
    '&.Mui-focused fieldset': { borderColor: '#1976D2' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.45)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#42A5F5' },
};
