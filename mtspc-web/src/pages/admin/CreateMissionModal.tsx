/**
 * MODAL CRÉER UNE MISSION — Tailwind CSS
 * Toute la logique métier est identique à l'original.
 */
import React, { useEffect, useState } from 'react';
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

// ── Composants form utilitaires ───────────────────────────────────────────────

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
    {children}{required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const inputCls = (err?: boolean) =>
  `w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none transition-colors
   ${err
    ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-200'
    : 'border-gray-200 dark:border-gray-700 focus:border-brand-400 focus:ring-1 focus:ring-brand-200'}`;

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-xs text-red-500 mt-1">{msg}</p> : null;

const SectionTitle = ({ n, label }: { n: number; label: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
    <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">{label}</span>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CreateMissionModal({ open, onClose, onCreated }: Props) {
  const [entrepots,     setEntrepots]     = useState<Entrepot[]>([]);
  const [distributeurs, setDistributeurs] = useState<Distributeur[]>([]);
  const [materiels,     setMateriels]     = useState<Materiel[]>([]);

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
  const [submitted, setSubmitted] = useState(false);

  // Reset à chaque ouverture
  useEffect(() => {
    if (!open) return;
    setEntrepotId(''); setDistributeurId(''); setDestination('');
    setDestLat(''); setDestLng(''); setPriorite('medium');
    setEcheance(''); setNotes(''); setItems(INITIAL_ITEMS);
    setError(null); setSubmitted(false);
  }, [open]);

  // Charger les listes déroulantes
  useEffect(() => {
    if (!open) return;
    Promise.all([entrepotApi.getAll(), distributeurApi.getAll(), materielApi.getAll()])
      .then(([e, d, m]) => { setEntrepots(e); setDistributeurs(d); setMateriels(m); })
      .catch(() => setError('Impossible de charger les données du formulaire.'));
  }, [open]);

  const addItem    = () => setItems((prev) => [...prev, { materielId: '', quantitePrevue: 1 }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof MissionItem, value: string | number) =>
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));

  const isEntrepotError     = submitted && !entrepotId;
  const isDistributeurError = submitted && !distributeurId;
  const isDestinationError  = submitted && !destination.trim();
  const isEcheanceError     = submitted && !echeance;

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!entrepotId || !distributeurId || !destination.trim() || !echeance) {
      setError('Veuillez remplir tous les champs obligatoires (*).');
      return;
    }
    if (items.some((it) => !it.materielId || it.quantitePrevue < 1)) {
      setError('Chaque ligne de matériel doit avoir un article sélectionné et une quantité ≥ 1.');
      return;
    }
    const dto: CreateMissionDto = {
      entrepotSourceId: entrepotId, distributeurId,
      destinationNom: destination.trim(),
      destinationLat: destLat ? parseFloat(destLat) : undefined,
      destinationLng: destLng ? parseFloat(destLng) : undefined,
      priorite, dateEcheance: echeance,
      notes: notes.trim() || undefined, items,
    };
    setLoading(true); setError(null);
    try {
      await missionApi.create(dto);
      onCreated();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { if (!loading) onClose(); };

  const distributeursDisponibles = distributeurs.filter((d) => d.statut === 'disponible');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Carte modale */}
      <div className="relative z-10 w-full max-w-2xl mt-8 mb-8 bg-white dark:bg-gray-900 rounded-2xl shadow-theme-xl border border-gray-100 dark:border-gray-800">

        {/* En-tête */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Créer une Nouvelle Mission de Livraison</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">L'action sera enregistrée dans les Audit Logs.</p>
          </div>
          <button onClick={handleClose} disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors mt-0.5">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Corps */}
        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
              </svg>
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-400">✕</button>
            </div>
          )}

          {/* ── Section 1 : Affectation ── */}
          <div>
            <SectionTitle n={1} label="Affectation" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label required>Entrepôt source</Label>
                <select value={entrepotId} onChange={(e) => setEntrepotId(e.target.value)} className={inputCls(isEntrepotError)}>
                  <option value="">— Sélectionner —</option>
                  {entrepots.map((e) => <option key={e.id} value={e.id}>{e.nom} — {e.province}</option>)}
                </select>
                <FieldError msg={isEntrepotError ? 'Champ requis' : undefined} />
              </div>
              <div>
                <Label required>Distributeur assigné</Label>
                <select value={distributeurId} onChange={(e) => setDistributeurId(e.target.value)} className={inputCls(isDistributeurError)}>
                  <option value="">— Sélectionner —</option>
                  {distributeursDisponibles.length === 0
                    ? <option disabled value="">Aucun distributeur disponible</option>
                    : distributeursDisponibles.map((d) => <option key={d.id} value={d.id}>{d.prenom} {d.nom}</option>)}
                </select>
                <FieldError msg={isDistributeurError ? 'Champ requis' : distributeursDisponibles.length === 0 ? 'Aucun distributeur disponible' : undefined} />
              </div>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* ── Section 2 : Destination ── */}
          <div>
            <SectionTitle n={2} label="Destination (Zone Sinistrée)" />
            <div className="space-y-3">
              <div>
                <Label required>Nom de la destination</Label>
                <input
                  type="text"
                  placeholder="Ex : Douar Tizgui — Commune Aït Benhaddou, Azilal"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className={inputCls(isDestinationError)}
                />
                <FieldError msg={isDestinationError ? 'Champ requis' : undefined} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Latitude GPS (optionnel)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">°N</span>
                    <input type="number" placeholder="31.9670" value={destLat} onChange={(e) => setDestLat(e.target.value)} className={`${inputCls()} pl-8`} />
                  </div>
                </div>
                <div>
                  <Label>Longitude GPS (optionnel)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">°E</span>
                    <input type="number" placeholder="-6.5728" value={destLng} onChange={(e) => setDestLng(e.target.value)} className={`${inputCls()} pl-8`} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* ── Section 3 : Matériels ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionTitle n={3} label="Matériels à expédier" />
              <button onClick={addItem}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                Ajouter un article
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-[3]">
                    <select
                      value={item.materielId}
                      onChange={(e) => updateItem(idx, 'materielId', e.target.value)}
                      className={inputCls(submitted && !item.materielId)}
                    >
                      <option value="">Article {idx + 1}</option>
                      {materiels.map((m) => <option key={m.id} value={m.id}>{m.nom} ({m.categorie})</option>)}
                    </select>
                    <FieldError msg={submitted && !item.materielId ? 'Sélectionnez un article' : undefined} />
                  </div>
                  <div className="flex-[1]">
                    <input
                      type="number" min={1} value={item.quantitePrevue}
                      onChange={(e) => updateItem(idx, 'quantitePrevue', parseInt(e.target.value) || 1)}
                      className={inputCls(submitted && item.quantitePrevue < 1)}
                    />
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="mt-1 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label={`Supprimer l'article ${idx + 1}`}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* ── Section 4 : Planification ── */}
          <div>
            <SectionTitle n={4} label="Planification" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label required>Priorité</Label>
                <select value={priorite} onChange={(e) => setPriorite(e.target.value as MissionPriorite)} className={inputCls()}>
                  {(Object.entries(MISSION_PRIORITE_LABEL) as [MissionPriorite, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label required>Date d'échéance</Label>
                <input
                  type="datetime-local"
                  value={echeance}
                  onChange={(e) => setEcheance(e.target.value)}
                  className={inputCls(isEcheanceError)}
                />
                <FieldError msg={isEcheanceError ? 'Champ requis' : undefined} />
              </div>
            </div>
            <div className="mt-3">
              <Label>Notes pour le distributeur (optionnel)</Label>
              <textarea
                rows={2}
                placeholder="Consignes spéciales, point de rendez-vous, contact sur place…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputCls()} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <button
            onClick={handleClose} disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit} disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Création en cours…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Créer la Mission
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
