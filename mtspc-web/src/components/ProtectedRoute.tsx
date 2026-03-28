/**
 * PROTECTED ROUTE — Garde d'accès par rôle (côté React)
 * ======================================================
 *
 * Utilisé pour envelopper les pages sensibles :
 *
 *   <ProtectedRoute allowedRoles={['ADMIN_ENTREPOT']}>
 *     <AdminDashboard />
 *   </ProtectedRoute>
 *
 * Si le rôle ne correspond pas → affiche une page "Accès Refusé"
 * au lieu de crasher ou d'exposer la page.
 */
import React, { ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  allowedRoles: string[];
  children: ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const { user, hasRole, logout } = useAuth();

  const isAllowed = allowedRoles.some((role) => hasRole(role));

  if (!isAllowed) {
    return (
      <Box
        sx={{
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <LockIcon sx={{ fontSize: 64, color: 'error.main' }} />
        <Typography variant="h5" fontWeight="bold">
          Accès Refusé
        </Typography>
        <Typography color="text.secondary" textAlign="center">
          Votre rôle <strong>{user?.roles[0] || 'inconnu'}</strong> ne permet
          pas d'accéder à cet espace.
          <br />
          Rôle(s) requis : <strong>{allowedRoles.join(', ')}</strong>
        </Typography>
        <Button variant="outlined" color="error" onClick={logout}>
          Se déconnecter
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
