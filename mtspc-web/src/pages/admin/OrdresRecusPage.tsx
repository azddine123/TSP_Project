/**
 * PAGE ORDRES REÇUS — Admin Entrepôt
 * =====================================
 * Affiche les informations envoyées par le Super Admin avant la création de missions :
 * - Détails de la crise (type, zone, référence)
 * - Tournées VRP assignées à cet entrepôt
 * - Douars prioritaires avec scores TOPSIS
 * - Ressources requises par arrêt
 * - Carte de l'itinéraire
 * CTA : "Préparer la Mission →" → redirige vers /admin/tournees (focalisé sur la tournée)
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  mockTourneeApi,
} from '../../mock/adminApi';
import {
  tourneeApi as realTourneeApi,
  conditionalCriseApi,
  getApiErrorMessage,
} from '../../services/api';
import type { Tournee, TourneeEtape, RessourcesDouar, Crise } from '../../types';

// ── Bascule mock / vrai backend ────────────────────────────────────────────────
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const tourneeApi = USE_MOCK ? mockTourneeApi : realTourneeApi;

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
const ICON_ENT  = mkMapIcon('#3b82f6', 26);
const ICON_HIGH = mkMapIcon('#ef4444', 20);
const ICON_MED  = mkMapIcon('#f97316', 18);
const ICON_LOW  = mkMapIcon('#6b7280', 16);

// ── Poids unitaires (kg) ──────────────────────────────────────────────────────
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

const ZERO_RES: RessourcesDouar = { tentes: 0, couvertures: 0, vivres: 0, kits_med: 0, eau_litres: 0 };

function addRessources(a: RessourcesDouar, b: RessourcesDouar): RessourcesDouar {
  return {
    tentes:      a.tentes      + b.tentes,
    couvertures: a.couvertures + b.couvertures,
    vivres:      a.vivres      + b.vivres,
    kits_med:    a.kits_med    + b.kits_med,
    eau_litres:  a.eau_litres  + b.eau_litres,
  };
}

// ── Labels / badges crise ─────────────────────────────────────────────────────
const CRISE_TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  SEISME:     { label: 'Séisme',      cls: 'bg-red-100 text-red-700' },
  INONDATION: { label: 'Inondation',  cls: 'bg-blue-100 text-blue-700' },
  INCENDIE:   { label: 'Incendie',    cls: 'bg-orange-100 text-orange-700' },
  SECHERESSE: { label: 'Sécheresse',  cls: 'bg-yellow-100 text-yellow-700' },
  EPIDEMIE:   { label: 'Épidémie',    cls: 'bg-purple-100 text-purple-700' },
  AUTRE:      { label: 'Autre',       cls: 'bg-gray-100 text-gray-600' },
};

const STATUT_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  planifiee: { label: 'Nouvel ordre',  cls: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  en_cours:  { label: 'En mission',   cls: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500 animate-pulse' },
  terminee:  { label: 'Terminée',     cls: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  annulee:   { label: 'Annulée',      cls: 'bg-gray-100 text-gray-400',     dot: 'bg-gray-300' },
};

// ── Grille ressources ─────────────────────────────────────────────────────────
function RessourcesGrid({ res, compact = false }: { res: RessourcesDouar; compact?: boolean }) {
  const poids = calculerPoids(res);
  const cls = compact ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  return (
    <div className="flex flex-wrap gap-1.5">
      {res.tentes      > 0 && <span className={`${cls} bg-indigo-50 text-indigo-700 rounded-full`}>⛺ {res.tentes} tentes</span>}
      {res.couvertures > 0 && <span className={`${cls} bg-blue-50 text-blue-700 rounded-full`}>🧣 {res.couvertures} couvertures</span>}
      {res.vivres      > 0 && <span className={`${cls} bg-yellow-50 text-yellow-700 rounded-full`}>🛒 {res.vivres} kits vivres</span>}
      {res.kits_med    > 0 && <span className={`${cls} bg-red-50 text-red-700 rounded-full`}>🏥 {res.kits_med} kits méd.</span>}
      {res.eau_litres  > 0 && <span className={`${cls} bg-cyan-50 text-cyan-700 rounded-full`}>💧 {res.eau_litres.toLocaleString('fr-FR')} L</span>}
      <span className={`${cls} bg-gray-100 text-gray-600 rounded-full font-semibold`}>≈ {poids.toFixed(0)} kg</span>
    </div>
  );
}

// ── Barre de progression TOPSIS ───────────────────────────────────────────────
function TopsisBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const cls = score >= 0.75 ? 'bg-red-500' : score >= 0.5 ? 'bg-orange-400' : 'bg-gray-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ── Card d'un ordre reçu ──────────────────────────────────────────────────────
function OrdreCard({ tournee, crise, onPreparer }: {
  tournee:    Tournee;
  crise?:     Crise | null;
  onPreparer: (id: string) => void;
}) {
  const [expanded,   setExpanded]   = useState(false);
  const [showMap,    setShowMap]    = useState(false);

  const etapes = useMemo(
    () => [...tournee.etapes].sort((a, b) => a.ordre - b.ordre),
    [tournee.etapes],
  );

  const ressTotal = tournee.ressourcesTotales ??
    etapes.reduce((acc, e) => addRessources(acc, e.ressources ?? ZERO_RES), ZERO_RES);

  const poidsTotal  = calculerPoids(ressTotal);
  const cfg         = STATUT_BADGE[tournee.statut] ?? STATUT_BADGE.planifiee;
  const criseType   = crise ? (CRISE_TYPE_LABELS[crise.type] ?? { label: crise.type, cls: 'bg-gray-100 text-gray-600' }) : null;

  // Gère les deux conventions de champ : latitude/longitude (type) ET lat/lng (mock store)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getCoords(e: any): { lat: number; lng: number } | null {
    const lat = e.latitude ?? e.lat;
    const lng = e.longitude ?? e.lng;
    if (lat && lng) return { lat: Number(lat), lng: Number(lng) };
    return null;
  }

  const hasMap = etapes.some(e => getCoords(e) !== null);
  const mapPts = etapes
    .map(e => ({ etape: e, coords: getCoords(e) }))
    .filter(({ coords }) => coords !== null) as { etape: TourneeEtape; coords: { lat: number; lng: number } }[];
  const polyLine: [number, number][] = mapPts.map(({ coords }) => [coords.lat, coords.lng]);
  const mapCenter: [number, number] | null = mapPts.length > 0 ? [mapPts[0].coords.lat, mapPts[0].coords.lng] : null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-theme-sm overflow-hidden">

      {/* ── En-tête ── */}
      <div className="px-5 py-4 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {/* Badge statut */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>

          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
              Tournée #{tournee.id.slice(-8).toUpperCase()}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {tournee.distanceTotale ? `${tournee.distanceTotale.toFixed(1)} km` : '—'}
              {tournee.tempsEstime ? ` · ~${Math.round(tournee.tempsEstime / 60)}h${tournee.tempsEstime % 60 > 0 ? tournee.tempsEstime % 60 + 'min' : ''}` : ''}
              {' · '}{etapes.length} arrêt{etapes.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* CTA */}
        {tournee.statut === 'planifiee' && (
          <button
            onClick={() => onPreparer(tournee.id)}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Préparer la Mission
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
        {tournee.statut === 'en_cours' && (
          <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            En cours d'exécution
          </span>
        )}
        {tournee.statut === 'terminee' && (
          <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-xl">
            ✓ Mission terminée
          </span>
        )}
      </div>

      {/* ── Infos crise ── */}
      {crise && (
        <div className="mx-5 mb-4 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center gap-3 flex-wrap">
          <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500">Crise :</span>
            {criseType && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${criseType.cls}`}>
                {criseType.label}
              </span>
            )}
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{crise.reference}</span>
            {crise.zone && <span className="text-xs text-gray-500">· {crise.zone}</span>}
          </div>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold ${
            crise.statut === 'active'    ? 'bg-red-100 text-red-700' :
            crise.statut === 'suspendue' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-500'
          }`}>
            {crise.statut === 'active' ? 'Active' : crise.statut === 'suspendue' ? 'Suspendue' : 'Clôturée'}
          </span>
        </div>
      )}

      {/* ── Ressources totales ── */}
      <div className="mx-5 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Ressources totales à préparer
          <span className="ml-2 font-normal normal-case text-gray-400">({poidsTotal.toFixed(0)} kg au total)</span>
        </p>
        <RessourcesGrid res={ressTotal} />
      </div>

      {/* ── Distributeur assigné (si déjà fait) ── */}
      {tournee.distributeur && (
        <div className="mx-5 mb-4 flex items-center gap-2 px-4 py-2.5 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-xl">
          <svg className="w-4 h-4 text-brand-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span className="text-xs text-brand-700 dark:text-brand-300">
            Distributeur assigné : <strong>{tournee.distributeur.prenom} {tournee.distributeur.nom}</strong>
          </span>
        </div>
      )}

      {/* ── Séparateur + bouton expand ── */}
      <div className="border-t border-gray-100 dark:border-gray-800 mx-5" />
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <span>Détail des arrêts ({etapes.length} douars)</span>
        <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* ── Détail douars (expandable) ── */}
      {expanded && (
        <div className="px-5 pb-4 space-y-2">
          {etapes.map((etape, i) => {
            const res = etape.ressources ?? ZERO_RES;
            const score = etape.scoreTopsis ?? 0;
            const priorite = score >= 0.75 ? { label: 'Critique', cls: 'bg-red-100 text-red-600' }
                           : score >= 0.5  ? { label: 'Élevée',   cls: 'bg-orange-100 text-orange-600' }
                           : score > 0     ? { label: 'Normale',  cls: 'bg-gray-100 text-gray-500' }
                           : null;

            return (
              <div key={etape.id} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                {/* En-tête douar */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 flex-wrap">
                  <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{etape.douar.nom}</span>
                    {etape.population && (
                      <span className="text-xs text-gray-400 ml-2">{etape.population.toLocaleString('fr-FR')} hab.</span>
                    )}
                    {etape.menages && (
                      <span className="text-xs text-gray-400 ml-1">· {etape.menages} ménages</span>
                    )}
                  </div>
                  {priorite && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${priorite.cls}`}>
                      {priorite.label}
                    </span>
                  )}
                </div>
                {/* Score TOPSIS + ressources */}
                <div className="px-4 py-3 space-y-2">
                  {score > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Score de priorité TOPSIS</p>
                      <TopsisBar score={score} />
                    </div>
                  )}
                  <RessourcesGrid res={res} compact />
                </div>
              </div>
            );
          })}

          {/* Bouton carte */}
          {hasMap && (
            <button
              onClick={() => setShowMap(v => !v)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors mt-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
              </svg>
              {showMap ? 'Masquer la carte' : 'Voir l\'itinéraire sur la carte'}
            </button>
          )}
        </div>
      )}

      {/* ── Carte Leaflet ── */}
      {showMap && hasMap && mapCenter && (
        <div className="mx-5 mb-5 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700" style={{ height: 260 }}>
          <MapContainer center={mapCenter} zoom={10} style={{ width: '100%', height: '100%' }} scrollWheelZoom={false} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            {polyLine.length > 1 && (
              <Polyline positions={polyLine} pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.85, dashArray: '6 4' }} />
            )}
            {mapPts.map(({ etape, coords }, i) => {
              const score = etape.scoreTopsis ?? 0;
              const icon = i === 0 ? ICON_ENT : score >= 0.75 ? ICON_HIGH : score >= 0.5 ? ICON_MED : ICON_LOW;
              return (
                <Marker key={etape.id} position={[coords.lat, coords.lng]} icon={icon}>
                  <Popup>
                    <strong>{etape.ordre}. {etape.douar.nom}</strong>
                    {etape.population && <><br />{Number(etape.population).toLocaleString('fr-FR')} hab.</>}
                    {etape.scoreTopsis != null && <><br />Priorité : {(etape.scoreTopsis * 100).toFixed(0)}%</>}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      )}

      {/* ── Footer CTA (planifiée uniquement) ── */}
      {tournee.statut === 'planifiee' && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 bg-yellow-50/50 dark:bg-yellow-900/10 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-400">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            En attente d'assignation — Vérifiez le stock et assignez un distributeur.
          </div>
          <button
            onClick={() => onPreparer(tournee.id)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Préparer la Mission
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

type TabFilter = 'all' | 'planifiee' | 'en_cours' | 'terminee';

export default function OrdresRecusPage() {
  const navigate = useNavigate();
  const [tournees, setTournees] = useState<Tournee[]>([]);
  const [crises,   setCrises]   = useState<Crise[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [tab,      setTab]      = useState<TabFilter>('all');

  // Lookup criseId → Crise
  const criseMap = useMemo(() => {
    const m = new Map<string, Crise>();
    crises.forEach(c => m.set(c.id, c));
    return m;
  }, [crises]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [t, c] = await Promise.all([
        tourneeApi.getMine(),
        conditionalCriseApi.getAll().catch(() => [] as Crise[]),
      ]);
      setTournees(t as Tournee[]);
      setCrises(c);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Écoute cross-onglets (pipeline SuperAdmin → mise à jour automatique)
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

  const counts = useMemo(() => ({
    all:       tournees.length,
    planifiee: tournees.filter(t => t.statut === 'planifiee').length,
    en_cours:  tournees.filter(t => t.statut === 'en_cours').length,
    terminee:  tournees.filter(t => t.statut === 'terminee').length,
  }), [tournees]);

  const filtered = tab === 'all' ? tournees : tournees.filter(t => t.statut === tab);

  function handlePreparer(tourneeId: string) {
    navigate('/admin/tournees', { state: { focusTourneeId: tourneeId } });
  }

  const tabs: { key: TabFilter; label: string; count: number; cls: string }[] = [
    { key: 'all',       label: 'Tous',          count: counts.all,       cls: '' },
    { key: 'planifiee', label: 'Nouveaux',       count: counts.planifiee, cls: 'text-yellow-700 bg-yellow-50' },
    { key: 'en_cours',  label: 'En mission',     count: counts.en_cours,  cls: 'text-blue-700 bg-blue-50' },
    { key: 'terminee',  label: 'Terminés',       count: counts.terminee,  cls: 'text-green-700 bg-green-50' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ordres du Super Admin</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Tournées VRP assignées à cet entrepôt · Lisez les détails avant de créer une mission
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Actualiser
        </button>
      </div>

      {/* ── Alerte nouveaux ordres ── */}
      {counts.planifiee > 0 && (
        <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl px-4 py-3">
          <svg className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <p className="text-sm font-bold text-yellow-800 dark:text-yellow-300">
              {counts.planifiee} nouvel{counts.planifiee > 1 ? 's' : ''} ordre{counts.planifiee > 1 ? 's' : ''} reçu{counts.planifiee > 1 ? 's' : ''} du Super Admin
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
              Lisez les détails ci-dessous (crise, douars prioritaires, ressources), puis cliquez <strong>Préparer la Mission</strong> pour assigner un distributeur et lancer la tournée.
            </p>
          </div>
        </div>
      )}

      {/* ── Erreur ── */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ── Onglets filtre ── */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ key, label, count, cls }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
              tab === key
                ? 'ring-2 ring-brand-400 border-transparent ' + (cls || 'bg-gray-100 text-gray-700')
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {label} <span className="ml-1 opacity-70">{count}</span>
          </button>
        ))}
      </div>

      {/* ── Guide workflow ── */}
      {!loading && counts.all > 0 && (
        <div className="flex items-center gap-0 overflow-x-auto pb-1">
          {[
            { n: 1, label: 'Lire les ordres reçus', active: true },
            { n: 2, label: 'Vérifier le stock & véhicule', active: false },
            { n: 3, label: 'Assigner un distributeur', active: false },
            { n: 4, label: 'Autoriser le départ', active: false },
          ].map((step, i, arr) => (
            <div key={step.n} className="flex items-center shrink-0">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  step.active ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }`}>
                  {step.active ? (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : step.n}
                </div>
                <span className={`text-xs mt-1 font-medium hidden sm:block whitespace-nowrap ${step.active ? 'text-brand-600' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div className={`w-12 sm:w-20 h-0.5 mx-2 mb-5 ${step.active ? 'bg-brand-300' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Contenu ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <svg className="w-14 h-14 mx-auto mb-4 opacity-25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
          </svg>
          {tab === 'all' ? (
            <>
              <p className="text-sm font-semibold">Aucun ordre reçu pour le moment</p>
              <p className="text-xs mt-1.5 text-gray-400">Le Super Admin doit d'abord lancer le Pipeline VRP pour votre entrepôt.</p>
            </>
          ) : (
            <p className="text-sm font-semibold">Aucun ordre dans cette catégorie.</p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map(t => (
            <OrdreCard
              key={t.id}
              tournee={t}
              crise={criseMap.get((t as unknown as { criseId: string }).criseId) ?? null}
              onPreparer={handlePreparer}
            />
          ))}
        </div>
      )}
    </div>
  );
}
