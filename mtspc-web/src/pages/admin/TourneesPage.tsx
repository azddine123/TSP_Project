/**
 * PAGE MISSIONS — Admin Entrepôt
 * ================================
 * Reçoit les ordres de mission créés par le pipeline VRP (Super Admin).
 * Flux en 4 étapes pour chaque tournée :
 *   1. Vérifier la capacité du véhicule (découpe si nécessaire)
 *   2. Assigner un distributeur
 *   3. Confirmer le chargement → sortie de stock
 *   4. Départ autorisé → mission démarre
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  mockTourneeApi,
  mockDistributeurApi,
  mockVehiculeApi,
  mockStockApi,
} from '../../mock/adminApi';
import {
  tourneeApi as realTourneeApi,
  conditionalDistributeurApi,
  conditionalVehiculeApi,
  conditionalStockApi,
  conditionalCriseApi,
  getApiErrorMessage,
} from '../../services/api';
import type { StockRow, Crise } from '../../types';

// Bascule mock / vrai backend selon la variable d'environnement VITE_USE_MOCK
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const tourneeApi      = USE_MOCK ? mockTourneeApi       : realTourneeApi;
const distributeurApi = USE_MOCK ? mockDistributeurApi  : conditionalDistributeurApi;
const vehiculeApi     = USE_MOCK ? mockVehiculeApi      : conditionalVehiculeApi;
const stockApi        = USE_MOCK ? mockStockApi         : conditionalStockApi;
import type {
  Tournee, TourneeEtape, Distributeur, RessourcesDouar,
} from '../../types';

// ── Icône SVG inline pour Leaflet ─────────────────────────────────────────────
function mkMapIcon(fill: string, size = 22) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41" width="${size}" height="${Math.round(size * 1.64)}">
    <path fill="${fill}" stroke="#fff" stroke-width="1.5" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
    <circle fill="white" cx="12.5" cy="12.5" r="4.5"/>
  </svg>`;
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize:    [size, Math.round(size * 1.64)],
    iconAnchor:  [size / 2, Math.round(size * 1.64)],
    popupAnchor: [0, -Math.round(size * 1.64)],
  });
}
const ICON_ENT   = mkMapIcon('#3b82f6', 26);
const ICON_HIGH  = mkMapIcon('#ef4444', 20);
const ICON_MED   = mkMapIcon('#f97316', 18);
const ICON_LOW   = mkMapIcon('#6b7280', 16);

// ── Poids unitaires pour calcul capacité (kg) ────────────────────────────────
const POIDS: Record<keyof RessourcesDouar, number> = {
  tentes:      15,
  couvertures: 1.5,
  vivres:      5,
  kits_med:    2,
  eau_litres:  1,
};

function calculerPoids(r: RessourcesDouar): number {
  return (
    r.tentes      * POIDS.tentes      +
    r.couvertures * POIDS.couvertures +
    r.vivres      * POIDS.vivres      +
    r.kits_med    * POIDS.kits_med    +
    r.eau_litres  * POIDS.eau_litres
  );
}

function addRessources(a: RessourcesDouar, b: RessourcesDouar): RessourcesDouar {
  return {
    tentes:      a.tentes      + b.tentes,
    couvertures: a.couvertures + b.couvertures,
    vivres:      a.vivres      + b.vivres,
    kits_med:    a.kits_med    + b.kits_med,
    eau_litres:  a.eau_litres  + b.eau_litres,
  };
}

const ZERO_RES: RessourcesDouar = { tentes: 0, couvertures: 0, vivres: 0, kits_med: 0, eau_litres: 0 };

/** Découpe les étapes en voyages selon la capacité du véhicule */
function decouper(etapes: TourneeEtape[], capaciteKg: number): TourneeEtape[][] {
  const voyages: TourneeEtape[][] = [];
  let voyage: TourneeEtape[] = [];
  let poidsVoyage = 0;

  for (const etape of etapes) {
    const res   = etape.ressources ?? ZERO_RES;
    const poids = calculerPoids(res);
    if (voyage.length > 0 && poidsVoyage + poids > capaciteKg) {
      voyages.push(voyage);
      voyage = [];
      poidsVoyage = 0;
    }
    voyage.push(etape);
    poidsVoyage += poids;
  }
  if (voyage.length > 0) voyages.push(voyage);
  return voyages;
}

