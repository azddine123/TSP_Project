/**
 * MODAL CRÉER UNE MISSION
 * =======================
 * Formulaire complet permettant à l'Admin Entrepôt de :
 * - Choisir l'entrepôt source et assigner un distributeur
 * - Définir la destination (nom + coordonnées GPS)
 * - Sélectionner les matériels et quantités
 * - Définir priorité et date d'échéance
 *
 * Corrections v2 :
 *  - Reset complet du formulaire à chaque ouverture
 *  - Highlighting des champs requis non remplis à la soumission
 *  - Utilisation de getApiErrorMessage pour les messages d'erreur
 */
import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, Typography,
  IconButton, Box, Divider, Alert, CircularProgress,
  InputAdornment,
} from '@mui/material';
import AddCircleIcon    from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import SendIcon         from '@mui/icons-material/Send';
import {
  missionApi, entrepotApi, distributeurApi, materielApi,
  getApiErrorMessage,
} from '../../services/api';
import type { Entrepot, Distributeur, Materiel, CreateMissionDto, MissionPriorite } from '../../types';
import { MISSION_PRIORITE_LABEL } from '../../constants';

interface Props {
  open:      boolean;
  onClose:   () => void;
  onCreated: () => void;
}

interface MissionItem {
  materielId:     string;
  quantitePrevue: number;
}

const INITIAL_ITEMS: MissionItem[] = [{ materielId: '', quantitePrevue: 1 }];

