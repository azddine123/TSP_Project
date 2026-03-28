/**
 * DASHBOARD SUPER-ADMIN
 * Carte + Audit Logs — Design simple et lisible
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Grid, Paper, Chip, Alert,
  CircularProgress, Tooltip, Button, TextField, MenuItem,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import SyncIcon       from '@mui/icons-material/Sync';
import FilterListIcon from '@mui/icons-material/FilterList';
import WarehouseIcon  from '@mui/icons-material/Warehouse';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { auditApi, entrepotApi } from '../../services/api';
import type { AuditLog, Entrepot } from '../../types';
import {
  AUDIT_OPERATION_COLOR, ENTREPOT_STATUT_COLOR,
  DATAGRID_LOCALE, formatDateTime,
} from '../../constants';
import './SuperAdminDashboard.css';

// Leaflet fix
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createColoredIcon = (color: string) => new L.Icon({
  iconUrl:     `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl:   'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:    [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const ICONS: Record<string, L.Icon> = {
  actif: createColoredIcon('green'), surcharge: createColoredIcon('red'), inactif: createColoredIcon('grey'),
};

const OPERATIONS = [
  { value: '', label: 'Toutes les opérations' },
  { value: 'INSERT', label: 'INSERT' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
];

const auditColumns: GridColDef[] = [
  {
    field: 'createdAt', headerName: 'Date & Heure', width: 160,
    renderCell: (p: GridRenderCellParams<AuditLog>) => (
      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontFamily: 'monospace' }}>
        {formatDateTime(p.row.createdAt)}
      </Typography>
    ),
  },
  {
    field: 'operation', headerName: 'Opération', width: 115,
    renderCell: (p: GridRenderCellParams<AuditLog>) => (
      <Chip label={p.row.operation} color={AUDIT_OPERATION_COLOR[p.row.operation]} size="small"
        sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
    ),
  },
  {
    field: 'tableCible', headerName: 'Table', width: 155,
    renderCell: (p: GridRenderCellParams<AuditLog>) => (
      <Typography sx={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'text.secondary' }}>
        {p.row.tableCible}
      </Typography>
    ),
  },
  {
    field: 'acteurEmail', headerName: 'Acteur', flex: 1,
    renderCell: (p: GridRenderCellParams<AuditLog>) => (
      <Box>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 500 }}>
          {p.row.acteurEmail || p.row.acteurUserId.slice(0, 8) + '…'}
        </Typography>
        <Chip label={p.row.acteurRole} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18 }} />
      </Box>
    ),
  },
  {
    field: 'ipAddress', headerName: 'Adresse IP', width: 130,
    renderCell: (p: GridRenderCellParams<AuditLog>) => (
      <Typography sx={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'text.secondary' }}>
        {p.row.ipAddress || '—'}
      </Typography>
    ),
  },
  {
    field: 'valeursApres', headerName: 'Données modifiées', flex: 1.5,
    renderCell: (p: GridRenderCellParams<AuditLog>) => {
      const val = p.row.valeursApres;
      if (!val) return <Typography sx={{ color: 'text.disabled', fontSize: '0.8rem' }}>—</Typography>;
      const str = JSON.stringify(val).slice(0, 80);
      return (
        <Tooltip title={<pre className="audit-json-tooltip">{JSON.stringify(val, null, 2)}</pre>}>
          <Typography sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {str}{str.length >= 80 ? '…' : ''}
          </Typography>
        </Tooltip>
      );
    },
  },
];

// ── Stat Card simple ──────────────────────────────────────────────────────────
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
        <Typography variant="h5" fontWeight={700} color={color} lineHeight={1}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.3}>
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const CENTER: [number, number] = [32.2, -6.0];

export default function SuperAdminDashboard() {
  const [entrepots,       setEntrepots]       = useState<Entrepot[]>([]);
  const [auditLogs,       setAuditLogs]       = useState<AuditLog[]>([]);
  const [total,           setTotal]           = useState(0);
  const [page,            setPage]            = useState(0);
  const [operationFilter, setOperationFilter] = useState('');
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [e, logs] = await Promise.all([
        entrepotApi.getAll(),
        auditApi.getLogs({ page: page + 1, limit: 50, operation: operationFilter || undefined }),
      ]);
      setEntrepots(e); setAuditLogs(logs.data); setTotal(logs.meta.total);
    } catch {
      setError('Impossible de charger les données. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [page, operationFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const actifs    = entrepots.filter((e) => e.statut === 'actif').length;
  const surcharge = entrepots.filter((e) => e.statut === 'surcharge').length;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4">Tableau de bord — Super-Admin</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Vue régionale Béni Mellal-Khénifra · Audit inaltérable des actions
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<SyncIcon />} onClick={loadData} disabled={loading} size="small">
          Actualiser
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard label="Entrepôts dans la région" value={entrepots.length} icon={<WarehouseIcon />} color="#4A90D9" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard label="Entrepôts actifs" value={actifs} icon={<CheckCircleIcon />} color="#34C78A" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard label="En surcharge" value={surcharge} icon={<WarningAmberIcon />} color={surcharge > 0 ? '#E05C5C' : '#4B5563'} />
        </Grid>
      </Grid>

      {/* Main panels */}
      <Grid container spacing={2.5}>

        {/* Carte */}
        <Grid item xs={12} lg={5}>
          <Paper elevation={2} sx={{ overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6">Carte des Entrepôts Régionaux</Typography>
              <Typography variant="body2" color="text.secondary">{entrepots.length} entrepôt(s) dans la région</Typography>
            </Box>

            <MapContainer center={CENTER} zoom={8} className="leaflet-map-container">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {entrepots.map((e) => (
                <React.Fragment key={e.id}>
                  <Circle center={[e.latitude, e.longitude]} radius={15000}
                    pathOptions={{ color: e.statut === 'surcharge' ? '#E05C5C' : '#4A90D9', fillOpacity: 0.07, weight: 1 }} />
                  <Marker position={[e.latitude, e.longitude]} icon={ICONS[e.statut] ?? ICONS.actif}>
                    <Popup>
                      <div className="popup-entrepot">
                        <strong className="popup-entrepot-title">{e.nom}</strong>
                        <p className="popup-entrepot-subtitle">{e.province} · {e.wilaya}</p>
                        <span className={`popup-entrepot-statut popup-entrepot-statut--${e.statut}`}>
                          {e.statut.toUpperCase()}
                        </span>
                        <p className="popup-entrepot-gps">GPS : {e.latitude.toFixed(4)}, {e.longitude.toFixed(4)}</p>
                        <p className="popup-entrepot-code">Code : {e.code}</p>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}
            </MapContainer>

            <Box sx={{ px: 2.5, py: 1.5, display: 'flex', gap: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
              {[{ statut: 'actif', label: 'Actif' }, { statut: 'surcharge', label: 'En surcharge' }, { statut: 'inactif', label: 'Inactif' }].map(({ statut, label }) => (
                <Box key={statut} sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ENTREPOT_STATUT_COLOR[statut] }} />
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Audit logs */}
        <Grid item xs={12} lg={7}>
          <Paper elevation={2}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6">Historique Inaltérable des Actions</Typography>
                  <Chip label="LECTURE SEULE" color="error" size="small" />
                </Box>
                <Typography variant="body2" color="text.secondary">{total} entrée(s)</Typography>
              </Box>
              <TextField
                select size="small" value={operationFilter}
                onChange={(e) => { setPage(0); setOperationFilter(e.target.value); }}
                sx={{ minWidth: 200 }}
                InputProps={{ startAdornment: <FilterListIcon fontSize="small" sx={{ mr: 0.5, color: 'text.disabled', fontSize: 17 }} /> }}
              >
                {OPERATIONS.map((op) => <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>)}
              </TextField>
            </Box>

            <Box sx={{ p: 1 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={30} />
                </Box>
              ) : (
                <DataGrid
                  rows={auditLogs} columns={auditColumns}
                  rowHeight={58}
                  pageSizeOptions={[25, 50]}
                  rowCount={total} paginationMode="server"
                  paginationModel={{ page, pageSize: 50 }}
                  onPaginationModelChange={(m) => setPage(m.page)}
                  disableRowSelectionOnClick
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(0,0,0,0.15)' },
                    '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(255,255,255,0.03)' },
                    '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(255,255,255,0.04)' },
                    '& .row-delete': { backgroundColor: 'rgba(224,92,92,0.05)' },
                  }}
                  getRowClassName={(p) => (p.row as AuditLog).operation === 'DELETE' ? 'row-delete' : ''}
                  localeText={{ ...DATAGRID_LOCALE, noRowsLabel: operationFilter ? `Aucune opération "${operationFilter}"` : 'Aucune action enregistrée' }}
                />
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
