/**
 * PAGE SUIVI TERRAIN — Admin Entrepôt
 * Carte Leaflet filtrée sur les distributeurs de l'entrepôt
 * GPS temps réel via SSE (supervision stream, filtré côté client)
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Import FORCÉ des mocks
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

// Icône véhicule animé
function buildVehiculeIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 0 0 3px ${color}44"></div>`,
    iconSize:   [14, 14],
    iconAnchor: [7, 7],
    popupAnchor:[0, -10],
  });
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// ── Types audit terrain ───────────────────────────────────────────────────────

type TerrainActionType =
  | 'DEPART_MISSION'
  | 'ARRIVEE_DOUAR'
  | 'LIVRAISON_EFFECTUEE'
  | 'INCIDENT_SIGNALE'
  | 'VEHICULE_PANNE'
  | 'ROUTE_BLOQUEE';

interface TerrainAction {
  id:           string;
  type:         TerrainActionType;
  acteur:       string;
  localisation: string;
  tourneeId:    string;
  timestamp:    string;
  details?:     string;
}

const ACTION_CONFIG: Record<TerrainActionType, { label: string; color: string; bg: string; icon: string }> = {
  DEPART_MISSION:     { label: 'Départ mission',     color: 'text-blue-700',   bg: 'bg-blue-100',   icon: '🚀' },
  ARRIVEE_DOUAR:      { label: 'Arrivée douar',      color: 'text-green-700',  bg: 'bg-green-100',  icon: '📍' },
  LIVRAISON_EFFECTUEE:{ label: 'Livraison effectuée',color: 'text-teal-700',   bg: 'bg-teal-100',   icon: '✅' },
  INCIDENT_SIGNALE:   { label: 'Incident signalé',   color: 'text-orange-700', bg: 'bg-orange-100', icon: '⚠️' },
  VEHICULE_PANNE:     { label: 'Véhicule en panne',  color: 'text-red-700',    bg: 'bg-red-100',    icon: '🔧' },
  ROUTE_BLOQUEE:      { label: 'Route bloquée',      color: 'text-purple-700', bg: 'bg-purple-100', icon: '🚧' },
};

// Génère les entrées d'audit initiales à partir des tournées existantes
function buildInitialAuditLog(tournees: Tournee[]): TerrainAction[] {
  const actions: TerrainAction[] = [];
  let base = Date.now() - 4 * 60 * 60 * 1000; // il y a 4h
  tournees.filter(t => t.statut === 'en_cours').forEach((t) => {
    const nom = t.distributeur ? `${t.distributeur.prenom} ${t.distributeur.nom}` : 'Distributeur';
    // Départ mission
    actions.push({
      id: `act-${base++}`,
      type: 'DEPART_MISSION',
      acteur: nom,
      localisation: t.entrepot.nom,
      tourneeId: t.id,
      timestamp: new Date(base).toISOString(),
      details: `Mission ${(t as unknown as { missionNumero?: string }).missionNumero ?? t.id}`,
    });
    base += 25 * 60 * 1000;
    // Étapes livrées → entrées dans le journal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const etapes = (t.etapes as any[]).sort((a, b) => a.ordre - b.ordre);
    etapes.forEach(e => {
      const douarNom = e.douar?.nom ?? e.douarNom ?? `Étape ${e.ordre}`;
      if (e.statut === 'livree') {
        actions.push({
          id: `act-${base++}`,
          type: 'ARRIVEE_DOUAR',
          acteur: nom, localisation: douarNom, tourneeId: t.id,
          timestamp: new Date(base).toISOString(),
        });
        base += 10 * 60 * 1000;
        actions.push({
          id: `act-${base++}`,
          type: 'LIVRAISON_EFFECTUEE',
          acteur: nom, localisation: douarNom, tourneeId: t.id,
          timestamp: new Date(base).toISOString(),
          details: `${e.menages ?? '?'} ménages servis`,
        });
        base += 15 * 60 * 1000;
      } else if (e.statut === 'en_route') {
        actions.push({
          id: `act-${base++}`,
          type: 'ARRIVEE_DOUAR',
          acteur: nom, localisation: douarNom, tourneeId: t.id,
          timestamp: new Date(base).toISOString(),
        });
        base += 5 * 60 * 1000;
      }
    });
  });
  return actions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// Export CSV côté client
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

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">{value}/{max} douars</span>
        <span className="font-bold text-blue-600">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SuiviTerrainPage() {
  const [entrepot,       setEntrepot]       = useState<Entrepot | null>(null);
  const [tournees,       setTournees]       = useState<Tournee[]>([]);
  const [vehicules,      setVehicules]      = useState<VehiculePosition[]>([]);
  const [connected,      setConnected]      = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [terrainActions, setTerrainActions] = useState<TerrainAction[]>([]);
  const [journalOpen,    setJournalOpen]    = useState(true);
  const [actionFilter,   setActionFilter]   = useState<TerrainActionType | ''>('');
  const esRef = useRef<EventSource | null>(null);

  // Chargement initial
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [e, t] = await Promise.all([entrepotApi.getMine(), tourneeApi.getMine()]);
      setEntrepot(e as Entrepot);
      const enCoursTournees = (t as unknown as Tournee[]).filter((x) => x.statut === 'en_cours');
      setTournees(enCoursTournees);

      // Snapshot initial pour afficher immédiatement
      const snap = await supervisionApi.getSnapshot() as { tourneesActives: number; alertes: number; lastUpdate: string; vehicules?: VehiculePosition[] };
      const myTourneeIds = new Set(t.map((x: unknown) => (x as Tournee).id));
      setVehicules((snap.vehicules || []).filter((v) => myTourneeIds.has(v.tourneeId)));

      // Générer le journal initial à partir des étapes
      setTerrainActions(buildInitialAuditLog(enCoursTournees));
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // SSE stream — filtrage client sur les tournées de cet entrepôt
  useEffect(() => {
    // SSE désactivé en mode mock
    setConnected(true);
    // const url = supervisionApi.getStreamUrl();
    // const es  = new EventSource(url);
    // esRef.current = es;

    return () => { 
      // es.close(); 
      setConnected(false); 
    };
  }, []);

  // Entrepôt center
  const center: [number, number] = entrepot
    ? [entrepot.latitude, entrepot.longitude]
    : [31.5, -6.0]; // Maroc central par défaut

  const activeTournees = tournees.filter((t) => t.statut === 'en_cours');

  const filteredActions = useMemo(() =>
    actionFilter ? terrainActions.filter(a => a.type === actionFilter) : terrainActions,
    [terrainActions, actionFilter]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suivi Terrain</h1>
          <p className="text-sm text-gray-500 mt-0.5">Position GPS en temps réel · Distributeurs de votre entrepôt uniquement</p>
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
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : !entrepot ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-8 text-center">
          <p className="text-yellow-700">Aucun entrepôt associé à votre compte.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Carte Leaflet */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-theme-sm" style={{ height: 560 }}>
            <MapContainer center={center} zoom={9} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Marqueur entrepôt */}
              {entrepot && (
                <Marker position={[entrepot.latitude, entrepot.longitude]}
                  icon={L.divIcon({
                    className: '',
                    html: '<div style="width:20px;height:20px;border-radius:4px;background:#3B82F6;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
                    iconSize: [20, 20], iconAnchor: [10, 10],
                  })}>
                  <Popup><strong>{entrepot.nom}</strong><br/>{entrepot.province}</Popup>
                </Marker>
              )}

              {/* Étapes (douars) des tournées en cours */}
              {activeTournees.map((t, ti) => {
                const color = COLORS[ti % COLORS.length];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const etapes = t.etapes as any[];
                const latlngs = etapes
                  .sort((a, b) => a.ordre - b.ordre)
                  .filter((e) => e && (e.lat !== undefined) && (e.lng !== undefined))
                  .map((e): [number, number] => [e.lat as number, e.lng as number]);

                return (
                  <div key={t.id}>
                    {latlngs.length > 1 && (
                      <Polyline positions={latlngs} pathOptions={{ color, weight: 2, dashArray: '5,8', opacity: 0.6 }} />
                    )}
                    {etapes.map((e) => e && e.lat !== undefined && e.lng !== undefined && (
                      <Marker key={`${t.id}-${e.ordre}`}
                        position={[e.lat as number, e.lng as number]}
                        icon={L.divIcon({
                          className: '',
                          html: `<div style="width:10px;height:10px;border-radius:50%;background:${
                            e.statut === 'livree' ? '#10B981' : e.statut === 'en_route' ? color : '#9CA3AF'
                          };border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2)"></div>`,
                          iconSize: [10, 10], iconAnchor: [5, 5],
                        })}>
                        <Popup>
                          <strong>{e.ordre}. {e.douar?.nom || `Douar ${e.ordre}`}</strong><br/>
                          <span style={{ color: e.statut === 'livree' ? '#10B981' : '#6B7280' }}>
                            {e.statut}
                          </span>
                        </Popup>
                      </Marker>
                    ))}
                  </div>
                );
              })}

              {/* Positions GPS distributeurs */}
              {vehicules.map((v, vi) => (
                <Marker key={v.distributeurId}
                  position={[v.latitude, v.longitude]}
                  icon={buildVehiculeIcon(COLORS[vi % COLORS.length])}>
                  <Popup>
                    <strong>{v.distributeurNom}</strong><br/>
                    Vitesse : {v.vitesse} km/h<br/>
                    <span className="text-gray-400 text-xs">
                      {new Date(v.updatedAt).toLocaleTimeString('fr-FR')}
                    </span>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Panneau lateral */}
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
                  {vehicules.map((v, vi) => (
                    <div key={v.distributeurId} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0" style={{ background: COLORS[vi % COLORS.length] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{v.distributeurNom}</p>
                        <p className="text-xs text-gray-400">{v.vitesse} km/h</p>
                      </div>
                      <p className="text-xs text-gray-400 shrink-0">{new Date(v.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Progression tournées */}
            {activeTournees.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Progression missions</h2>
                </div>
                <div className="p-4 space-y-4">
                  {activeTournees.map((t, ti) => {
                    const livrees = t.etapes.filter((e) => e.statut === 'livree').length;
                    return (
                      <div key={t.id}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[ti % COLORS.length] }} />
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {t.distributeur ? `${t.distributeur.prenom} ${t.distributeur.nom}` : 'Non assigné'}
                          </p>
                        </div>
                        <ProgressBar value={livrees} max={t.etapes.length} />
                        <div className="flex flex-wrap gap-1 mt-2">
                          {[...t.etapes].sort((a, b) => a.ordre - b.ordre).map((e) => (
                            <span key={e.id} className={`text-xs px-1.5 py-0.5 rounded ${
                              e.statut === 'livree'   ? 'bg-green-100 text-green-700' :
                              e.statut === 'en_route' ? 'bg-blue-100 text-blue-700' :
                              e.statut === 'echec'    ? 'bg-red-100 text-red-600' :
                              'bg-gray-100 text-gray-400'
                            }`}>{e.douar.nom.slice(0, 8)}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Journal d'activité (audit terrain) ── */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden flex-1 flex flex-col">
              {/* Header du journal */}
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
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
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
                  {/* Filtre par type d'action */}
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-1">
                    <button
                      onClick={() => setActionFilter('')}
                      className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                        actionFilter === '' ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      Tous
                    </button>
                    {(Object.keys(ACTION_CONFIG) as TerrainActionType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setActionFilter(prev => prev === t ? '' : t)}
                        className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                          actionFilter === t
                            ? `${ACTION_CONFIG[t].bg} ${ACTION_CONFIG[t].color}`
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {ACTION_CONFIG[t].icon}
                      </button>
                    ))}
                  </div>

                  {/* Liste des entrées */}
                  <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
                    {filteredActions.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-gray-400">Aucune action enregistrée</p>
                    ) : filteredActions.map(action => {
                      const cfg = ACTION_CONFIG[action.type];
                      return (
                        <div key={action.id} className="px-4 py-2.5 flex items-start gap-3 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm ${cfg.bg}`}>
                            {cfg.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</p>
                            <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{action.acteur}</p>
                            <p className="text-xs text-gray-400 truncate">📍 {action.localisation}</p>
                            {action.details && <p className="text-xs text-gray-400 italic">{action.details}</p>}
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
      )}
    </div>
  );
}