export default function CreateMissionModal({ open, onClose, onCreated }: Props) {
  // Données des listes déroulantes
  const [entrepots,     setEntrepots]     = useState<Entrepot[]>([]);
  const [distributeurs, setDistributeurs] = useState<Distributeur[]>([]);
  const [materiels,     setMateriels]     = useState<Materiel[]>([]);

  // Champs du formulaire
  const [entrepotId,     setEntrepotId]     = useState('');
  const [distributeurId, setDistributeurId] = useState('');
  const [destination,    setDestination]    = useState('');
  const [destLat,        setDestLat]        = useState('');
  const [destLng,        setDestLng]        = useState('');
  const [priorite,       setPriorite]       = useState<MissionPriorite>('medium');
  const [echeance,       setEcheance]       = useState('');
  const [notes,          setNotes]          = useState('');
  const [items,          setItems]          = useState<MissionItem[]>(INITIAL_ITEMS);

  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  // Champs touchés pour afficher les erreurs de validation
  const [submitted, setSubmitted] = useState(false);

  // Reset complet à chaque ouverture du modal
  useEffect(() => {
    if (!open) return;
    setEntrepotId('');
    setDistributeurId('');
    setDestination('');
    setDestLat('');
    setDestLng('');
    setPriorite('medium');
    setEcheance('');
    setNotes('');
    setItems(INITIAL_ITEMS);
    setError(null);
    setSubmitted(false);
  }, [open]);

  // Charger les listes déroulantes à l'ouverture
  useEffect(() => {
    if (!open) return;
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

  const addItem = () =>
    setItems((prev) => [...prev, { materielId: '', quantitePrevue: 1 }]);

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof MissionItem, value: string | number) =>
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );

  // Validation avec feedback précis
  const isEntrepotError     = submitted && !entrepotId;
  const isDistributeurError = submitted && !distributeurId;
  const isDestinationError  = submitted && !destination.trim();
  const isEcheanceError     = submitted && !echeance;

  const handleSubmit = async () => {
    setSubmitted(true);

    if (!entrepotId || !distributeurId || !destination.trim() || !echeance) {
      setError('Veuillez remplir tous les champs obligatoires marqués (*).');
      return;
    }
    if (items.some((it) => !it.materielId || it.quantitePrevue < 1)) {
      setError('Chaque ligne de matériel doit avoir un article sélectionné et une quantité ≥ 1.');
      return;
    }

    const dto: CreateMissionDto = {
      entrepotSourceId: entrepotId,
      distributeurId,
      destinationNom:   destination.trim(),
      destinationLat:   destLat ? parseFloat(destLat) : undefined,
      destinationLng:   destLng ? parseFloat(destLng) : undefined,
      priorite,
      dateEcheance:     echeance,
      notes:            notes.trim() || undefined,
      items,
    };

    setLoading(true);
    setError(null);
    try {
      await missionApi.create(dto);
      onCreated();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return; // Bloquer la fermeture pendant la soumission
    onClose();
  };

  const distributeursDisponibles = distributeurs.filter((d) => d.statut === 'disponible');

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="create-mission-title"
    >
      <DialogTitle id="create-mission-title" sx={{ fontWeight: 'bold', pb: 1 }}>
        Créer une Nouvelle Mission de Livraison
        <Typography variant="body2" color="text.secondary">
          L'action sera automatiquement enregistrée dans les Audit Logs.
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>

          {/* ── Section 1 : Affectation ─────────────────────────────── */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="primary" fontWeight="bold" sx={{ mb: 1 }}>
              1. Affectation
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select fullWidth required size="small"
              label="Entrepôt source"
              value={entrepotId}
              onChange={(e) => setEntrepotId(e.target.value)}
              error={isEntrepotError}
              helperText={isEntrepotError ? 'Champ requis' : undefined}
              inputProps={{ 'aria-required': true }}
            >
              {entrepots.map((e) => (
                <MenuItem key={e.id} value={e.id}>
                  {e.nom} — {e.province}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select fullWidth required size="small"
              label="Distributeur assigné"
              value={distributeurId}
              onChange={(e) => setDistributeurId(e.target.value)}
              error={isDistributeurError}
              helperText={
                isDistributeurError
                  ? 'Champ requis'
                  : distributeursDisponibles.length === 0
                    ? 'Aucun distributeur disponible actuellement'
                    : undefined
              }
              inputProps={{ 'aria-required': true }}
            >
              {distributeursDisponibles.length === 0 ? (
                <MenuItem disabled value="">Aucun distributeur disponible</MenuItem>
              ) : (
                distributeursDisponibles.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.prenom} {d.nom}
                  </MenuItem>
                ))
              )}
            </TextField>
          </Grid>

          <Grid item xs={12}><Divider /></Grid>

          {/* ── Section 2 : Destination ─────────────────────────────── */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="primary" fontWeight="bold" sx={{ mb: 1 }}>
              2. Destination (Zone Sinistrée)
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth required size="small"
              label="Nom de la destination"
              placeholder="Ex : Douar Tizgui — Commune Aït Benhaddou, Azilal"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              error={isDestinationError}
              helperText={isDestinationError ? 'Champ requis' : undefined}
              inputProps={{ 'aria-required': true }}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth size="small" type="number"
              label="Latitude GPS (optionnel)"
              placeholder="Ex : 31.9670"
              value={destLat}
              onChange={(e) => setDestLat(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">°N</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth size="small" type="number"
              label="Longitude GPS (optionnel)"
              placeholder="Ex : -6.5728"
              value={destLng}
              onChange={(e) => setDestLng(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">°E</InputAdornment>,
              }}
            />
          </Grid>

          <Grid item xs={12}><Divider /></Grid>

          {/* ── Section 3 : Matériels ────────────────────────────────── */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" color="primary" fontWeight="bold">
                3. Matériels à expédier
              </Typography>
              <Button size="small" startIcon={<AddCircleIcon />} onClick={addItem}>
                Ajouter un article
              </Button>
            </Box>
          </Grid>

          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              <Grid item xs={7}>
                <TextField
                  select fullWidth required size="small"
                  label={`Article ${idx + 1}`}
                  value={item.materielId}
                  onChange={(e) => updateItem(idx, 'materielId', e.target.value)}
                  error={submitted && !item.materielId}
                  helperText={submitted && !item.materielId ? 'Sélectionnez un article' : undefined}
                >
                  {materiels.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.nom} ({m.categorie})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth required size="small" type="number"
                  label="Quantité"
                  inputProps={{ min: 1, 'aria-label': `Quantité article ${idx + 1}` }}
                  value={item.quantitePrevue}
                  onChange={(e) =>
                    updateItem(idx, 'quantitePrevue', parseInt(e.target.value) || 1)
                  }
                  error={submitted && item.quantitePrevue < 1}
                />
              </Grid>
              <Grid item xs={1} sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                  color="error"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  size="small"
                  aria-label={`Supprimer l'article ${idx + 1}`}
                >
                  <RemoveCircleIcon />
                </IconButton>
              </Grid>
            </React.Fragment>
          ))}

          <Grid item xs={12}><Divider /></Grid>

          {/* ── Section 4 : Planification ────────────────────────────── */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="primary" fontWeight="bold" sx={{ mb: 1 }}>
              4. Planification
            </Typography>
          </Grid>

          <Grid item xs={4}>
            <TextField
              select fullWidth required size="small"
              label="Priorité"
              value={priorite}
              onChange={(e) => setPriorite(e.target.value as MissionPriorite)}
            >
              {(Object.entries(MISSION_PRIORITE_LABEL) as [MissionPriorite, string][]).map(
                ([val, label]) => (
                  <MenuItem key={val} value={val}>{label}</MenuItem>
                ),
              )}
            </TextField>
          </Grid>

          <Grid item xs={8}>
            <TextField
              fullWidth required size="small"
              type="datetime-local"
              label="Date d'échéance *"
              value={echeance}
              onChange={(e) => setEcheance(e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={isEcheanceError}
              helperText={isEcheanceError ? 'Champ requis' : undefined}
              inputProps={{ 'aria-required': true }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth multiline rows={2} size="small"
              label="Notes pour le distributeur (optionnel)"
              placeholder="Consignes spéciales, point de rendez-vous, contact sur place…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Grid>

        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading} variant="outlined">
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
          aria-busy={loading}
        >
          {loading ? 'Création en cours…' : 'Créer la Mission'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
