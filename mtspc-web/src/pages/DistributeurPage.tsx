/**
 * PAGE DISTRIBUTEUR — Accès Web refusé
 * =====================================
 * Affiché quand un compte DISTRIBUTEUR se connecte sur le portail Web.
 * Ce rôle est réservé à l'application mobile uniquement.
 */
import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../contexts/AuthContext';

export default function DistributeurPage() {
  const { user, logout } = useAuth();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
        p: 3,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          maxWidth: 520,
          width: '100%',
          borderRadius: 4,
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        {/* Bandeau rouge en haut */}
        <Box sx={{ bgcolor: 'error.main', py: 2 }}>
          <Typography variant="overline" sx={{ color: '#fff', fontWeight: 'bold', letterSpacing: 2 }}>
            Accès Refusé
          </Typography>
        </Box>

        <Box sx={{ px: 4, py: 5 }}>
          {/* Icône smartphone */}
          <Box
            sx={{
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
            }}
          >
            <PhoneAndroidIcon sx={{ fontSize: 52, color: 'primary.main' }} />
          </Box>

          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Espace Réservé — Application Mobile
          </Typography>

          {user && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Connecté en tant que <strong>{user.username}</strong> · Rôle : <strong>DISTRIBUTEUR</strong>
            </Typography>
          )}

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ lineHeight: 1.8, mb: 4 }}
          >
            En tant que <strong>Distributeur</strong>, vous n'avez pas accès
            au portail Web de gestion logistique.
            <br /><br />
            Veuillez utiliser l'<strong>Application Mobile dédiée</strong> installée
            sur votre téléphone pour consulter et valider vos missions de livraison.
          </Typography>

          {/* Indicateur visuel mobile */}
          <Box
            sx={{
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
            }}
          >
            <PhoneAndroidIcon color="primary" />
            <Typography variant="body2" color="primary.dark" fontWeight="bold">
              Ouvrez l'app Logistique MTSPC26 sur votre téléphone
            </Typography>
          </Box>

          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={logout}
            fullWidth
            size="large"
          >
            Se déconnecter
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
