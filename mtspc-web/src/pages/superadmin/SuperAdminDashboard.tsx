/**
 * VUE GLOBALE SUPER-ADMIN — Stats + 2 Cartes Leaflet
 */
import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MOCK_ENTREPOTS, MOCK_DOUBLES } from '../../mock';
import type { Entrepot, Douar } from '../../types';
import { ENTREPOT_STATUT_COLOR } from '../../constants';

// API MOCK
const entrepotApi = {
  getAll: () => Promise.resolve([...MOCK_ENTREPOTS]),
};

// ── Leaflet fix ───────────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const mkIcon = (color: string) => new L.Icon({
  iconUrl:   `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:  [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const ICONS_ENTREPOT: Record<string, L.Icon> = {
  actif:     mkIcon('green'),
  surcharge: mkIcon('red'),
  inactif:   mkIcon('grey'),
};
const ICONS_DOUAR = { servi: mkIcon('green'), nonServi: mkIcon('orange') };

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, colorClass, bgClass }: {
  label: string; value: number | string; icon: React.ReactNode; colorClass: string; bgClass: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-theme-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bgClass} ${colorClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-xl font-bold leading-none ${colorClass}`}>{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

const CENTER: [number, number] = [32.2, -6.0];

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SuperAdminOverview() {
  const [entrepots, setEntrepots] = useState<Entrepot[]>([]);
  const [douars]                  = useState<Douar[]>(MOCK_DOUBLES);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setEntrepots(await entrepotApi.getAll());
    } catch {
      setError('Impossible de charger les données. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const actifs          = entrepots.filter(e => e.statut === 'actif').length;
  const popVulnerable   = douars.filter(d => d.zoneVulnerable).reduce((s, d) => s + d.population, 0);
  const douarsServis    = douars.filter(d => d.servi).length;
  const douarsNonServis = douars.filter(d => !d.servi).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tableau de bord — Super-Admin</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Vue régionale Béni Mellal-Khénifra</p>
        </div>
        <button
          onClick={loadData} disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          Actualiser
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400">✕</button>
        </div>
      )}

      {/* ── 5 Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Entrepôts" value={entrepots.length} colorClass="text-blue-600" bgClass="bg-blue-50"
          icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><line x1="3" y1="9" x2="21" y2="9"/></svg>} />

        <StatCard label="Entrepôts actifs" value={actifs} colorClass="text-green-600" bgClass="bg-green-50"
          icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>} />

        <StatCard label="Population vulnérable" value={popVulnerable.toLocaleString('fr-MA')} colorClass="text-orange-600" bgClass="bg-orange-50"
          icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>} />

        <StatCard label="Douars servis" value={douarsServis} colorClass="text-green-600" bgClass="bg-green-50"
          icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>} />

        <StatCard label="Douars non servis" value={douarsNonServis} colorClass={douarsNonServis > 0 ? 'text-red-600' : 'text-gray-500'} bgClass={douarsNonServis > 0 ? 'bg-red-50' : 'bg-gray-100'}
          icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} />
      </div>

      {/* ── 2 Cartes côte à côte ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Carte Entrepôts */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Carte des Entrepôts</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{entrepots.length} entrepôt(s) · {actifs} actif(s)</p>
          </div>
          <MapContainer center={CENTER} zoom={7} style={{ height: '360px', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {entrepots.map(e => (
              <Marker key={e.id} position={[e.latitude, e.longitude]} icon={ICONS_ENTREPOT[e.statut] ?? ICONS_ENTREPOT.actif}>
                <Popup>
                  <div style={{ minWidth: 170 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 2 }}>{e.nom}</p>
                    <p style={{ color: '#666', fontSize: '0.8rem', margin: '3px 0 5px' }}>{e.province}</p>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700,
                      background: e.statut === 'actif' ? '#e8f5e9' : e.statut === 'surcharge' ? '#ffebee' : '#f5f5f5',
                      color:      e.statut === 'actif' ? '#2e7d32' : e.statut === 'surcharge' ? '#c62828' : '#757575',
                    }}>{e.statut.toUpperCase()}</span>
                    <p style={{ margin: '6px 0 0', fontSize: '0.72rem', fontFamily: 'monospace', color: '#777' }}>
                      {e.latitude.toFixed(4)}, {e.longitude.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          <div className="px-5 py-2.5 border-t border-gray-100 dark:border-gray-800 flex gap-4">
            {[{ statut: 'actif', label: 'Actif' }, { statut: 'surcharge', label: 'Surcharge' }, { statut: 'inactif', label: 'Inactif' }].map(({ statut, label }) => (
              <div key={statut} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ENTREPOT_STATUT_COLOR[statut] }} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Carte Douars */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Carte des Douars</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{douarsServis} servi(s) · {douarsNonServis} non servi(s)</p>
          </div>
          <MapContainer center={CENTER} zoom={7} style={{ height: '360px', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {douars.map(d => (
              <Marker key={d.id} position={[d.latitude, d.longitude]} icon={d.servi ? ICONS_DOUAR.servi : ICONS_DOUAR.nonServi}>
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 2 }}>{d.nom}</p>
                    <p style={{ color: '#666', fontSize: '0.8rem', margin: '3px 0 5px' }}>{d.commune} · {d.province}</p>
                    <p style={{ fontSize: '0.78rem', color: '#555', margin: '0 0 4px' }}>
                      Population : <strong>{d.population.toLocaleString('fr-MA')}</strong>
                    </p>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700,
                      background: d.servi ? '#e8f5e9' : '#fff3e0',
                      color:      d.servi ? '#2e7d32' : '#e65100',
                    }}>{d.servi ? 'SERVI' : 'NON SERVI'}</span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          <div className="px-5 py-2.5 border-t border-gray-100 dark:border-gray-800 flex gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Servi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Non servi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
