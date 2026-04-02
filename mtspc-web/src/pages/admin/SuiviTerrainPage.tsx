/**
 * PAGE SUIVI TERRAIN — Admin Entrepôt
 * Carte Leaflet filtrée sur les distributeurs de l'entrepôt
 * GPS temps réel via SSE (supervision stream, filtré côté client)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supervisionApi, tourneeApi, entrepotApi, getApiErrorMessage } from '../../services/api';
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
  const [entrepot,  setEntrepot]  = useState<Entrepot | null>(null);
  const [tournees,  setTournees]  = useState<Tournee[]>([]);
  const [vehicules, setVehicules] = useState<VehiculePosition[]>([]);
  const [connected, setConnected] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const esRef = useRef<EventSource | null>(null);

  // Chargement initial
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [e, t] = await Promise.all([entrepotApi.getMine(), tourneeApi.getMine()]);
      setEntrepot(e);
      setTournees(t.filter((x) => x.statut === 'en_cours'));

      // Snapshot initial pour afficher immédiatement
      const snap = await supervisionApi.getSnapshot();
      // Filtrer les véhicules appartenant aux tournées de cet entrepôt
      const myTourneeIds = new Set(t.map((x) => x.id));
      setVehicules(snap.vehicules.filter((v) => myTourneeIds.has(v.tourneeId)));
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // SSE stream — filtrage client sur les tournées de cet entrepôt
  useEffect(() => {
    const url = supervisionApi.getStreamUrl();
    const es  = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (event) => {
      try {
        const snap = JSON.parse(event.data);
        setTournees((prev) => {
          const myIds = new Set(prev.map((t) => t.id));
          // Mise à jour du suivi GPS
          setVehicules(snap.vehicules.filter((v: VehiculePosition) => myIds.has(v.tourneeId)));
          return prev;
        });
      } catch { /* ignore parse errors */ }
    };

    return () => { es.close(); setConnected(false); };
  }, []);

  // Entrepôt center
  const center: [number, number] = entrepot
    ? [entrepot.latitude, entrepot.longitude]
    : [31.5, -6.0]; // Maroc central par défaut

  const activeTournees = tournees.filter((t) => t.statut === 'en_cours');

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
                const latlngs = [...t.etapes]
                  .sort((a, b) => a.ordre - b.ordre)
                  .filter((e) => e.douar.latitude && e.douar.longitude)
                  .map((e): [number, number] => [e.douar.latitude, e.douar.longitude]);

                return (
                  <div key={t.id}>
                    {latlngs.length > 1 && (
                      <Polyline positions={latlngs} pathOptions={{ color, weight: 2, dashArray: '5,8', opacity: 0.6 }} />
                    )}
                    {t.etapes.map((e) => e.douar.latitude && (
                      <Marker key={e.id}
                        position={[e.douar.latitude, e.douar.longitude]}
                        icon={L.divIcon({
                          className: '',
                          html: `<div style="width:10px;height:10px;border-radius:50%;background:${
                            e.statut === 'livree' ? '#10B981' : e.statut === 'en_route' ? color : '#9CA3AF'
                          };border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2)"></div>`,
                          iconSize: [10, 10], iconAnchor: [5, 5],
                        })}>
                        <Popup>
                          <strong>{e.ordre}. {e.douar.nom}</strong><br/>
                          {e.douar.commune}<br/>
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
          <div className="space-y-4">
            {/* Distributeurs actifs */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  Distributeurs en terrain
                  <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full font-bold">{vehicules.length}</span>
                </h2>
              </div>
              {vehicules.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">Aucun distributeur en mission</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {vehicules.map((v, vi) => (
                    <div key={v.distributeurId} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0" style={{ background: COLORS[vi % COLORS.length] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{v.distributeurNom}</p>
                        <p className="text-xs text-gray-400">{v.vitesse} km/h · cap {v.cap}°</p>
                      </div>
                      <p className="text-xs text-gray-400 shrink-0">{new Date(v.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Progression tournées */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Progression missions</h2>
              </div>
              {activeTournees.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">Aucune mission en cours</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800 p-4 space-y-4">
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
