import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * DASHBOARD ADMIN ENTREPÔT
 * ========================
 * Deux sections :
 *   1. DataGrid du stock (MUI X DataGrid) avec badge d'alerte si quantité basse
 *   2. Liste des missions avec bouton "Créer une Mission" → modal
 */
import { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Button, Chip, Alert, CircularProgress, Paper, Tabs, Tab, } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import WarningIcon from '@mui/icons-material/Warning';
import { stockApi, missionApi } from '../../services/api';
import CreateMissionModal from './CreateMissionModal';
// ── Colonnes du DataGrid Stock ─────────────────────────────────────────────
const stockColumns = [
    {
        field: 'materielNom',
        headerName: 'Matériel',
        flex: 1.5,
        valueGetter: (_v, row) => row.materiel.nom,
    },
    {
        field: 'categorie',
        headerName: 'Catégorie',
        width: 130,
        renderCell: (p) => {
            const colors = {
                TENTE: 'info',
                EAU: 'success',
                MEDICAMENT: 'error',
                NOURRITURE: 'warning',
            };
            const cat = p.row.materiel.categorie;
            return _jsx(Chip, { label: cat, color: colors[cat] || 'default', size: "small" });
        },
        valueGetter: (_v, row) => row.materiel.categorie,
    },
    {
        field: 'quantite',
        headerName: 'Quantité',
        width: 110,
        type: 'number',
        renderCell: (p) => {
            const enAlerte = p.row.quantite <= p.row.seuilAlerte;
            return (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 }, children: [enAlerte && _jsx(WarningIcon, { fontSize: "small", color: "error" }), _jsx(Typography, { variant: "body2", fontWeight: "bold", color: enAlerte ? 'error' : 'inherit', children: p.row.quantite })] }));
        },
    },
    {
        field: 'unite',
        headerName: 'Unité',
        width: 90,
        valueGetter: (_v, row) => row.materiel.unite,
    },
    {
        field: 'seuilAlerte',
        headerName: 'Seuil alerte',
        width: 110,
        type: 'number',
    },
    {
        field: 'province',
        headerName: 'Province',
        width: 120,
        valueGetter: (_v, row) => row.entrepot.province,
    },
    {
        field: 'updatedAt',
        headerName: 'Dernière MAJ',
        width: 160,
        valueFormatter: (v) => v ? new Date(v).toLocaleString('fr-MA') : '—',
    },
];
// ── Colonnes du DataGrid Missions ───────────────────────────────────────────
const STATUT_COLOR = {
    draft: 'default',
    pending: 'warning',
    in_progress: 'info',
    completed: 'success',
    annulee: 'error',
};
const missionColumns = [
    { field: 'numeroMission', headerName: 'N° Mission', width: 140 },
    { field: 'destinationNom', headerName: 'Destination', flex: 1 },
    {
        field: 'statut',
        headerName: 'Statut',
        width: 130,
        renderCell: (p) => (_jsx(Chip, { label: p.row.statut.replace('_', ' ').toUpperCase(), color: STATUT_COLOR[p.row.statut], size: "small" })),
    },
    {
        field: 'priorite',
        headerName: 'Priorité',
        width: 100,
        renderCell: (p) => {
            const c = {
                low: 'default', medium: 'warning', high: 'error', critique: 'error',
            };
            return (_jsx(Chip, { label: p.row.priorite, color: c[p.row.priorite], size: "small" }));
        },
    },
    {
        field: 'distributeur',
        headerName: 'Distributeur',
        width: 160,
        valueGetter: (_v, row) => row.distributeur
            ? `${row.distributeur.prenom} ${row.distributeur.nom}`
            : '— Non assigné',
    },
    {
        field: 'dateEcheance',
        headerName: 'Échéance',
        width: 130,
        valueFormatter: (v) => v ? new Date(v).toLocaleDateString('fr-MA') : '—',
    },
];
// ── Composant principal ─────────────────────────────────────────────────────
export default function AdminDashboard() {
    const [tab, setTab] = useState(0);
    const [stocks, setStocks] = useState([]);
    const [missions, setMissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openModal, setOpenModal] = useState(false);
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
        }
        catch {
            setError('Impossible de charger les données. Vérifiez que le backend est démarré.');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { loadData(); }, [loadData]);
    // Compter les articles en alerte pour le badge dans l'onglet
    const alertCount = stocks.filter((s) => s.quantite <= s.seuilAlerte).length;
    return (_jsxs(Box, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h4", fontWeight: "bold", children: "Tableau de bord \u2014 Admin Entrep\u00F4t" }), _jsx(Typography, { color: "text.secondary", children: "Gestion du stock et des missions de livraison" })] }), _jsxs(Box, { sx: { display: 'flex', gap: 1 }, children: [_jsx(Button, { variant: "outlined", startIcon: _jsx(SyncIcon, {}), onClick: loadData, disabled: loading, children: "Actualiser" }), _jsx(Button, { variant: "contained", color: "primary", startIcon: _jsx(AddIcon, {}), onClick: () => setOpenModal(true), children: "Cr\u00E9er une Mission" })] })] }), error && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, onClose: () => setError(null), children: error })), _jsxs(Paper, { elevation: 2, sx: { borderRadius: 2 }, children: [_jsxs(Tabs, { value: tab, onChange: (_e, v) => setTab(v), sx: { borderBottom: 1, borderColor: 'divider', px: 2 }, children: [_jsx(Tab, { label: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: ["Inventaire du Stock", alertCount > 0 && (_jsx(Chip, { label: `${alertCount} alerte${alertCount > 1 ? 's' : ''}`, color: "error", size: "small" }))] }) }), _jsx(Tab, { label: `Missions (${missions.length})` })] }), _jsx(Box, { sx: { p: 2 }, children: loading ? (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', py: 6 }, children: _jsx(CircularProgress, {}) })) : (_jsxs(_Fragment, { children: [tab === 0 && (_jsx(DataGrid, { rows: stocks, columns: stockColumns, autoHeight: true, pageSizeOptions: [25, 50, 100], initialState: { pagination: { paginationModel: { pageSize: 25 } } }, getRowClassName: (p) => p.row.quantite <= p.row.seuilAlerte ? 'row-alerte' : '', sx: {
                                        border: 'none',
                                        '& .row-alerte': { backgroundColor: 'rgba(229,57,53,0.06)' },
                                        '& .MuiDataGrid-columnHeaders': { backgroundColor: '#F4F6F9' },
                                    }, localeText: {
                                        noRowsLabel: 'Aucun article en stock',
                                        MuiTablePagination: { labelRowsPerPage: 'Lignes par page :' },
                                    } })), tab === 1 && (_jsx(DataGrid, { rows: missions, columns: missionColumns, autoHeight: true, pageSizeOptions: [25, 50], initialState: { pagination: { paginationModel: { pageSize: 25 } } }, sx: {
                                        border: 'none',
                                        '& .MuiDataGrid-columnHeaders': { backgroundColor: '#F4F6F9' },
                                    }, localeText: { noRowsLabel: 'Aucune mission assignée' } }))] })) })] }), _jsx(CreateMissionModal, { open: openModal, onClose: () => setOpenModal(false), onCreated: () => { setOpenModal(false); loadData(); } })] }));
}
