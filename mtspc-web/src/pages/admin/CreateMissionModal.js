import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * MODAL CRÉER UNE MISSION
 * =======================
 * Formulaire complet permettant à l'Admin Entrepôt de :
 * - Choisir l'entrepôt source
 * - Assigner un distributeur
 * - Définir la destination (nom + coordonnées GPS pour la carte mobile)
 * - Sélectionner les matériels et quantités
 * - Définir priorité et date d'échéance
 *
 * À la soumission → POST /api/v1/missions → l'Audit Log Interceptor
 * enregistre automatiquement l'action dans audit_logs.
 */
import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Grid, Typography, IconButton, Box, Divider, Alert, CircularProgress, InputAdornment, } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import SendIcon from '@mui/icons-material/Send';
import { missionApi, entrepotApi, distributeurApi, materielApi, } from '../../services/api';
export default function CreateMissionModal({ open, onClose, onCreated }) {
    // Données des listes déroulantes
    const [entrepots, setEntrepots] = useState([]);
    const [distributeurs, setDistributeurs] = useState([]);
    const [materiels, setMateriels] = useState([]);
    // Champs du formulaire
    const [entrepotId, setEntrepotId] = useState('');
    const [distributeurId, setDistributeurId] = useState('');
    const [destination, setDestination] = useState('');
    const [destLat, setDestLat] = useState('');
    const [destLng, setDestLng] = useState('');
    const [priorite, setPriorite] = useState('medium');
    const [echeance, setEcheance] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([
        { materielId: '', quantitePrevue: 1 },
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Charger les listes déroulantes à l'ouverture
    useEffect(() => {
        if (!open)
            return;
        Promise.all([
            entrepotApi.getAll(),
            distributeurApi.getAll(),
            materielApi.getAll(),
        ]).then(([e, d, m]) => {
            setEntrepots(e);
            setDistributeurs(d);
            setMateriels(m);
        }).catch(() => setError('Impossible de charger les données du formulaire.'));
    }, [open]);
    // Ajouter une ligne de matériel
    const addItem = () => setItems((prev) => [...prev, { materielId: '', quantitePrevue: 1 }]);
    // Supprimer une ligne de matériel
    const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));
    // Modifier une ligne de matériel
    const updateItem = (index, field, value) => setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    const handleSubmit = async () => {
        // Validation basique
        if (!entrepotId || !distributeurId || !destination || !echeance) {
            setError('Veuillez remplir tous les champs obligatoires (*).');
            return;
        }
        if (items.some((it) => !it.materielId || it.quantitePrevue < 1)) {
            setError('Chaque ligne de matériel doit avoir un article et une quantité ≥ 1.');
            return;
        }
        const dto = {
            entrepotSourceId: entrepotId,
            distributeurId,
            destinationNom: destination,
            destinationLat: destLat ? parseFloat(destLat) : undefined,
            destinationLng: destLng ? parseFloat(destLng) : undefined,
            priorite,
            dateEcheance: echeance,
            notes: notes || undefined,
            items,
        };
        setLoading(true);
        setError(null);
        try {
            await missionApi.create(dto);
            onCreated(); // Ferme le modal et recharge les données
        }
        catch (err) {
            setError(err.response?.data?.message ||
                'Erreur lors de la création de la mission. Vérifiez les données.');
        }
        finally {
            setLoading(false);
        }
    };
    const handleClose = () => {
        setError(null);
        onClose();
    };
    return (_jsxs(Dialog, { open: open, onClose: handleClose, maxWidth: "md", fullWidth: true, children: [_jsxs(DialogTitle, { sx: { fontWeight: 'bold', pb: 1 }, children: ["Cr\u00E9er une Nouvelle Mission de Livraison", _jsx(Typography, { variant: "body2", color: "text.secondary", children: "L'action sera automatiquement enregistr\u00E9e dans les Audit Logs." })] }), _jsxs(DialogContent, { dividers: true, children: [error && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, onClose: () => setError(null), children: error })), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 12, children: _jsx(Typography, { variant: "subtitle2", color: "primary", fontWeight: "bold", sx: { mb: 1 }, children: "1. Affectation" }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { select: true, fullWidth: true, required: true, size: "small", label: "Entrep\u00F4t source", value: entrepotId, onChange: (e) => setEntrepotId(e.target.value), children: entrepots.map((e) => (_jsxs(MenuItem, { value: e.id, children: [e.nom, " \u2014 ", e.province] }, e.id))) }) }), _jsx(Grid, { item: true, xs: 12, sm: 6, children: _jsx(TextField, { select: true, fullWidth: true, required: true, size: "small", label: "Distributeur assign\u00E9", value: distributeurId, onChange: (e) => setDistributeurId(e.target.value), children: distributeurs
                                        .filter((d) => d.statut === 'disponible')
                                        .map((d) => (_jsxs(MenuItem, { value: d.id, children: [d.prenom, " ", d.nom] }, d.id))) }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(Divider, {}) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(Typography, { variant: "subtitle2", color: "primary", fontWeight: "bold", sx: { mb: 1 }, children: "2. Destination (Zone Sinistr\u00E9e)" }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(TextField, { fullWidth: true, required: true, size: "small", label: "Nom de la destination", placeholder: "Ex : Douar Tizgui \u2014 Commune A\u00EFt Benhaddou, Azilal", value: destination, onChange: (e) => setDestination(e.target.value) }) }), _jsx(Grid, { item: true, xs: 6, children: _jsx(TextField, { fullWidth: true, size: "small", type: "number", label: "Latitude GPS", placeholder: "Ex : 31.9670", value: destLat, onChange: (e) => setDestLat(e.target.value), InputProps: {
                                        startAdornment: _jsx(InputAdornment, { position: "start", children: "\u00B0N" }),
                                    } }) }), _jsx(Grid, { item: true, xs: 6, children: _jsx(TextField, { fullWidth: true, size: "small", type: "number", label: "Longitude GPS", placeholder: "Ex : -6.5728", value: destLng, onChange: (e) => setDestLng(e.target.value), InputProps: {
                                        startAdornment: _jsx(InputAdornment, { position: "start", children: "\u00B0E" }),
                                    } }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(Divider, {}) }), _jsx(Grid, { item: true, xs: 12, children: _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Typography, { variant: "subtitle2", color: "primary", fontWeight: "bold", children: "3. Mat\u00E9riels \u00E0 exp\u00E9dier" }), _jsx(Button, { size: "small", startIcon: _jsx(AddCircleIcon, {}), onClick: addItem, children: "Ajouter un article" })] }) }), items.map((item, idx) => (_jsxs(React.Fragment, { children: [_jsx(Grid, { item: true, xs: 7, children: _jsx(TextField, { select: true, fullWidth: true, required: true, size: "small", label: `Article ${idx + 1}`, value: item.materielId, onChange: (e) => updateItem(idx, 'materielId', e.target.value), children: materiels.map((m) => (_jsxs(MenuItem, { value: m.id, children: [m.nom, " (", m.categorie, ")"] }, m.id))) }) }), _jsx(Grid, { item: true, xs: 4, children: _jsx(TextField, { fullWidth: true, required: true, size: "small", type: "number", label: "Quantit\u00E9", inputProps: { min: 1 }, value: item.quantitePrevue, onChange: (e) => updateItem(idx, 'quantitePrevue', parseInt(e.target.value) || 1) }) }), _jsx(Grid, { item: true, xs: 1, sx: { display: 'flex', alignItems: 'center' }, children: _jsx(IconButton, { color: "error", onClick: () => removeItem(idx), disabled: items.length === 1, size: "small", children: _jsx(RemoveCircleIcon, {}) }) })] }, idx))), _jsx(Grid, { item: true, xs: 12, children: _jsx(Divider, {}) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(Typography, { variant: "subtitle2", color: "primary", fontWeight: "bold", sx: { mb: 1 }, children: "4. Planification" }) }), _jsx(Grid, { item: true, xs: 4, children: _jsxs(TextField, { select: true, fullWidth: true, required: true, size: "small", label: "Priorit\u00E9", value: priorite, onChange: (e) => setPriorite(e.target.value), children: [_jsx(MenuItem, { value: "low", children: "Basse" }), _jsx(MenuItem, { value: "medium", children: "Normale" }), _jsx(MenuItem, { value: "high", children: "Haute" }), _jsx(MenuItem, { value: "critique", children: "CRITIQUE" })] }) }), _jsx(Grid, { item: true, xs: 8, children: _jsx(TextField, { fullWidth: true, required: true, size: "small", type: "datetime-local", label: "Date d'\u00E9ch\u00E9ance *", value: echeance, onChange: (e) => setEcheance(e.target.value), InputLabelProps: { shrink: true } }) }), _jsx(Grid, { item: true, xs: 12, children: _jsx(TextField, { fullWidth: true, multiline: true, rows: 2, size: "small", label: "Notes pour le distributeur (optionnel)", placeholder: "Consignes sp\u00E9ciales, point de rendez-vous, contact sur place\u2026", value: notes, onChange: (e) => setNotes(e.target.value) }) })] })] }), _jsxs(DialogActions, { sx: { p: 2, gap: 1 }, children: [_jsx(Button, { onClick: handleClose, disabled: loading, variant: "outlined", children: "Annuler" }), _jsx(Button, { onClick: handleSubmit, disabled: loading, variant: "contained", color: "primary", startIcon: loading ? _jsx(CircularProgress, { size: 16 }) : _jsx(SendIcon, {}), children: loading ? 'Création en cours…' : 'Créer la Mission' })] })] }));
}
