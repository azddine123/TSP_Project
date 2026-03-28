/**
 * DASHBOARD ADMIN ENTREPÔT
 * Design simple — Stats + Stock + Missions
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Chip, Paper, Tabs, Tab, Typography, Grid,
  CircularProgress, Alert,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import AddIcon           from '@mui/icons-material/Add';
import SyncIcon          from '@mui/icons-material/Sync';
import WarningIcon       from '@mui/icons-material/Warning';
import InventoryIcon     from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import { stockApi, missionApi } from '../../services/api';
import type { StockRow, Mission } from '../../types';
import {
  MISSION_STATUT_COLOR, MISSION_STATUT_LABEL,
  MISSION_PRIORITE_COLOR, MISSION_PRIORITE_LABEL,
  MATERIEL_CATEGORIE_COLOR,
  DATAGRID_LOCALE,
  formatDateTime, formatDate,
} from '../../constants';
import CreateMissionModal from './CreateMissionModal';

// ── Stock columns ─────────────────────────────────────────────────────────────
const stockColumns: GridColDef[] = [
  {
    field: 'materielNom', headerName: 'Matériel', flex: 1.5,
    valueGetter: (_v: unknown, row: StockRow) => row.materiel.nom,
  },
  {
    field: 'categorie', headerName: 'Catégorie', width: 130,
    valueGetter: (_v: unknown, row: StockRow) => row.materiel.categorie,
    renderCell: (p: GridRenderCellParams<StockRow>) => (
      <Chip label={p.row.materiel.categorie} color={MATERIEL_CATEGORIE_COLOR[p.row.materiel.categorie] ?? 'default'} size="small" />
    ),
  },
  {
    field: 'quantite', headerName: 'Quantité', width: 110, type: 'number',
    renderCell: (p: GridRenderCellParams<StockRow>) => {
      const alert = p.row.quantite <= p.row.seuilAlerte;
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {alert && <WarningIcon sx={{ fontSize: 15, color: 'error.main' }} />}
          <Typography sx={{ fontWeight: 700, color: alert ? 'error.main' : 'text.primary', fontSize: '0.85rem' }}>
            {p.row.quantite}
          </Typography>
        </Box>
      );
    },
  },
  { field: 'unite', headerName: 'Unité', width: 90, valueGetter: (_v: unknown, row: StockRow) => row.materiel.unite },
  { field: 'seuilAlerte', headerName: 'Seuil alerte', width: 115, type: 'number' },
  { field: 'province', headerName: 'Province', width: 120, valueGetter: (_v: unknown, row: StockRow) => row.entrepot.province },
  { field: 'updatedAt', headerName: 'Dernière MAJ', width: 160, valueFormatter: (v: string) => formatDateTime(v) },
];

// ── Mission columns ───────────────────────────────────────────────────────────
const missionColumns: GridColDef[] = [
  { field: 'numeroMission', headerName: 'N° Mission', width: 145 },
  { field: 'destinationNom', headerName: 'Destination', flex: 1 },
  {
    field: 'statut', headerName: 'Statut', width: 140,
    renderCell: (p: GridRenderCellParams<Mission>) => (
      <Chip label={MISSION_STATUT_LABEL[p.row.statut] ?? p.row.statut} color={MISSION_STATUT_COLOR[p.row.statut]} size="small" />
    ),
  },
  {
    field: 'priorite', headerName: 'Priorité', width: 110,
    renderCell: (p: GridRenderCellParams<Mission>) => (
      <Chip label={MISSION_PRIORITE_LABEL[p.row.priorite] ?? p.row.priorite} color={MISSION_PRIORITE_COLOR[p.row.priorite]} size="small" />
    ),
  },
  {
    field: 'distributeur', headerName: 'Distributeur', width: 165,
    valueGetter: (_v: unknown, row: Mission) =>
      row.distributeur ? `${row.distributeur.prenom} ${row.distributeur.nom}` : '— Non assigné',
  },
  { field: 'dateEcheance', headerName: 'Échéance', width: 130, valueFormatter: (v: string) => formatDate(v) },
];

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Paper elevation={2} sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{
        width: 44, height: 44, borderRadius: '10px',
        bgcolor: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={700} color={color} lineHeight={1}>{value}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.3}>{label}</Typography>
      </Box>
    </Paper>
  );
}

// ── DataGrid shared style ─────────────────────────────────────────────────────
const gridSx = {
  border: 'none',
  '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(0,0,0,0.15)' },
  '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(255,255,255,0.03)' },
  '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(255,255,255,0.04)' },
  '& .row-alerte': { backgroundColor: 'rgba(224,92,92,0.05)' },
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [tab,       setTab]       = useState(0);
  const [stocks,    setStocks]    = useState<StockRow[]>([]);
  const [missions,  setMissions]  = useState<Mission[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [s, m] = await Promise.all([stockApi.getAll(), missionApi.getAll()]);
      setStocks(s); setMissions(m);
    } catch {
      setError('Impossible de charger les données. Vérifiez que le backend est démarré.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const alertCount      = stocks.filter((s) => s.quantite <= s.seuilAlerte).length;
  const missionsActives = missions.filter((m) => m.statut === 'in_progress' || m.statut === 'pending').length;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4">Tableau de bord — Admin Entrepôt</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Gestion du stock et des missions de livraison
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<SyncIcon />} onClick={loadData} disabled={loading} size="small">
            Actualiser
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenModal(true)} size="small">
            Nouvelle Mission
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard label="Articles en stock" value={stocks.length} icon={<InventoryIcon />} color="#4A90D9" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard label="Alertes de stock" value={alertCount} icon={<WarningIcon />} color={alertCount > 0 ? '#E05C5C' : '#4B5563'} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard label="Missions actives" value={missionsActives} icon={<LocalShippingIcon />} color="#34C78A" />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper elevation={2}>
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InventoryIcon sx={{ fontSize: 17 }} />
                Inventaire du Stock
                {alertCount > 0 && (
                  <Chip label={alertCount} color="error" size="small" sx={{ height: 18, fontSize: '0.68rem' }} />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalShippingIcon sx={{ fontSize: 17 }} />
                Missions
                <Chip label={missions.length} color="primary" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.68rem' }} />
              </Box>
            }
          />
        </Tabs>

        <Box sx={{ p: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={30} />
            </Box>
          ) : (
            <>
              {tab === 0 && (
                <Box sx={{ height: 460 }}>
                  <DataGrid
                    rows={stocks} columns={stockColumns}
                    pageSizeOptions={[25, 50, 100]}
                    initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                    getRowClassName={(p) => p.row.quantite <= p.row.seuilAlerte ? 'row-alerte' : ''}
                    sx={gridSx}
                    localeText={{ ...DATAGRID_LOCALE, noRowsLabel: 'Aucun article en stock' }}
                  />
                </Box>
              )}
              {tab === 1 && (
                <Box sx={{ height: 460 }}>
                  <DataGrid
                    rows={missions} columns={missionColumns}
                    pageSizeOptions={[25, 50]}
                    initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                    sx={gridSx}
                    localeText={{ ...DATAGRID_LOCALE, noRowsLabel: 'Aucune mission assignée' }}
                  />
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>

      <CreateMissionModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreated={() => { setOpenModal(false); loadData(); }}
      />
    </Box>
  );
}
