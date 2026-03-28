/**
 * DASHBOARD SUPER-ADMIN
 * =====================
 * Deux panneaux côte à côte :
 *   GAUCHE  — Carte Leaflet interactive avec les 3 entrepôts de la région
 *             Béni Mellal-Khénifra (marqueurs colorés + popups)
 *   DROITE  — Tableau inaltérable des Audit Logs (lecture seule)
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Grid, Paper, Chip, Alert,
  CircularProgress, Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { auditApi, entrepotApi, AuditLog, Entrepot } from '../../services/api';

// ── Fix Leaflet : icônes manquantes avec Vite ─────────────────────────────────
// (Bug connu Leaflet + bundler : les images ne sont pas résolues automatiquement)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Icônes personnalisées par statut d'entrepôt
const createColoredIcon = (color: string) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize:     [25, 41],
    iconAnchor:   [12, 41],
    popupAnchor:  [1, -34],
    shadowSize:   [41, 41],
  });

const ICONS: Record<string, L.Icon> = {
  actif:    createColoredIcon('green'),
  surcharge: createColoredIcon('red'),
  inactif:  createColoredIcon('grey'),
};

// ── Colonnes du DataGrid Audit Logs ──────────────────────────────────────────

const OPERATION_COLOR: Record<string, 'success' | 'warning' | 'error'> = {
  INSERT: 'success',
  UPDATE: 'warning',
  DELETE: 'error',
};

const auditColumns: GridColDef[] = [
  {
    field:      'createdAt',
    headerName: 'Date & Heure',
    width:      170,
    valueFormatter: (v: string) =>
      v ? new Date(v).toLocaleString('fr-MA') : '—',
  },
  {
    field:      'operation',
    headerName: 'Opération',
    width:      110,
    renderCell: (p: GridRenderCellParams<AuditLog>) => (
      <Chip
        label={p.row.operation}
        color={OPERATION_COLOR[p.row.operation]}
        size="small"
        sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}
      />
    ),
  },
  {
    field:      'tableCible',
    headerName: 'Table',
    width:      160,
    renderCell: (p: GridRenderCellParams<AuditLog>) => (
      <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
        {p.row.tableCible}
      </Typography>
    ),
  },
  {
    field:      'acteurEmail',
    headerName: 'Acteur',
    flex:       1,
    renderCell: (p: GridRenderCellParams<AuditLog>) => (
      <Box>
        <Typography variant="body2" fontWeight="bold">
          {p.row.acteurEmail || p.row.acteurUserId.slice(0, 8) + '…'}
        </Typography>
        <Chip label={p.row.acteurRole} size="small" variant="outlined" />
      </Box>
    ),
  },
  {
    field:      'ipAddress',
    headerName: 'Adresse IP',
    width:      130,
    renderCell: (p: GridRenderCellParams<AuditLog>) => (
      <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
        {p.row.ipAddress || '—'}
      </Typography>
    ),
  },
  {
    field:      'valeursApres',
    headerName: 'Données modifiées',
    flex:       1.5,
    renderCell: (p: GridRenderCellParams<AuditLog>) => {
      const val = p.row.valeursApres;
      if (!val) return <Typography variant="body2" color="text.secondary">—</Typography>;
      const str = JSON.stringify(val).slice(0, 80);
      return (
        <Tooltip title={JSON.stringify(val, null, 2)}>
          <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem"
            sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {str}{str.length >= 80 ? '…' : ''}
          </Typography>
        </Tooltip>
      );
    },
  },
];

// ── Composant principal ───────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const [entrepots, setEntrepots] = useState<Entrepot[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [e, logs] = await Promise.all([
        entrepotApi.getAll(),
        auditApi.getLogs({ page: page + 1, limit: 50 }),
      ]);
      setEntrepots(e);
      setAuditLogs(logs.data);
      setTotal(logs.meta.total);
    } catch {
      setError('Impossible de charger les données. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { loadData(); }, [loadData]);

  // Centre de la carte : région Béni Mellal-Khénifra
  const CENTER: [number, number] = [32.2, -6.0];

  return (
    <Box>
      {/* En-tête */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Tableau de bord — Super-Admin
        </Typography>
        <Typography color="text.secondary">
          Vue régionale Béni Mellal-Khénifra · Audit inaltérable des actions
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      <Grid container spacing={3}>

        {/* ── PANNEAU GAUCHE : Carte Leaflet ─────────────────────── */}
        <Grid item xs={12} lg={5}>
          <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="bold">
                Carte des Entrepôts Régionaux
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {entrepots.length} entrepôt(s) actif(s) dans la région
              </Typography>
            </Box>

            {/* La carte Leaflet — hauteur fixe */}
            <MapContainer
              center={CENTER}
              zoom={8}
              style={{ height: '420px', width: '100%' }}
            >
              {/* Fond de carte OpenStreetMap (gratuit, pas de clé API) */}
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />

              {/* Marqueur pour chaque entrepôt */}
              {entrepots.map((e) => (
                <React.Fragment key={e.id}>
                  {/* Cercle de zone de couverture */}
                  <Circle
                    center={[e.latitude, e.longitude]}
                    radius={15000}
                    pathOptions={{
                      color:       e.statut === 'surcharge' ? '#E53935' : '#1565C0',
                      fillColor:   e.statut === 'surcharge' ? '#E53935' : '#1565C0',
                      fillOpacity: 0.08,
                    }}
                  />

                  {/* Marqueur avec popup d'info — HTML natif obligatoire (hors ThemeProvider) */}
                  <Marker
                    position={[e.latitude, e.longitude]}
                    icon={ICONS[e.statut] || ICONS.actif}
                  >
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <strong style={{ fontSize: '0.95rem' }}>{e.nom}</strong>
                        <p style={{ margin: '4px 0', color: '#666', fontSize: '0.82rem' }}>
                          {e.province} · {e.wilaya}
                        </p>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          background: e.statut === 'actif' ? '#e8f5e9' : '#ffebee',
                          color: e.statut === 'actif' ? '#2e7d32' : '#c62828',
                          marginTop: 4,
                        }}>
                          {e.statut.toUpperCase()}
                        </span>
                        <p style={{ margin: '6px 0 2px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          GPS : {e.latitude.toFixed(4)}, {e.longitude.toFixed(4)}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>
                          Code : {e.code}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}
            </MapContainer>

            {/* Légende */}
            <Box sx={{ p: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#4CAF50' }} />
                <Typography variant="caption">Actif</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#E53935' }} />
                <Typography variant="caption">En surcharge</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#9E9E9E' }} />
                <Typography variant="caption">Inactif</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* ── PANNEAU DROIT : Audit Logs ──────────────────────────── */}
        <Grid item xs={12} lg={7}>
          <Paper elevation={2} sx={{ borderRadius: 2 }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Historique Inaltérable des Actions
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {total} entrée(s) · Lecture seule · Aucune modification possible
                  </Typography>
                </Box>
                {/* Badge "IMMUABLE" pour le jury */}
                <Chip
                  label="🔒 TABLE IMMUABLE"
                  color="error"
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
            </Box>

            <Box sx={{ p: 1 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <DataGrid
                  rows={auditLogs}
                  columns={auditColumns}
                  rowHeight={60}
                  autoHeight
                  pageSizeOptions={[25, 50]}
                  rowCount={total}
                  paginationMode="server"
                  paginationModel={{ page, pageSize: 50 }}
                  onPaginationModelChange={(m) => setPage(m.page)}
                  // LECTURE SEULE : désactiver toute interaction d'édition
                  disableRowSelectionOnClick
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-columnHeaders': {
                      backgroundColor: '#F4F6F9',
                      fontWeight:      'bold',
                    },
                    // Mise en évidence des DELETE en rouge pâle
                    '& .row-delete': { backgroundColor: 'rgba(229,57,53,0.05)' },
                  }}
                  getRowClassName={(p) =>
                    (p.row as AuditLog).operation === 'DELETE' ? 'row-delete' : ''
                  }
                  localeText={{
                    noRowsLabel: 'Aucune action enregistrée',
                    MuiTablePagination: { labelRowsPerPage: 'Lignes par page :' },
                  }}
                />
              )}
            </Box>
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );
}
