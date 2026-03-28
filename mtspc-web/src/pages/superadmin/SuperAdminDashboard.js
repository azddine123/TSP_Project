import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * DASHBOARD SUPER-ADMIN
 * =====================
 * Deux panneaux côte à côte :
 *   GAUCHE  — Carte Leaflet interactive avec les 3 entrepôts de la région
 *             Béni Mellal-Khénifra (marqueurs colorés + popups)
 *   DROITE  — Tableau inaltérable des Audit Logs (lecture seule)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Grid, Paper, Chip, Alert, CircularProgress, Tooltip, } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { auditApi, entrepotApi } from '../../services/api';
// ── Fix Leaflet : icônes manquantes avec Vite ─────────────────────────────────
// (Bug connu Leaflet + bundler : les images ne sont pas résolues automatiquement)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
// Icônes personnalisées par statut d'entrepôt
const createColoredIcon = (color) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});
const ICONS = {
    actif: createColoredIcon('green'),
    surcharge: createColoredIcon('red'),
    inactif: createColoredIcon('grey'),
};
// ── Colonnes du DataGrid Audit Logs ──────────────────────────────────────────
const OPERATION_COLOR = {
    INSERT: 'success',
    UPDATE: 'warning',
    DELETE: 'error',
};
const auditColumns = [
    {
        field: 'createdAt',
        headerName: 'Date & Heure',
        width: 170,
        valueFormatter: (v) => v ? new Date(v).toLocaleString('fr-MA') : '—',
    },
    {
        field: 'operation',
        headerName: 'Opération',
        width: 110,
        renderCell: (p) => (_jsx(Chip, { label: p.row.operation, color: OPERATION_COLOR[p.row.operation], size: "small", sx: { fontWeight: 'bold', fontFamily: 'monospace' } })),
    },
    {
        field: 'tableCible',
        headerName: 'Table',
        width: 160,
        renderCell: (p) => (_jsx(Typography, { variant: "body2", fontFamily: "monospace", fontSize: "0.8rem", children: p.row.tableCible })),
    },
    {
        field: 'acteurEmail',
        headerName: 'Acteur',
        flex: 1,
        renderCell: (p) => (_jsxs(Box, { children: [_jsx(Typography, { variant: "body2", fontWeight: "bold", children: p.row.acteurEmail || p.row.acteurUserId.slice(0, 8) + '…' }), _jsx(Chip, { label: p.row.acteurRole, size: "small", variant: "outlined" })] })),
    },
    {
        field: 'ipAddress',
        headerName: 'Adresse IP',
        width: 130,
        renderCell: (p) => (_jsx(Typography, { variant: "body2", fontFamily: "monospace", fontSize: "0.8rem", children: p.row.ipAddress || '—' })),
    },
    {
        field: 'valeursApres',
        headerName: 'Données modifiées',
        flex: 1.5,
        renderCell: (p) => {
            const val = p.row.valeursApres;
            if (!val)
                return _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u2014" });
            const str = JSON.stringify(val).slice(0, 80);
            return (_jsx(Tooltip, { title: JSON.stringify(val, null, 2), children: _jsxs(Typography, { variant: "body2", fontFamily: "monospace", fontSize: "0.75rem", sx: { overflow: 'hidden', textOverflow: 'ellipsis' }, children: [str, str.length >= 80 ? '…' : ''] }) }));
        },
    },
];
// ── Composant principal ───────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
    const [entrepots, setEntrepots] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
        }
        catch {
            setError('Impossible de charger les données. Vérifiez votre connexion.');
        }
        finally {
            setLoading(false);
        }
    }, [page]);
    useEffect(() => { loadData(); }, [loadData]);
    // Centre de la carte : région Béni Mellal-Khénifra
    const CENTER = [32.2, -6.0];
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { mb: 3 }, children: [_jsx(Typography, { variant: "h4", fontWeight: "bold", children: "Tableau de bord \u2014 Super-Admin" }), _jsx(Typography, { color: "text.secondary", children: "Vue r\u00E9gionale B\u00E9ni Mellal-Kh\u00E9nifra \u00B7 Audit inalt\u00E9rable des actions" })] }), error && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, children: error })), _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, lg: 5, children: _jsxs(Paper, { elevation: 2, sx: { borderRadius: 2, overflow: 'hidden' }, children: [_jsxs(Box, { sx: { p: 2, borderBottom: 1, borderColor: 'divider' }, children: [_jsx(Typography, { variant: "h6", fontWeight: "bold", children: "Carte des Entrep\u00F4ts R\u00E9gionaux" }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: [entrepots.length, " entrep\u00F4t(s) actif(s) dans la r\u00E9gion"] })] }), _jsxs(MapContainer, { center: CENTER, zoom: 8, style: { height: '420px', width: '100%' }, children: [_jsx(TileLayer, { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '\u00A9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }), entrepots.map((e) => (_jsxs(React.Fragment, { children: [_jsx(Circle, { center: [e.latitude, e.longitude], radius: 15000, pathOptions: {
                                                        color: e.statut === 'surcharge' ? '#E53935' : '#1565C0',
                                                        fillColor: e.statut === 'surcharge' ? '#E53935' : '#1565C0',
                                                        fillOpacity: 0.08,
                                                    } }), _jsx(Marker, { position: [e.latitude, e.longitude], icon: ICONS[e.statut] || ICONS.actif, children: _jsx(Popup, { children: _jsxs("div", { style: { minWidth: 180 }, children: [_jsx("strong", { style: { fontSize: '0.95rem' }, children: e.nom }), _jsxs("p", { style: { margin: '4px 0', color: '#666', fontSize: '0.82rem' }, children: [e.province, " \u00B7 ", e.wilaya] }), _jsx("span", { style: {
                                                                        display: 'inline-block',
                                                                        padding: '2px 8px',
                                                                        borderRadius: 12,
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 'bold',
                                                                        background: e.statut === 'actif' ? '#e8f5e9' : '#ffebee',
                                                                        color: e.statut === 'actif' ? '#2e7d32' : '#c62828',
                                                                        marginTop: 4,
                                                                    }, children: e.statut.toUpperCase() }), _jsxs("p", { style: { margin: '6px 0 2px', fontSize: '0.75rem', fontFamily: 'monospace' }, children: ["GPS : ", e.latitude.toFixed(4), ", ", e.longitude.toFixed(4)] }), _jsxs("p", { style: { margin: 0, fontSize: '0.75rem', color: '#888' }, children: ["Code : ", e.code] })] }) }) })] }, e.id)))] }), _jsxs(Box, { sx: { p: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap' }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 }, children: [_jsx(Box, { sx: { width: 12, height: 12, borderRadius: '50%', bgcolor: '#4CAF50' } }), _jsx(Typography, { variant: "caption", children: "Actif" })] }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 }, children: [_jsx(Box, { sx: { width: 12, height: 12, borderRadius: '50%', bgcolor: '#E53935' } }), _jsx(Typography, { variant: "caption", children: "En surcharge" })] }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 }, children: [_jsx(Box, { sx: { width: 12, height: 12, borderRadius: '50%', bgcolor: '#9E9E9E' } }), _jsx(Typography, { variant: "caption", children: "Inactif" })] })] })] }) }), _jsx(Grid, { item: true, xs: 12, lg: 7, children: _jsxs(Paper, { elevation: 2, sx: { borderRadius: 2 }, children: [_jsx(Box, { sx: { p: 2, borderBottom: 1, borderColor: 'divider' }, children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", fontWeight: "bold", children: "Historique Inalt\u00E9rable des Actions" }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: [total, " entr\u00E9e(s) \u00B7 Lecture seule \u00B7 Aucune modification possible"] })] }), _jsx(Chip, { label: "\uD83D\uDD12 TABLE IMMUABLE", color: "error", size: "small", sx: { fontWeight: 'bold' } })] }) }), _jsx(Box, { sx: { p: 1 }, children: loading ? (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', py: 6 }, children: _jsx(CircularProgress, {}) })) : (_jsx(DataGrid, { rows: auditLogs, columns: auditColumns, rowHeight: 60, autoHeight: true, pageSizeOptions: [25, 50], rowCount: total, paginationMode: "server", paginationModel: { page, pageSize: 50 }, onPaginationModelChange: (m) => setPage(m.page), 
                                        // LECTURE SEULE : désactiver toute interaction d'édition
                                        disableRowSelectionOnClick: true, sx: {
                                            border: 'none',
                                            '& .MuiDataGrid-columnHeaders': {
                                                backgroundColor: '#F4F6F9',
                                                fontWeight: 'bold',
                                            },
                                            // Mise en évidence des DELETE en rouge pâle
                                            '& .row-delete': { backgroundColor: 'rgba(229,57,53,0.05)' },
                                        }, getRowClassName: (p) => p.row.operation === 'DELETE' ? 'row-delete' : '', localeText: {
                                            noRowsLabel: 'Aucune action enregistrée',
                                            MuiTablePagination: { labelRowsPerPage: 'Lignes par page :' },
                                        } })) })] }) })] })] }));
}
