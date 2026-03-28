/**
 * DASHBOARD ADMIN ENTREPÔT
 * ========================
 * Deux sections :
 *   1. DataGrid du stock (MUI X DataGrid) avec badge d'alerte si quantité basse
 *   2. Liste des missions avec bouton "Créer une Mission" → modal
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, Alert, CircularProgress,
  Paper, Tabs, Tab,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import AddIcon        from '@mui/icons-material/Add';
import SyncIcon       from '@mui/icons-material/Sync';
import WarningIcon    from '@mui/icons-material/Warning';
import { stockApi, missionApi, StockRow, Mission } from '../../services/api';
import CreateMissionModal from './CreateMissionModal';

// ── Colonnes du DataGrid Stock ─────────────────────────────────────────────

const stockColumns: GridColDef[] = [
  {
    field:      'materielNom',
    headerName: 'Matériel',
    flex:       1.5,
    valueGetter: (_v: any, row: StockRow) => row.materiel.nom,
  },
  {
    field:      'categorie',
    headerName: 'Catégorie',
    width:      130,
    renderCell: (p: GridRenderCellParams<StockRow>) => {
      const colors: Record<string, 'error' | 'warning' | 'info' | 'success'> = {
        TENTE:       'info',
        EAU:         'success',
        MEDICAMENT:  'error',
        NOURRITURE:  'warning',
      };
      const cat = p.row.materiel.categorie;
      return <Chip label={cat} color={colors[cat] || 'default'} size="small" />;
    },
    valueGetter: (_v: any, row: StockRow) => row.materiel.categorie,
  },
  {
    field:      'quantite',
    headerName: 'Quantité',
    width:      110,
    type:       'number',
    renderCell: (p: GridRenderCellParams<StockRow>) => {
      const enAlerte = p.row.quantite <= p.row.seuilAlerte;
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {enAlerte && <WarningIcon fontSize="small" color="error" />}
          <Typography
            variant="body2"
            fontWeight="bold"
            color={enAlerte ? 'error' : 'inherit'}
          >
            {p.row.quantite}
          </Typography>
        </Box>
      );
    },
  },
  {
    field:      'unite',
    headerName: 'Unité',
    width:      90,
    valueGetter: (_v: any, row: StockRow) => row.materiel.unite,
  },
  {
    field:      'seuilAlerte',
    headerName: 'Seuil alerte',
    width:      110,
    type:       'number',
  },
  {
    field:      'province',
    headerName: 'Province',
    width:      120,
    valueGetter: (_v: any, row: StockRow) => row.entrepot.province,
  },
  {
    field:      'updatedAt',
    headerName: 'Dernière MAJ',
    width:      160,
    valueFormatter: (v: string) =>
      v ? new Date(v).toLocaleString('fr-MA') : '—',
  },
];

// ── Colonnes du DataGrid Missions ───────────────────────────────────────────

const STATUT_COLOR: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  draft:       'default',
  pending:     'warning',
  in_progress: 'info',
  completed:   'success',
  annulee:     'error',
};

const missionColumns: GridColDef[] = [
  { field: 'numeroMission',  headerName: 'N° Mission', width: 140 },
  { field: 'destinationNom', headerName: 'Destination', flex: 1 },
  {
    field:      'statut',
    headerName: 'Statut',
    width:      130,
    renderCell: (p: GridRenderCellParams<Mission>) => (
      <Chip
        label={p.row.statut.replace('_', ' ').toUpperCase()}
        color={STATUT_COLOR[p.row.statut]}
        size="small"
      />
    ),
  },
  {
    field:      'priorite',
    headerName: 'Priorité',
    width:      100,
    renderCell: (p: GridRenderCellParams<Mission>) => {
      const c: Record<string, any> = {
        low: 'default', medium: 'warning', high: 'error', critique: 'error',
      };
      return (
        <Chip label={p.row.priorite} color={c[p.row.priorite]} size="small" />
      );
    },
  },
  {
    field:      'distributeur',
    headerName: 'Distributeur',
    width:      160,
    valueGetter: (_v: any, row: Mission) =>
      row.distributeur
        ? `${row.distributeur.prenom} ${row.distributeur.nom}`
        : '— Non assigné',
  },
  {
    field:      'dateEcheance',
    headerName: 'Échéance',
    width:      130,
    valueFormatter: (v: string) =>
      v ? new Date(v).toLocaleDateString('fr-MA') : '—',
  },
];

// ── Composant principal ─────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [tab,             setTab]             = useState(0);
  const [stocks,          setStocks]          = useState<StockRow[]>([]);
  const [missions,        setMissions]        = useState<Mission[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [openModal,       setOpenModal]       = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, m] = await Promise.all([
        stockApi.getAll(),
        missionApi.getAll(),
      ]);
      setStocks(s);
      setMissions(m);
    } catch {
      setError('Impossible de charger les données. Vérifiez que le backend est démarré.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Compter les articles en alerte pour le badge dans l'onglet
  const alertCount = stocks.filter((s) => s.quantite <= s.seuilAlerte).length;

  return (
    <Box>
      {/* En-tête */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Tableau de bord — Admin Entrepôt
          </Typography>
          <Typography color="text.secondary">
            Gestion du stock et des missions de livraison
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={loadData}
            disabled={loading}
          >
            Actualiser
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenModal(true)}
          >
            Créer une Mission
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Onglets Stock / Missions */}
      <Paper elevation={2} sx={{ borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Inventaire du Stock
                {alertCount > 0 && (
                  <Chip
                    label={`${alertCount} alerte${alertCount > 1 ? 's' : ''}`}
                    color="error"
                    size="small"
                  />
                )}
              </Box>
            }
          />
          <Tab label={`Missions (${missions.length})`} />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* ── Onglet 0 : Stock ─────────────────────────────────── */}
              {tab === 0 && (
                <DataGrid
                  rows={stocks}
                  columns={stockColumns}
                  autoHeight
                  pageSizeOptions={[25, 50, 100]}
                  initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                  getRowClassName={(p) =>
                    p.row.quantite <= p.row.seuilAlerte ? 'row-alerte' : ''
                  }
                  sx={{
                    border: 'none',
                    '& .row-alerte': { backgroundColor: 'rgba(229,57,53,0.06)' },
                    '& .MuiDataGrid-columnHeaders': { backgroundColor: '#F4F6F9' },
                  }}
                  localeText={{
                    noRowsLabel: 'Aucun article en stock',
                    MuiTablePagination: { labelRowsPerPage: 'Lignes par page :' },
                  }}
                />
              )}

              {/* ── Onglet 1 : Missions ──────────────────────────────── */}
              {tab === 1 && (
                <DataGrid
                  rows={missions}
                  columns={missionColumns}
                  autoHeight
                  pageSizeOptions={[25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-columnHeaders': { backgroundColor: '#F4F6F9' },
                  }}
                  localeText={{ noRowsLabel: 'Aucune mission assignée' }}
                />
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* Modal Créer une Mission */}
      <CreateMissionModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreated={() => { setOpenModal(false); loadData(); }}
      />
    </Box>
  );
}