// ── Labels type de crise ─────────────────────────────────────────────────────

const CRISE_TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  SEISME:    { label: 'Séisme',      cls: 'bg-red-100 text-red-700' },
  INONDATION:{ label: 'Inondation',  cls: 'bg-blue-100 text-blue-700' },
  INCENDIE:  { label: 'Incendie',    cls: 'bg-orange-100 text-orange-700' },
  SECHERESSE:{ label: 'Sécheresse',  cls: 'bg-yellow-100 text-yellow-700' },
  EPIDEMIE:  { label: 'Épidémie',    cls: 'bg-purple-100 text-purple-700' },
  AUTRE:     { label: 'Autre',       cls: 'bg-gray-100 text-gray-600' },
};

// ── Badges ───────────────────────────────────────────────────────────────────

const STATUT_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  planifiee: { label: 'Ordre reçu',  cls: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  en_cours:  { label: 'En mission',  cls: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500 animate-pulse' },
  terminee:  { label: 'Terminée',    cls: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  annulee:   { label: 'Annulée',     cls: 'bg-gray-100 text-gray-400',     dot: 'bg-gray-300' },
};

// ── Composant RessourcesGrid ─────────────────────────────────────────────────

function RessourcesGrid({ res, label }: { res: RessourcesDouar; label?: string }) {
  const poids = calculerPoids(res);
  return (
    <div>
      {label && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>}
      <div className="flex flex-wrap gap-1.5">
        {res.tentes > 0      && <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">{res.tentes} tentes</span>}
        {res.couvertures > 0 && <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{res.couvertures} couvertures</span>}
        {res.vivres > 0      && <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full">{res.vivres} kits vivres</span>}
        {res.kits_med > 0    && <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded-full">{res.kits_med} kits méd.</span>}
        {res.eau_litres > 0  && <span className="text-xs px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-full">{res.eau_litres.toLocaleString('fr-FR')} L</span>}
        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-semibold">≈ {poids.toFixed(0)} kg</span>
      </div>
    </div>
  );
}

// ── Carte principale d'une tournée ───────────────────────────────────────────

function TourneeCard({
  tournee, crise, distributeurs, vehicules, stock, onUpdate, autoExpand = false,
}: {
  tournee:       Tournee;
  crise?:        Crise | null;
  distributeurs: Distributeur[];
  vehicules:     { id: string; immatriculation: string; type: string; capacite: number; statut: string }[];
  stock:         StockRow[];
  onUpdate:      (t: Tournee) => void;
  autoExpand?:   boolean;
}) {
  const [expanded,    setExpanded]    = useState(autoExpand);
  const cardRef = useRef<HTMLDivElement>(null);

  // Scroll + expand automatique si focalisé depuis OrdresRecusPage
  useEffect(() => {
    if (autoExpand && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [autoExpand]);
  const [busy,        setBusy]        = useState(false);
  const [error,       setError]       = useState('');

  // États du flux 4 étapes
  const [etape,       setEtapeFlux]   = useState<1 | 2 | 3 | 4>(() => {
    if (tournee.statut === 'en_cours' || tournee.statut === 'terminee') return 4;
    if (tournee.distributeur) return 3;
    return 1;
  });
  const [vehiculeId,  setVehiculeId]  = useState('');
  const [distId,      setDistId]      = useState(tournee.distributeur?.id ?? '');
  const [voyages,     setVoyages]     = useState<TourneeEtape[][] | null>(null);
  const [chargement,  setChargement]  = useState(false);

  const etapes = useMemo(() => [...tournee.etapes].sort((a, b) => a.ordre - b.ordre), [tournee.etapes]);
  const livrees = etapes.filter(e => e.statut === 'livree').length;
  const pct = etapes.length > 0 ? Math.round(livrees / etapes.length * 100) : 0;

  const ressTotal = tournee.ressourcesTotales ?? etapes.reduce((acc, e) => addRessources(acc, e.ressources ?? ZERO_RES), ZERO_RES);
  const poidsTotal = calculerPoids(ressTotal);

  const vehicule = vehicules.find(v => v.id === vehiculeId);
  const capaciteKg = vehicule?.capacite ?? 0;
  const depasseCapacite = capaciteKg > 0 && poidsTotal > capaciteKg;

  const cfg = STATUT_BADGE[tournee.statut] ?? STATUT_BADGE.planifiee;
  // Distributeurs triés : disponibles en premier, en_mission en grisé
  const disposAll = [...distributeurs].sort((a, b) => {
    const sa = (a as any).statut === 'disponible' ? 0 : 1;
    const sb = (b as any).statut === 'disponible' ? 0 : 1;
    return sa - sb;
  });
  const dispos = disposAll.filter(d => (d as any).statut === 'disponible' || d.id === tournee.distributeur?.id);
  const selectedDistInfo = dispos.find(d => d.id === distId);

  // Étape 1 : vérifier/choisir véhicule
  function handleVehiculeChange(vid: string) {
    setVehiculeId(vid);
    const v = vehicules.find(vv => vv.id === vid);
    if (v && poidsTotal > v.capacite) {
      setVoyages(decouper(etapes, v.capacite));
    } else {
      setVoyages(null);
    }
  }

  function validerEtape1() {
    if (!vehiculeId) { setError('Sélectionnez un véhicule'); return; }
    setError('');
    setEtapeFlux(2);
  }

  // Étape 2 : assigner distributeur
  async function validerEtape2() {
    if (!distId) { setError('Sélectionnez un distributeur'); return; }
    setBusy(true); setError('');
    try {
      const partial = await tourneeApi.assigner(tournee.id, { distributeurId: distId });
      onUpdate({ ...tournee, ...partial } as Tournee);
      setEtapeFlux(3);
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setBusy(false); }
  }

  // Étape 3 : confirmer chargement
  async function validerChargement() {
    setChargement(true); setError('');
    try {
      // On décrémente le stock global (sortie chargement mission)
      // Le motif "chargement_mission" est enregistré côté backend
      await stockApi.createMouvement({
        type: 'SORTIE',
        quantite: 1,   // symbolique — le stock réel est décrémenté article par article via l'Admin
        motif: 'chargement_mission',
        referenceDoc: `TOURNEE-${tournee.id.slice(0, 8).toUpperCase()}`,
        materielId: '',  // chargement global
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any).catch(() => {/* sortie stock optionnelle — non bloquante */});
      setEtapeFlux(4);
    } finally { setChargement(false); }
  }

  // Étape 4 : départ
  async function handleDemarrer() {
    setBusy(true); setError('');
    try {
      const updated = await tourneeApi.demarrer(tournee.id);
      onUpdate(updated);
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setBusy(false); }
  }

  return (
    <div ref={cardRef} className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-theme-sm overflow-hidden ${
      autoExpand ? 'ring-2 ring-brand-400' : ''} ${
      tournee.statut === 'planifiee' ? 'border-yellow-200 dark:border-yellow-900/40' :
      tournee.statut === 'en_cours'  ? 'border-l-4 border-l-blue-400 border-blue-200 dark:border-blue-900/40' :
      tournee.statut === 'terminee'  ? 'border-green-200 dark:border-green-900/40 opacity-80' :
      'border-gray-200 dark:border-gray-800 opacity-60'
    }`}>

      {/* ── Header cliquable ── */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">
              {(tournee as any).missionNumero ?? `MS-${tournee.entrepot.province.slice(0, 1).toUpperCase()}-${new Date((tournee as any).datePlanification ?? Date.now()).getFullYear()}-${tournee.id.slice(-3).toUpperCase()}`}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
            {(tournee as any)._fromPipeline && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                Algo VRP
              </span>
            )}
            {tournee.statut === 'en_cours' && (
              <span className="text-xs text-blue-600 font-bold">{pct}%</span>
            )}
          </div>

          {/* Bandeau crise liée */}
          {crise && (
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CRISE_TYPE_LABELS[crise.type]?.cls ?? 'bg-gray-100 text-gray-600'}`}>
                {CRISE_TYPE_LABELS[crise.type]?.label ?? crise.type}
              </span>
              <span className="text-xs text-gray-400 font-mono">{crise.reference}</span>
              <span className="text-xs text-gray-500 truncate max-w-xs">— {crise.zone}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
            <span>{etapes.length} douar{etapes.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{tournee.distanceTotale.toFixed(1)} km</span>
            <span>·</span>
            <span>~{tournee.tempsEstime} min</span>
            {tournee.distributeur
              ? <><span>·</span><span className="font-semibold text-gray-700 dark:text-gray-200">{tournee.distributeur.prenom} {tournee.distributeur.nom}</span></>
              : <><span>·</span><span className="text-orange-500 font-semibold">Non assigné</span></>
            }
          </div>

          {/* Barre de progression en cours */}
          {etapes.length > 0 && tournee.statut === 'en_cours' && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-400 tabular-nums">{livrees}/{etapes.length}</span>
            </div>
          )}
        </div>

        <svg className={`w-4 h-4 text-gray-400 shrink-0 mt-0.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* ── Contenu expandable ── */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">

          {error && (
            <div className="px-5 py-3 text-xs text-red-600 bg-red-50 dark:bg-red-900/20">
              {error}
              <button onClick={() => setError('')} className="ml-2 text-red-400">✕</button>
            </div>
          )}

          {/* ══════ FLUX 4 ÉTAPES (missions planifiées uniquement) ══════ */}
          {tournee.statut === 'planifiee' && (
            <div className="px-5 py-4 space-y-5">

              {/* Indicateur d'étapes */}
              <div className="flex items-center gap-0">
                {([1, 2, 3, 4] as const).map((n, i) => (
                  <div key={n} className="flex items-center flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                      etape > n ? 'bg-green-500 border-green-500 text-white' :
                      etape === n ? 'bg-brand-500 border-brand-500 text-white' :
                      'bg-white dark:bg-gray-900 border-gray-300 text-gray-400'
                    }`}>{etape > n ? '✓' : n}</div>
                    {i < 3 && <div className={`flex-1 h-0.5 mx-1 ${etape > n ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400 -mt-3">
                <span>Capacité</span>
                <span>Distributeur</span>
                <span>Chargement</span>
                <span>Départ</span>
              </div>

              {/* ── ÉTAPE 1 : Vérification capacité véhicule ── */}
              {etape === 1 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">1. Vérifier la capacité du véhicule</p>
                    <p className="text-xs text-gray-500 mb-3">Choisissez le véhicule qui effectuera cette tournée.</p>

                    {/* Ressources totales */}
                    <RessourcesGrid res={ressTotal} label="Ressources totales à charger" />

                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Véhicule</label>
                      <select
                        value={vehiculeId}
                        onChange={e => handleVehiculeChange(e.target.value)}
                        className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand-300 outline-none"
                      >
                        <option value="">— Choisir un véhicule —</option>
                        {vehicules.filter(v => v.statut === 'disponible').map(v => (
                          <option key={v.id} value={v.id}>
                            {v.immatriculation} · {v.type} · {v.capacite.toLocaleString('fr-FR')} kg
                            {calculerPoids(ressTotal) > v.capacite ? ' ! insuffisant' : ' ✓'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Alerte capacité dépassée + plan de découpe */}
                    {vehiculeId && depasseCapacite && voyages && (
                      <div className="mt-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3">
                        <p className="text-xs font-bold text-orange-700 dark:text-orange-300 mb-2">
                          Capacité insuffisante ({poidsTotal.toFixed(0)} kg &gt; {capaciteKg.toLocaleString()} kg) — Mission divisée en <strong>{voyages.length} voyages</strong>
                        </p>
                        {voyages.map((voy, vi) => {
                          const res = voy.reduce((acc, e) => addRessources(acc, e.ressources ?? ZERO_RES), ZERO_RES);
                          return (
                            <div key={vi} className="mb-2 last:mb-0">
                              <p className="text-xs font-semibold text-orange-600 mb-1">Voyage {vi + 1}/{voyages.length} — {voy.map(e => e.douar.nom).join(' → ')}</p>
                              <p className="text-xs text-orange-500">≈ {calculerPoids(res).toFixed(0)} kg</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {vehiculeId && !depasseCapacite && (
                      <div className="mt-2 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 rounded-xl px-3 py-2">
                        ✓ Capacité suffisante — {poidsTotal.toFixed(0)} kg / {capaciteKg.toLocaleString()} kg
                      </div>
                    )}
                  </div>
                  <button
                    onClick={validerEtape1}
                    className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    Continuer →
                  </button>
                </div>
              )}

              {/* ── ÉTAPE 2 : Assigner un distributeur ── */}
              {etape === 2 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">2. Assigner un distributeur</p>
                    <p className="text-xs text-gray-500 mb-3">Les distributeurs disponibles sont affichés en premier.</p>
                    <select
                      value={distId}
                      onChange={e => setDistId(e.target.value)}
                      className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand-300 outline-none"
                    >
                      <option value="">— Choisir un distributeur —</option>
                      {dispos.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.prenom} {d.nom}
                          {(d as any).missionsCompletes != null ? ` — ${(d as any).missionsCompletes} missions` : ''}
                          {(d as any).statut === 'en_mission' ? ' (en mission)' : ''}
                        </option>
                      ))}
                    </select>
                    {dispos.length === 0 && (
                      <p className="text-xs text-orange-500 mt-1">Aucun distributeur disponible.</p>
                    )}
                    {/* Résumé du distributeur sélectionné */}
                    {distId && selectedDistInfo && (
                      <div className="mt-2 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-xl px-3 py-2 text-xs text-brand-700 dark:text-brand-300">
                        {selectedDistInfo.prenom} {selectedDistInfo.nom}
                        {(selectedDistInfo as any).missionsCompletes != null && ` — ${(selectedDistInfo as any).missionsCompletes} missions effectuées`}
                        {(selectedDistInfo as any).vehiculeAssigneId &&
                          vehicules.find(v => v.id === (selectedDistInfo as any).vehiculeAssigneId)?.immatriculation
                          ? ` — Véhicule ${vehicules.find(v => v.id === (selectedDistInfo as any).vehiculeAssigneId)?.immatriculation}`
                          : ''
                        }
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEtapeFlux(1)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                      ← Retour
                    </button>
                    <button onClick={validerEtape2} disabled={busy || !distId}
                      className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
                    >
                      {busy ? 'Enregistrement…' : 'Confirmer →'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── ÉTAPE 3 : Chargement du véhicule ── */}
              {etape === 3 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">3. Chargement du véhicule</p>
                    <p className="text-xs text-gray-500 mb-3">
                      Vérifiez que le véhicule est chargé avec les ressources ci-dessous, puis confirmez.
                    </p>
                    <RessourcesGrid res={ressTotal} label="Articles à charger" />

                    {/* Vérification stock disponible */}
                    {stock.length > 0 && (() => {
                      // Mapping catégorie → clé ressource
                      const catToKey: Record<string, keyof RessourcesDouar> = {
                        TENTE: 'tentes', EQUIPEMENT: 'couvertures', NOURRITURE: 'vivres',
                        MEDICAMENT: 'kits_med', EAU: 'eau_litres',
                      };
                      const alertes: { nom: string; prevu: number; dispo: number }[] = [];
                      stock.forEach(s => {
                        const key = catToKey[s.materiel.categorie];
                        if (!key) return;
                        const prevu = ressTotal[key] ?? 0;
                        if (prevu > 0 && s.quantite < prevu) {
                          alertes.push({ nom: s.materiel.nom, prevu, dispo: s.quantite });
                        }
                      });
                      if (alertes.length === 0) return null;
                      return (
                        <div className="mt-3 space-y-1.5">
                          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Stock insuffisant</p>
                          {alertes.map(a => (
                            <div key={a.nom} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-xs text-red-700 dark:text-red-300">
                              <strong>{a.nom}</strong> — Prévu: {a.prevu}, Disponible: <strong className="text-red-600">{a.dispo}</strong>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Détail par douar */}
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Détail par douar</p>
                      {etapes.map(etape => (
                        <div key={etape.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                              {etape.ordre}. {etape.douar.nom}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {etape.population && (
                                <span className="text-xs text-gray-400">{etape.population.toLocaleString('fr-FR')} hab.</span>
                              )}
                              {etape.scoreTopsis != null && (
                                <span className="text-xs font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                                  {(etape.scoreTopsis * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </div>
                          {etape.ressources && (
                            <RessourcesGrid res={etape.ressources} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={validerChargement}
                    disabled={chargement}
                    className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {chargement ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                      </svg>
                    )}
                    Chargement confirmé →
                  </button>
                </div>
              )}

              {/* ── ÉTAPE 4 : Départ ── */}
              {etape === 4 && tournee.statut === 'planifiee' && (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">4. Autoriser le départ</p>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-xs text-green-700 dark:text-green-300">
                    ✓ Véhicule assigné · ✓ Distributeur affecté · ✓ Chargement confirmé
                    <br />Le distributeur recevra l'itinéraire sur son mobile.
                  </div>

                  {/* Mini carte Leaflet de l'itinéraire */}
                  {etapes.some(e => e.latitude && e.longitude) && (() => {
                    const pts = etapes.filter(e => e.latitude && e.longitude);
                    const polyLine: [number, number][] = pts.map(e => [e.latitude as number, e.longitude as number]);
                    const center: [number, number] = [pts[0].latitude as number, pts[0].longitude as number];
                    return (
                      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700" style={{ height: 220 }}>
                        <MapContainer center={center} zoom={10} style={{ width: '100%', height: '100%' }} scrollWheelZoom={false} zoomControl={false}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                          {polyLine.length > 1 && (
                            <Polyline positions={polyLine} pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.85 }} />
                          )}
                          {pts.map((e, i) => {
                            const pri = e.scoreTopsis != null ? e.scoreTopsis : 0;
                            const icon = pri >= 0.75 ? ICON_HIGH : pri >= 0.5 ? ICON_MED : ICON_LOW;
                            return (
                              <Marker key={e.id} position={[e.latitude as number, e.longitude as number]} icon={i === 0 ? ICON_ENT : icon}>
                                <Popup>
                                  <strong>{e.ordre}. {e.douar.nom}</strong><br />
                                  {e.population && `${e.population.toLocaleString('fr-FR')} hab. · `}
                                  {e.scoreTopsis != null && `Score ${(e.scoreTopsis * 100).toFixed(0)}%`}
                                </Popup>
                              </Marker>
                            );
                          })}
                        </MapContainer>
                      </div>
                    );
                  })()}

                  <button
                    onClick={handleDemarrer}
                    disabled={busy}
                    className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {busy ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                    Départ autorisé — Lancer la mission
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══════ MISSION EN COURS ══════ */}
          {tournee.statut === 'en_cours' && (
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Progression terrain</p>
              <div className="space-y-1.5">
                {etapes.map(e => {
                  const est = e.statut === 'livree' ? { cls: 'bg-green-100 text-green-700', label: '✓ Livré' } :
                              e.statut === 'en_route' ? { cls: 'bg-blue-100 text-blue-700', label: '→ En route' } :
                              e.statut === 'echec' ? { cls: 'bg-red-100 text-red-600', label: '✗ Bloqué' } :
                              { cls: 'bg-gray-100 text-gray-500', label: 'En attente' };
                  return (
                    <div key={e.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {e.ordre}. {e.douar.nom}
                        {e.population && <span className="text-gray-400 ml-1">· {e.population.toLocaleString('fr-FR')} hab.</span>}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${est.cls}`}>{est.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════ MISSION TERMINÉE ══════ */}
          {tournee.statut === 'terminee' && (
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-xs text-green-700 dark:text-green-300">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Mission terminée le {tournee.termineeAt ? new Date(tournee.termineeAt).toLocaleDateString('fr-FR') : '—'} · {livrees}/{etapes.length} douars livrés
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

interface VehiculeSimple {
  id: string; immatriculation: string; type: string; capacite: number; statut: string;
}

export default function TourneesPage() {
  const location = useLocation();
  // focusTourneeId : transmis par OrdresRecusPage via navigate state
  const focusTourneeId: string | undefined = (location.state as { focusTourneeId?: string } | null)?.focusTourneeId;

  const [tournees,      setTournees]      = useState<Tournee[]>([]);
  const [crises,        setCrises]        = useState<Crise[]>([]);
  const [distributeurs, setDistributeurs] = useState<Distributeur[]>([]);
  const [vehicules,     setVehicules]     = useState<VehiculeSimple[]>([]);
  const [stock,         setStock]         = useState<StockRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [filterStatut,  setFilterStatut]  = useState<string>('');

  // Lookup rapide criseId → Crise
  const criseMap = useMemo(() => {
    const m = new Map<string, Crise>();
    crises.forEach(c => m.set(c.id, c));
    return m;
  }, [crises]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [t, d, v, s, c] = await Promise.all([
        tourneeApi.getMine(),
        distributeurApi.getAll(),
        vehiculeApi.getMine(),
        stockApi.getMine().catch(() => [] as StockRow[]),
        conditionalCriseApi.getAll().catch(() => [] as Crise[]),
      ]);
      setTournees(t);
      setDistributeurs(d);
      setVehicules(v as unknown as VehiculeSimple[]);
      setStock(s as StockRow[]);
      setCrises(c);
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Écoute cross-onglets : BroadcastChannel (principal) + storage event (fallback)
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('najda_tournees');
      bc.onmessage = () => load();
    } catch { /* navigateur sans BroadcastChannel */ }

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'najda_mock_tournees') load();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      bc?.close();
      window.removeEventListener('storage', onStorage);
    };
  }, [load]);

  function handleUpdate(updated: Tournee) {
    setTournees(prev => prev.map(t => t.id === updated.id ? updated : t));
  }

  const counts = {
    all:       tournees.length,
    planifiee: tournees.filter(t => t.statut === 'planifiee').length,
    en_cours:  tournees.filter(t => t.statut === 'en_cours').length,
    terminee:  tournees.filter(t => t.statut === 'terminee').length,
  };

  // Si on arrive avec un focusTourneeId, montrer toutes les tournées (pas de filtre actif)
  const effectiveFilter = focusTourneeId ? '' : filterStatut;
  const filtered = effectiveFilter ? tournees.filter(t => t.statut === effectiveFilter) : tournees;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ordres de Mission</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Tournées assignées par le Super Admin · Douars prioritaires et besoins
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Actualiser
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Stats + filtre */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Toutes',     val: '',          count: counts.all,       cls: '' },
          { label: 'Ordres reçus', val: 'planifiee', count: counts.planifiee, cls: 'text-yellow-700 bg-yellow-50' },
          { label: 'En mission', val: 'en_cours',  count: counts.en_cours,  cls: 'text-blue-700 bg-blue-50' },
          { label: 'Terminées',  val: 'terminee',  count: counts.terminee,  cls: 'text-green-700 bg-green-50' },
        ].map(({ label, val, count, cls }) => (
          <button
            key={label}
            onClick={() => setFilterStatut(filterStatut === val ? '' : val)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
              filterStatut === val
                ? 'ring-2 ring-brand-400 border-transparent ' + (cls || 'bg-gray-100 text-gray-700')
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {label} <span className="ml-1 opacity-70">{count}</span>
          </button>
        ))}
      </div>

      {/* Alerte missions sans distributeur */}
      {counts.planifiee > 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>
            <strong>{counts.planifiee} ordre{counts.planifiee > 1 ? 's' : ''} en attente</strong> — Assignez un distributeur, vérifiez la capacité et autorisez le départ.
          </span>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12l2 2 4-4"/>
          </svg>
          <p className="text-sm font-medium">Aucune mission pour le moment</p>
          <p className="text-xs mt-1">Le Super Admin doit d'abord lancer le Pipeline VRP.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(t => (
            <TourneeCard
              key={t.id}
              tournee={t}
              crise={criseMap.get((t as any).criseId) ?? null}
              distributeurs={distributeurs}
              vehicules={vehicules}
              stock={stock}
              onUpdate={handleUpdate}
              autoExpand={focusTourneeId === t.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
