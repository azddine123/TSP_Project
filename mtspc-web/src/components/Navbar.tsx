/**
 * NAVBAR — Barre de navigation simple et moderne
 */
import {
  AppBar, Toolbar, Typography, Button, Box, Chip, Tooltip, Avatar,
} from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import LogoutIcon    from '@mui/icons-material/Logout';
import MapIcon       from '@mui/icons-material/Map';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN:    '#9B5DE5',
  ADMIN_ENTREPOT: '#F5A623',
  DISTRIBUTEUR:   '#34C78A',
};

function getInitials(username: string) {
  return username.split(/[\s._-]/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export default function Navbar() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const primaryRole  = user?.roles[0] || '';
  const roleColor    = ROLE_COLOR[primaryRole] || '#4A90D9';

  return (
    <AppBar position="fixed" elevation={0}>
      <Toolbar sx={{ gap: 1, minHeight: '56px !important', px: 3 }}>

        {/* Logo */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mr: 3, cursor: 'pointer', flexShrink: 0 }}
          onClick={() => navigate('/')}
        >
          <Box sx={{
            width: 32, height: 32, borderRadius: '8px',
            bgcolor: 'primary.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <WarehouseIcon sx={{ fontSize: 18, color: '#fff' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
            ReliefChain
            <Typography component="span" sx={{ color: 'text.secondary', fontWeight: 400, fontSize: '0.85rem', ml: 0.8 }}>
              Logistique
            </Typography>
          </Typography>
        </Box>

        {/* Divider */}
        <Box sx={{ width: 1, height: 24, bgcolor: 'divider', mr: 2, flexShrink: 0 }} />

        {/* Nav links */}
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 0.5 }}>
          {hasRole('ADMIN_ENTREPOT') && (
            <Button
              startIcon={<InventoryIcon sx={{ fontSize: 17 }} />}
              onClick={() => navigate('/admin')}
              sx={{
                color: location.pathname.startsWith('/admin') ? 'primary.main' : 'text.secondary',
                bgcolor: location.pathname.startsWith('/admin') ? 'rgba(74,144,217,0.1)' : 'transparent',
                fontWeight: location.pathname.startsWith('/admin') ? 700 : 500,
                fontSize: '0.875rem',
                px: 1.5,
                '&:hover': { bgcolor: 'rgba(74,144,217,0.08)', color: 'primary.light' },
              }}
            >
              Mon Stock & Missions
            </Button>
          )}
          {hasRole('SUPER_ADMIN') && (
            <Button
              startIcon={<MapIcon sx={{ fontSize: 17 }} />}
              onClick={() => navigate('/superadmin')}
              sx={{
                color: location.pathname.startsWith('/superadmin') ? 'primary.main' : 'text.secondary',
                bgcolor: location.pathname.startsWith('/superadmin') ? 'rgba(74,144,217,0.1)' : 'transparent',
                fontWeight: location.pathname.startsWith('/superadmin') ? 700 : 500,
                fontSize: '0.875rem',
                px: 1.5,
                '&:hover': { bgcolor: 'rgba(74,144,217,0.08)', color: 'primary.light' },
              }}
            >
              Audit & Carte Régionale
            </Button>
          )}
        </Box>

        {/* User info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            label={primaryRole.replace('_', ' ')}
            size="small"
            sx={{
              bgcolor: `${roleColor}20`,
              color: roleColor,
              border: `1px solid ${roleColor}40`,
              fontSize: '0.68rem',
              fontWeight: 700,
              height: 22,
            }}
          />

          <Tooltip title={user?.email || ''} placement="bottom-end">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Avatar sx={{
                width: 30, height: 30, fontSize: '0.72rem', fontWeight: 700,
                bgcolor: `${roleColor}30`, color: roleColor,
                border: `1.5px solid ${roleColor}60`,
              }}>
                {user?.username ? getInitials(user.username) : '?'}
              </Avatar>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
                {user?.username}
              </Typography>
            </Box>
          </Tooltip>

          <Box sx={{ width: 1, height: 20, bgcolor: 'divider' }} />

          <Button
            variant="outlined"
            size="small"
            startIcon={<LogoutIcon sx={{ fontSize: 15 }} />}
            onClick={() => { logout(); navigate('/login'); }}
            sx={{
              fontSize: '0.8rem',
              color: 'text.secondary',
              borderColor: 'divider',
              height: 30,
              '&:hover': { color: 'error.main', borderColor: 'error.main', bgcolor: 'rgba(224,92,92,0.06)' },
            }}
          >
            Déconnexion
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
