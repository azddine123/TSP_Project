/**
 * PAGE SUIVI TERRAIN — Admin Entrepôt
 * Carte Leaflet filtrée sur les distributeurs de l'entrepôt
 * GPS temps réel via SSE (supervision stream, filtré côté client)
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mockSupervisionApi as supervisionApi, mockTourneeApi as tourneeApi, mockEntrepotApi as entrepotApi } from '../../mock/adminApi';
import { getApiErrorMessage } from '../../services/api';
import type { Tournee, Entrepot, VehiculePosition } from '../../types';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const PRIORITE_STYLE: Record<string, { color: string; ring: string; label: string }> = {
  CRITIQUE: { color: '#EF4444', ring: '#FCA5A5', label: 'Critique' },
  HAUTE:    { color: '#F97316', ring: '#FED7AA', label: 'Haute'    },
  MOYENNE:  { color: '#3B82F6', ring: '#BFDBFE', label: 'Moyenne'  },
  BASSE:    { color: '#10B981', ring: '#A7F3D0', label: 'Basse'    },
};

// ── Icône entrepôt ────────────────────────────────────────────────────────────
const ENTREPOT_ICON = L.divIcon({
  className: '',
  html: `<div style="width:34px;height:34px;border-radius:8px;background:#1E40AF;border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;letter-spacing:0.5px;">ENT</div>`,
  iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -20],
});

// ── Icône douar (taille + couleur par priorité et statut) ─────────────────────
function buildDouarIcon(priorite: string, statut: string) {
  const p   = PRIORITE_STYLE[priorite] ?? PRIORITE_STYLE.MOYENNE;
  const bg  = statut === 'livree'   ? '#10B981'
            : statut === 'en_route' ? p.color
            : statut === 'echec'    ? '#EF4444'
            :                         '#9CA3AF';
  const ring = statut === 'livree'   ? '#A7F3D0'
             : statut === 'en_route' ? p.ring
             : statut === 'echec'    ? '#FCA5A5'
             :                         '#E5E7EB';
  const size = statut === 'en_route' ? 15 : statut === 'livree' ? 11 : 9;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2px solid white;box-shadow:0 0 0 3px ${ring};transition:all 0.3s"></div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2],
  });
}

// ── Icône véhicule GPS ────────────────────────────────────────────────────────
function buildVehiculeIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:22px;height:22px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.25;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:absolute;inset:3px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
      </div>`,
    iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -14],
  });
}

// ── Auto-fit bounds ───────────────────────────────────────────────────────────
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(L.latLngBounds(positions), { padding: [50, 50], maxZoom: 11 });
    }
  }, [map, positions.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// ── Types audit terrain ───────────────────────────────────────────────────────
type TerrainActionType =
  | 'DEPART_MISSION' | 'ARRIVEE_DOUAR' | 'LIVRAISON_EFFECTUEE'
  | 'INCIDENT_SIGNALE' | 'VEHICULE_PANNE' | 'ROUTE_BLOQUEE';

interface TerrainAction {
  id: string; type: TerrainActionType; acteur: string;
  localisation: string; tourneeId: string; timestamp: string; details?: string;
}

const ACTION_CONFIG: Record<TerrainActionType, { label: string; color: string; bg: string; icon: string }> = {
  DEPART_MISSION:     { label: 'Départ mission',     color: 'text-blue-700',   bg: 'bg-blue-100',   icon: 'D' },
  ARRIVEE_DOUAR:      { label: 'Arrivée douar',      color: 'text-green-700',  bg: 'bg-green-100',  icon: 'A' },
  LIVRAISON_EFFECTUEE:{ label: 'Livraison effectuée',color: 'text-teal-700',   bg: 'bg-teal-100',   icon: 'L' },
  INCIDENT_SIGNALE:   { label: 'Incident signalé',   color: 'text-orange-700', bg: 'bg-orange-100', icon: '!' },
  VEHICULE_PANNE:     { label: 'Véhicule en panne',  color: 'text-red-700',    bg: 'bg-red-100',    icon: 'P' },
  ROUTE_BLOQUEE:      { label: 'Route bloquée',      color: 'text-purple-700', bg: 'bg-purple-100', icon: 'B' },
};

function buildInitialAuditLog(tournees: Tournee[]): TerrainAction[] {
  const actions: TerrainAction[] = [];
  let base = Date.now() - 4 * 60 * 60 * 1000;
  tournees.filter(t => t.statut === 'en_cours').forEach((t) => {
    const nom = t.distributeur ? `${t.distributeur.prenom} ${t.distributeur.nom}` : 'Distributeur';
    actions.push({ id: `act-${base++}`, type: 'DEPART_MISSION', acteur: nom, localisation: t.entrepot.nom,
      tourneeId: t.id, timestamp: new Date(base).toISOString(),
      details: `Mission ${(t as unknown as { missionNumero?: string }).missionNumero ?? t.id}` });
    base += 25 * 60 * 1000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const etapes = (t.etapes as any[]).sort((a, b) => a.ordre - b.ordre);
    etapes.forEach(e => {
      const douarNom = e.douar?.nom ?? e.douarNom ?? `Étape ${e.ordre}`;
      if (e.statut === 'livree') {
        actions.push({ id: `act-${base++}`, type: 'ARRIVEE_DOUAR', acteur: nom, localisation: douarNom, tourneeId: t.id, timestamp: new Date(base).toISOString() });
        base += 10 * 60 * 1000;
        actions.push({ id: `act-${base++}`, type: 'LIVRAISON_EFFECTUEE', acteur: nom, localisation: douarNom, tourneeId: t.id, timestamp: new Date(base).toISOString(), details: `${e.menages ?? '?'} ménages servis` });
        base += 15 * 60 * 1000;
      } else if (e.statut === 'en_route') {
        actions.push({ id: `act-${base++}`, type: 'ARRIVEE_DOUAR', acteur: nom, localisation: douarNom, tourneeId: t.id, timestamp: new Date(base).toISOString() });
        base += 5 * 60 * 1000;
      }
    });
  });
  return actions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function exportActionsCSV(actions: TerrainAction[]) {
  const header = 'Horodatage,Action,Acteur,Localisation,Détails\n';
  const rows = actions.map(a =>
    `"${new Date(a.timestamp).toLocaleString('fr-FR')}","${ACTION_CONFIG[a.type]?.label ?? a.type}","${a.acteur}","${a.localisation}","${a.details ?? ''}"`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `journal-terrain-${Date.now()}.csv`;
  link.click(); URL.revokeObjectURL(url);
}

// ── Sous-composants UI ────────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">{value}/{max} douars</span>
        <span className="font-bold text-blue-600">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatChip({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 flex-1 min-w-[140px]">
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Légende carte (overlay sur la carte) ─────────────────────────────────────
function MapLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden select-none min-w-[120px]">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full"
      >
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
        </svg>
        Légende
        <svg className={`w-3 h-3 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1 text-xs border-t border-gray-100 dark:border-gray-800 pt-2">
          <p className="font-semibold text-gray-400 uppercase tracking-wide text-[10px] mb-1.5">Priorité douar</p>
          {Object.entries(PRIORITE_STYLE).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0 border-2 border-white" style={{ background: v.color, boxShadow: `0 0 0 2px ${v.ring}` }} />
              <span className="text-gray-600 dark:text-gray-400">{v.label}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 dark:border-gray-800 mt-2 pt-2">
            <p className="font-semibold text-gray-400 uppercase tracking-wide text-[10px] mb-1.5">Statut</p>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shrink-0" /><span className="text-gray-600 dark:text-gray-400">Livré</span></div>
            <div className="flex items-center gap-2 mt-1"><div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shrink-0" /><span className="text-gray-600 dark:text-gray-400">En route</span></div>
            <div className="flex items-center gap-2 mt-1"><div className="w-3 h-3 rounded-full bg-gray-400 border-2 border-white shrink-0" /><span className="text-gray-600 dark:text-gray-400">En attente</span></div>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 mt-2 pt-2">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-md bg-blue-800 shrink-0 flex items-center justify-center text-[8px] font-bold text-white">E</div><span className="text-gray-600 dark:text-gray-400">Entrepôt</span></div>
            <div className="flex items-center gap-2 mt-1"><div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shrink-0" /><span className="text-gray-600 dark:text-gray-400">Véhicule GPS</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function SuiviTerrainPage() {
  const [entrepot,           setEntrepot]           = useState<Entrepot | null>(null);
  const [tournees,           setTournees]           = useState<Tournee[]>([]);
  const [vehicules,          setVehicules]          = useState<VehiculePosition[]>([]);
  const [connected,          setConnected]          = useState(false);
  const [error,              setError]              = useState<string | null>(null);
  const [loading,            setLoading]            = useState(true);
  const [terrainActions,     setTerrainActions]     = useState<TerrainAction[]>([]);
  const [journalOpen,        setJournalOpen]        = useState(true);
  const [actionFilter,       setActionFilter]       = useState<TerrainActionType | ''>('');
  const [highlightedTournee, setHighlightedTournee] = useState<string | null>(null);
  const [now,                setNow]                = useState(() => new Date());

  // Horloge temps réel (affichage)
  useEffect(() => {
    const tid = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tid);
  }, []);

  // Chargement initial
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [e, t] = await Promise.all([entrepotApi.getMine(), tourneeApi.getMine()]);
      setEntrepot(e as Entrepot);
      const all = t as unknown as Tournee[];
      setTournees(all);

      const snap = await supervisionApi.getSnapshot() as {
        tourneesActives: number; alertes: number; lastUpdate: string; vehicules?: VehiculePosition[];
      };
      const myIds = new Set(all.map((x) => x.id));
      const snapshotVehicules = (snap.vehicules || []).filter((v) => myIds.has(v.tourneeId));

      // Si le snapshot n'a pas de véhicules, initialiser depuis les tournées en cours
      const enCours = all.filter(x => x.statut === 'en_cours');
      if (snapshotVehicules.length === 0 && enCours.length > 0) {
        setVehicules(enCours.map((t) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sorted = (t.etapes as any[]).sort((a, b) => a.ordre - b.ordre);
          const first  = sorted[0];
          return {
            distributeurId:  t.distributeur?.id || t.id,
            distributeurNom: t.distributeur ? `${t.distributeur.prenom} ${t.distributeur.nom}` : 'Non assigné',
            tourneeId:       t.id,
            latitude:        first?.lat  ?? (e as Entrepot).latitude,
            longitude:       first?.lng  ?? (e as Entrepot).longitude,
            vitesse: 35,
            cap:     0,
            updatedAt: new Date().toISOString(),
          } as VehiculePosition;
        }));
      } else {
        setVehicules(snapshotVehicules);
      }

      setTerrainActions(buildInitialAuditLog(enCours));
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // SSE → désactivé en mock ; marquer connecté
  useEffect(() => { setConnected(true); return () => setConnected(false); }, []);

  // Simulation GPS : déplace les véhicules vers l'étape en_route toutes les 3s
  useEffect(() => {
    const enCours = tournees.filter(t => t.statut === 'en_cours');
    if (enCours.length === 0) return;
    const interval = setInterval(() => {
      setVehicules(prev => prev.map(v => {
        const t = enCours.find(x => x.id === v.tourneeId);
        if (!t) return v;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sorted = (t.etapes as any[]).sort((a: any, b: any) => a.ordre - b.ordre);
        const target = sorted.find((e: any) => e.statut === 'en_route') ?? sorted.find((e: any) => e.statut === 'en_attente');
        if (!target) return v;
        const dLat = (target.lat - v.latitude) * 0.07;
        const dLng = (target.lng - v.longitude) * 0.07;
        if (Math.abs(dLat) < 0.0001 && Math.abs(dLng) < 0.0001) return v;
        return {
          ...v,
          latitude:  v.latitude  + dLat,
          longitude: v.longitude + dLng,
          vitesse:   Math.floor(20 + Math.random() * 45),
          updatedAt: new Date().toISOString(),
        };
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [tournees]);

  // Dérivés
  const activeTournees  = useMemo(() => tournees.filter(t => t.statut === 'en_cours'),  [tournees]);
  const filteredActions = useMemo(() =>
    actionFilter ? terrainActions.filter(a => a.type === actionFilter) : terrainActions,
    [terrainActions, actionFilter]
  );

  // Toutes les positions pour FitBounds
  const allPositions = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    if (entrepot) pts.push([entrepot.latitude, entrepot.longitude]);
    activeTournees.forEach(t => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t.etapes as any[]).forEach(e => { if (e?.lat && e?.lng) pts.push([e.lat, e.lng]); });
    });
    vehicules.forEach(v => pts.push([v.latitude, v.longitude]));
    return pts;
  }, [entrepot, activeTournees, vehicules]);

  // Stats globales
  const stats = useMemo(() => {
    let totalDouars = 0, livres = 0, population = 0, distanceCoverd = 0;
    activeTournees.forEach(t => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t.etapes as any[]).forEach(e => {
        totalDouars++;
        if (e.statut === 'livree') { livres++; }
        population += e.population ?? 0;
      });
      distanceCoverd += (t.distanceTotale ?? 0);
    });
    return { totalDouars, livres, population, distanceCoverd: Math.round(distanceCoverd) };
  }, [activeTournees]);

  const center: [number, number] = entrepot
    ? [entrepot.latitude, entrepot.longitude]
    : [31.5, -6.0];

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suivi Terrain</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Position GPS en temps réel · Distributeurs de votre entrepôt uniquement ·{' '}
            <span className="font-mono text-gray-600 dark:text-gray-300">
              {now.toLocaleTimeString('fr-FR')}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {connected ? 'Temps réel' : 'Déconnecté'}
          </span>
          <button onClick={load} disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2">
          {error}<button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : !entrepot ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-8 text-center">
          <p className="text-yellow-700">Aucun entrepôt associé à votre compte.</p>
        </div>
      ) : (
        <>
          {/* ── Stats bar ──────────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3">
            <StatChip label="Missions actives"   value={activeTournees.length}      sub={`${tournees.filter(t=>t.statut==='planifiee').length} planifiées`} />
            <StatChip label="Douars couverts"    value={`${stats.livres}/${stats.totalDouars}`} sub="livraisons" />
            <StatChip label="Population ciblée"  value={stats.population.toLocaleString('fr-FR')} sub="habitants" />
            <StatChip label="Distance totale"    value={`${stats.distanceCoverd} km`} sub="itinéraires planifiés" />
            <StatChip label="Véhicules en live"  value={vehicules.length}            sub="positions GPS actives" />
          </div>

          {/* ── Contenu principal ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Carte Leaflet ─────────────────────────────────────────────── */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              {/* Filtres tournées */}
              {activeTournees.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-gray-500 font-medium">Filtrer :</span>
                  <button
                    onClick={() => setHighlightedTournee(null)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors border ${!highlightedTournee ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400'}`}
                  >Toutes</button>
                  {activeTournees.map((t, ti) => (
                    <button
                      key={t.id}
                      onClick={() => setHighlightedTournee(h => h === t.id ? null : t.id)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors border ${highlightedTournee === t.id ? 'text-white border-transparent' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400'}`}
                      style={highlightedTournee === t.id ? { background: COLORS[ti % COLORS.length], borderColor: COLORS[ti % COLORS.length] } : {}}
                    >
                      {t.distributeur ? `${t.distributeur.prenom} ${t.distributeur.nom}` : `Mission ${ti + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Map wrapper — position relative pour overlay légende */}
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-theme-sm" style={{ height: 560 }}>
                <MapContainer center={center} zoom={9} style={{ height: '100%', width: '100%' }} zoomControl={true}>

                  {/* Couches tuiles */}
                  <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="OpenStreetMap">
                      <TileLayer
                        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satellite (ESRI)">
                      <TileLayer
                        attribution='Tiles &copy; Esri'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Terrain (Stamen)">
                      <TileLayer
                        attribution='Map tiles by Stamen Design'
                        url="https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png"
                      />
                    </LayersControl.BaseLayer>
                  </LayersControl>

                  {/* Auto-fit bounds */}
                  <FitBounds positions={allPositions} />

                  {/* ── Marqueur entrepôt ── */}
                  <Marker position={[entrepot.latitude, entrepot.longitude]} icon={ENTREPOT_ICON}>
                    <Popup>
                      <div style={{ minWidth: 160 }}>
                        <p style={{ fontWeight: 700, marginBottom: 4 }}>{entrepot.nom}</p>
                        <p style={{ color: '#6B7280', fontSize: 12 }}>{entrepot.province} — {entrepot.wilaya}</p>
                        <p style={{ marginTop: 6, fontSize: 12 }}>
                          <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                            {activeTournees.length} mission{activeTournees.length !== 1 ? 's' : ''} active{activeTournees.length !== 1 ? 's' : ''}
                          </span>
                        </p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* ── Tournées en cours ── */}
                  {activeTournees.map((t, ti) => {
                    const color   = COLORS[ti % COLORS.length];
                    const dimmed  = highlightedTournee !== null && highlightedTournee !== t.id;
                    const opacity = dimmed ? 0.25 : 1;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const etapes  = (t.etapes as any[]).sort((a, b) => a.ordre - b.ordre)
                                      .filter((e: any) => e?.lat !== undefined && e?.lng !== undefined);
                    const latlngs: [number, number][] = etapes.map((e: any) => [e.lat as number, e.lng as number]);

                    // Ligne depuis entrepôt vers premier douar
                    const depotToFirst: [number, number][] = latlngs.length > 0
                      ? [[entrepot.latitude, entrepot.longitude], latlngs[0]]
                      : [];

                    return (
                      <div key={t.id}>
                        {/* Ligne entrepôt → 1er douar */}
                        {depotToFirst.length === 2 && (
                          <Polyline
                            positions={depotToFirst}
                            pathOptions={{ color, weight: 2, dashArray: '4,6', opacity: opacity * 0.5 }}
                          />
                        )}
                        {/* Itinéraire entre douars */}
                        {latlngs.length > 1 && (
                          <Polyline
                            positions={latlngs}
                            pathOptions={{ color, weight: highlightedTournee === t.id ? 3.5 : 2.5, dashArray: '6,9', opacity: opacity * 0.75 }}
                          />
                        )}
                        {/* Marqueurs des étapes */}
                        {etapes.map((e: any) => (
                          <Marker
                            key={`${t.id}-${e.ordre}`}
                            position={[e.lat as number, e.lng as number]}
                            icon={buildDouarIcon(e.priorite ?? 'MOYENNE', e.statut)}
                            opacity={opacity}
                          >
                            <Popup>
                              <div style={{ minWidth: 180 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: PRIORITE_STYLE[e.priorite ?? 'MOYENNE']?.color ?? '#6B7280', flexShrink: 0 }} />
                                  <p style={{ fontWeight: 700, fontSize: 13 }}>{e.douar?.nom ?? e.douarNom ?? `Étape ${e.ordre}`}</p>
                                </div>
                                <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>{e.douar?.commune ?? ''}</p>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                                  <span style={{ background: e.statut === 'livree' ? '#D1FAE5' : e.statut === 'en_route' ? '#DBEAFE' : '#F3F4F6', color: e.statut === 'livree' ? '#065F46' : e.statut === 'en_route' ? '#1D4ED8' : '#6B7280', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                                    {e.statut === 'livree' ? 'Livré' : e.statut === 'en_route' ? 'En route' : e.statut === 'en_attente' ? 'En attente' : e.statut}
                                  </span>
                                  <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 7px', borderRadius: 4, fontSize: 11 }}>
                                    TOPSIS {(e.scoreTopsis ?? 0).toFixed(2)}
                                  </span>
                                </div>
                                <table style={{ fontSize: 11, width: '100%', borderCollapse: 'collapse' }}>
                                  <tbody>
                                    <tr><td style={{ color: '#9CA3AF', paddingRight: 8 }}>Population</td><td style={{ fontWeight: 600 }}>{(e.population ?? 0).toLocaleString('fr-FR')} hab.</td></tr>
                                    <tr><td style={{ color: '#9CA3AF', paddingRight: 8 }}>Ménages</td><td style={{ fontWeight: 600 }}>{e.menages ?? '—'}</td></tr>
                                    {e.ressources && (
                                      <>
                                        <tr><td style={{ color: '#9CA3AF', paddingRight: 8 }}>Tentes</td><td style={{ fontWeight: 600 }}>{e.ressources.tentes}</td></tr>
                                        <tr><td style={{ color: '#9CA3AF', paddingRight: 8 }}>Vivres</td><td style={{ fontWeight: 600 }}>{e.ressources.vivres} kits</td></tr>
                                        <tr><td style={{ color: '#9CA3AF', paddingRight: 8 }}>Eau</td><td style={{ fontWeight: 600 }}>{e.ressources.eau_litres} L</td></tr>
                                        <tr><td style={{ color: '#9CA3AF', paddingRight: 8 }}>Kits méd.</td><td style={{ fontWeight: 600 }}>{e.ressources.kits_med}</td></tr>
                                      </>
                                    )}
                                  </tbody>
                                </table>
                                <p style={{ marginTop: 6, fontSize: 10, color: '#9CA3AF' }}>
                                  Ordre {e.ordre} · {t.distributeur ? `${t.distributeur.prenom} ${t.distributeur.nom}` : '—'}
                                </p>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </div>
                    );
                  })}

                  {/* ── Positions GPS des véhicules ── */}
                  {vehicules.map((v, vi) => {
                    const tIdx    = activeTournees.findIndex(t => t.id === v.tourneeId);
                    const color   = COLORS[tIdx >= 0 ? tIdx % COLORS.length : vi % COLORS.length];
                    const dimmed  = highlightedTournee !== null && highlightedTournee !== v.tourneeId;
                    return (
                      <Marker
                        key={v.distributeurId}
                        position={[v.latitude, v.longitude]}
                        icon={buildVehiculeIcon(color)}
                        opacity={dimmed ? 0.25 : 1}
                      >
                        <Popup>
                          <div style={{ minWidth: 160 }}>
                            <p style={{ fontWeight: 700, marginBottom: 2 }}>{v.distributeurNom}</p>
                            <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>
                              {activeTournees.find(t => t.id === v.tourneeId)
                                ? `Mission ${(activeTournees.find(t => t.id === v.tourneeId) as unknown as { missionNumero?: string }).missionNumero ?? ''}`
                                : 'Mission inconnue'}
                            </p>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                                {v.vitesse} km/h
                              </span>
                            </div>
                            <p style={{ marginTop: 6, fontSize: 10, color: '#9CA3AF' }}>
                              Mis à jour {new Date(v.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                </MapContainer>

                {/* Légende overlay (hors MapContainer, superposée via z-index) */}
                <div className="absolute bottom-5 left-3" style={{ zIndex: 999, pointerEvents: 'auto' }}>
                  <MapLegend />
                </div>
              </div>
            </div>

            {/* ── Panneau latéral ─────────────────────────────────────────── */}
            <div className="space-y-4 flex flex-col">

              {/* Distributeurs actifs */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    Distributeurs en terrain
                    <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full font-bold">{vehicules.length}</span>
                  </h2>
                </div>
                {vehicules.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">Aucun distributeur en mission</p>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {vehicules.map((v, vi) => {
                      const tIdx    = activeTournees.findIndex(t => t.id === v.tourneeId);
                      const color   = COLORS[tIdx >= 0 ? tIdx % COLORS.length : vi % COLORS.length];
                      const tournee = activeTournees.find(t => t.id === v.tourneeId);
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const etapes  = tournee ? (tournee.etapes as any[]).sort((a, b) => a.ordre - b.ordre) : [];
                      const enRoute = etapes.find((e: any) => e.statut === 'en_route');
                      const next    = enRoute ?? etapes.find((e: any) => e.statut === 'en_attente');
                      const livrees = etapes.filter((e: any) => e.statut === 'livree').length;
                      return (
                        <div
                          key={v.distributeurId}
                          className={`px-4 py-3 cursor-pointer transition-colors ${highlightedTournee === v.tourneeId ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                          onMouseEnter={() => setHighlightedTournee(v.tourneeId)}
                          onMouseLeave={() => setHighlightedTournee(null)}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold" style={{ background: color }}>
                              {v.distributeurNom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{v.distributeurNom}</p>
                              <p className="text-xs text-gray-400">{v.vitesse} km/h · GPS actif</p>
                            </div>
                            <div className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0" style={{ background: color }} />
                          </div>
                          {tournee && (
                            <div className="mt-1.5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">{livrees}/{etapes.length} douars</span>
                                {(tournee as unknown as { missionNumero?: string }).missionNumero && (
                                  <span className="text-xs font-mono text-blue-600 dark:text-blue-400">{(tournee as unknown as { missionNumero?: string }).missionNumero}</span>
                                )}
                              </div>
                              <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${etapes.length ? Math.round(livrees / etapes.length * 100) : 0}%`, background: color }} />
                              </div>
                              {next && (
                                <p className="text-xs text-gray-400 truncate">
                                  {enRoute ? 'En route :' : 'Prochain :'}{' '}
                                  <span className="text-gray-600 dark:text-gray-300 font-medium">{next.douar?.nom ?? next.douarNom}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Progression missions */}
              {activeTournees.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      Progression missions
                      <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-600 rounded-full font-bold">{activeTournees.length}</span>
                    </h2>
                  </div>
                  <div className="p-4 space-y-4">
                    {activeTournees.map((t, ti) => {
                      const livrees = t.etapes.filter(e => e.statut === 'livree').length;
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const etapes  = [...t.etapes].sort((a, b) => a.ordre - b.ordre) as any[];
                      return (
                        <div
                          key={t.id}
                          className={`rounded-xl p-3 cursor-pointer transition-colors ${highlightedTournee === t.id ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                          onMouseEnter={() => setHighlightedTournee(t.id)}
                          onMouseLeave={() => setHighlightedTournee(null)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[ti % COLORS.length] }} />
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                              {t.distributeur ? `${t.distributeur.prenom} ${t.distributeur.nom}` : 'Non assigné'}
                            </p>
                            <span className="text-xs text-gray-400">{t.distanceTotale} km</span>
                          </div>
                          <ProgressBar value={livrees} max={t.etapes.length} />
                          <div className="flex flex-wrap gap-1 mt-2">
                            {etapes.map((e: any) => (
                              <span
                                key={e.id}
                                title={`${e.douar?.nom ?? e.douarNom} — ${e.statut}`}
                                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  e.statut === 'livree'   ? 'bg-green-100 text-green-700' :
                                  e.statut === 'en_route' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' :
                                  e.statut === 'echec'    ? 'bg-red-100 text-red-600' :
                                  'bg-gray-100 text-gray-400'
                                }`}
                              >
                                {(e.douar?.nom ?? e.douarNom ?? '').slice(0, 7)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Journal d'activité ── */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden flex-1 flex flex-col">
                <div
                  className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  onClick={() => setJournalOpen(o => !o)}
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Journal d'activité</h2>
                    <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full font-bold">
                      {filteredActions.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); exportActionsCSV(filteredActions); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                      title="Exporter CSV"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${journalOpen ? 'rotate-180' : ''}`}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>

                {journalOpen && (
                  <>
                    {/* Filtre */}
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-1">
                      <button
                        onClick={() => setActionFilter('')}
                        className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                          actionFilter === ''
                            ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                      >Tous</button>
                      {(Object.keys(ACTION_CONFIG) as TerrainActionType[]).map(type => (
                        <button
                          key={type}
                          onClick={() => setActionFilter(prev => prev === type ? '' : type)}
                          title={ACTION_CONFIG[type].label}
                          className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                            actionFilter === type
                              ? `${ACTION_CONFIG[type].bg} ${ACTION_CONFIG[type].color}`
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {ACTION_CONFIG[type].icon}
                        </button>
                      ))}
                    </div>

                    {/* Entrées */}
                    <div className="overflow-y-auto" style={{ maxHeight: 300 }}>
                      {filteredActions.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-gray-400">Aucune action enregistrée</p>
                      ) : filteredActions.map(action => {
                        const cfg = ACTION_CONFIG[action.type];
                        return (
                          <div
                            key={action.id}
                            className="px-4 py-2.5 flex items-start gap-3 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm ${cfg.bg}`}>
                              {cfg.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</p>
                              <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{action.acteur}</p>
                              <p className="text-xs text-gray-400 truncate">{action.localisation}</p>
                              {action.details && <p className="text-xs text-gray-400 italic truncate">{action.details}</p>}
                            </div>
                            <p className="text-xs text-gray-400 shrink-0 text-right">
                              {new Date(action.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
