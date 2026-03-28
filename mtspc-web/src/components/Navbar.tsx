/**
 * NAVBAR — Barre de navigation principale
 * Affiche les liens selon le rôle Keycloak de l'utilisateur connecté.
 * Un SUPER_ADMIN voit l'onglet "Audit & Carte", un ADMIN_ENTREPOT voit "Mon Stock".
 */
import React from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, Chip, Tooltip,
} from '@mui/material';
import WarehouseIcon  from '@mui/icons-material/Warehouse';
import LogoutIcon     from '@mui/icons-material/Logout';
import MapIcon        from '@mui/icons-material/Map';
import InventoryIcon  from '@mui/icons-material/Inventory';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ROLE_COLOR: Record<string, 'error' | 'warning' | 'info'> = {
  SUPER_ADMIN:    'error',
  ADMIN_ENTREPOT: 'warning',
  DISTRIBUTEUR:   'info',
};

export default function Navbar() {
  const { user, logout, hasRole } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const primaryRole = user?.roles[0] || '';

  return (
    <AppBar position="fixed" elevation={2}>
      <Toolbar sx={{ gap: 1 }}>
        {/* Logo / Titre */}
        <WarehouseIcon sx={{ mr: 1 }} />
        <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 0, mr: 3 }}>
          MTSPC26 · Logistique
        </Typography>

        {/* Liens de navigation selon le rôle */}
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          {hasRole('ADMIN_ENTREPOT') && (
            <Button
              color="inherit"
              startIcon={<InventoryIcon />}
              onClick={() => navigate('/admin')}
              sx={{
                borderBottom: location.pathname.startsWith('/admin')
                  ? '2px solid white' : 'none',
              }}
            >
              Mon Stock & Missions
            </Button>
          )}
          {hasRole('SUPER_ADMIN') && (
            <Button
              color="inherit"
              startIcon={<MapIcon />}
              onClick={() => navigate('/superadmin')}
              sx={{
                borderBottom: location.pathname.startsWith('/superadmin')
                  ? '2px solid white' : 'none',
              }}
            >
              Audit & Carte Régionale
            </Button>
          )}
        </Box>

        {/* Profil utilisateur */}
        <Tooltip title={`Connecté en tant que ${user?.email}`}>
          <Chip
            label={user?.username}
            color={ROLE_COLOR[primaryRole] || 'default'}
            size="small"
            sx={{ color: 'white', fontWeight: 'bold', mr: 1 }}
          />
        </Tooltip>
        <Chip
          label={primaryRole}
          variant="outlined"
          size="small"
          sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', mr: 2 }}
        />

        {/* Déconnexion */}
        <Button color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
          Déconnexion
        </Button>
      </Toolbar>
    </AppBar>
  );
}
