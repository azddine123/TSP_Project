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
  Entrepot, Distributeur, Materiel, CreateMissionDto,
} from '../../services/api';

interface Props {
  open:      boolean;
  onClose:   () => void;
  onCreated: () => void;
}

interface MissionItem {
  materielId:     string;
  quantitePrevue: number;
}

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
  const [priorite,       setPriorite]       = useState('medium');
  const [echeance,       setEcheance]       = useState('');
  const [notes,          setNotes]          = useState('');
  const [items,          setItems]          = useState<MissionItem[]>([
    { materielId: '', quantitePrevue: 1 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

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

  // Ajouter une ligne de matériel
  const addItem = () =>
    setItems((prev) => [...prev, { materielId: '', quantitePrevue: 1 }]);

  // Supprimer une ligne de matériel
  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  // Modifier une ligne de matériel
  const updateItem = (index: number, field: keyof MissionItem, value: any) =>
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );

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

    const dto: CreateMissionDto = {
      entrepotSourceId: entrepotId,
      distributeurId,
      destinationNom:  destination,
      destinationLat:  destLat  ? parseFloat(destLat)  : undefined,
      destinationLng:  destLng  ? parseFloat(destLng)  : undefined,
      priorite,
      dateEcheance:    echeance,
      notes:           notes || undefined,
      items,
    };

    setLoading(true);
    setError(null);
    try {
      await missionApi.create(dto);
      onCreated(); // Ferme le modal et recharge les données
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Erreur lors de la création de la mission. Vérifiez les données.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>
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
          {/* ── Section 1 : Entrepôt & Distributeur ───────────────── */}
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
            >
              {distributeurs
                .filter((d) => d.statut === 'disponible')
                .map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.prenom} {d.nom}
                  </MenuItem>
                ))}
            </TextField>
          </Grid>

          <Grid item xs={12}><Divider /></Grid>

          {/* ── Section 2 : Destination ────────────────────────────── */}
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
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth size="small" type="number"
              label="Latitude GPS"
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
              label="Longitude GPS"
              placeholder="Ex : -6.5728"
              value={destLng}
              onChange={(e) => setDestLng(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">°E</InputAdornment>,
              }}
            />
          </Grid>

          <Grid item xs={12}><Divider /></Grid>

          {/* ── Section 3 : Matériels ──────────────────────────────── */}
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
                  inputProps={{ min: 1 }}
                  value={item.quantitePrevue}
                  onChange={(e) =>
                    updateItem(idx, 'quantitePrevue', parseInt(e.target.value) || 1)
                  }
                />
              </Grid>
              <Grid item xs={1} sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                  color="error"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  size="small"
                >
                  <RemoveCircleIcon />
                </IconButton>
              </Grid>
            </React.Fragment>
          ))}

          <Grid item xs={12}><Divider /></Grid>

          {/* ── Section 4 : Priorité & Échéance ───────────────────── */}
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
              onChange={(e) => setPriorite(e.target.value)}
            >
              <MenuItem value="low">Basse</MenuItem>
              <MenuItem value="medium">Normale</MenuItem>
              <MenuItem value="high">Haute</MenuItem>
              <MenuItem value="critique">CRITIQUE</MenuItem>
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
          startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
        >
          {loading ? 'Création en cours…' : 'Créer la Mission'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
