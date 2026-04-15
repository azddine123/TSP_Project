/**
 * VUE GLOBALE SUPER-ADMIN — Carte unifiée + liaisons inter-acteurs
 * ================================================================
 * Affiche en une seule vue : entrepôts, douars, tournées actives et GPS véhicules.
 * Les KPIs cross-acteurs relient la réalité du terrain au stock et à la flotte.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MOCK_ENTREPOTS,
  MOCK_DOUBLES,
  TOURNEES_ENTREPOT_A,
  STOCK_ENTREPOT_A,
  VEHICULES_ENTREPOT_A,
  DISTRIBUTEURS_ENTREPOT_A,
  ENTREPOT_A,
  MOCK_AUDIT_LOGS,
} from '../../mock';
import { formatDateTime } from '../../constants';

// ── Palettes & icônes ─────────────────────────────────────────────────────────

const TOURNEE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'];

const ENTREPOT_ICON = L.divIcon({
  html: `<div style="width:30px;height:30px;background:#3b82f6;border:2px solid #fff;border-radius:5px;
    display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:800;
    box-shadow:0 2px 8px rgba(59,130,246,.5);letter-spacing:-.5px">ENT</div>`,
  className: '',
  iconSize:   [30, 30],
  iconAnchor: [15, 15],
  popupAnchor:[0, -18],
});

function makeDourIcon(fill: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
    <circle cx="9" cy="9" r="7" fill="${fill}" stroke="#fff" stroke-width="2.5"/>
  </svg>`;
  return L.divIcon({
    html: `<div style="width:18px;height:18px">${svg}</div>`,
    className: '',
    iconSize:   [18, 18],
    iconAnchor: [9, 9],
    popupAnchor:[0, -12],
  });
}

function makeVehicleIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" fill="#3b82f6" fill-opacity="0.25">
      <animate attributeName="r" values="7;11;7" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="fill-opacity" values="0.4;0.08;0.4" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="12" r="5" fill="#3b82f6" stroke="#fff" stroke-width="2"/>
  </svg>`;
  return L.divIcon({
    html: `<div style="width:24px;height:24px">${svg}</div>`,
    className: '',
    iconSize:   [24, 24],
    iconAnchor: [12, 12],
    popupAnchor:[0, -14],
  });
}

const DOUAR_ICONS = {
  servi:       makeDourIcon('#10b981'),
  vulnerable:  makeDourIcon('#ef4444'),
  nonServi:    makeDourIcon('#f97316'),
};
const VEHICLE_ICON = makeVehicleIcon();

// ── FitBounds helper ──────────────────────────────────────────────────────────

function MapFit() {
  const map = useMap();
  useEffect(() => {
    const coords: [number, number][] = [
      ...MOCK_ENTREPOTS.map(e => [e.latitude, e.longitude] as [number, number]),
      ...MOCK_DOUBLES.map(d => [d.latitude, d.longitude] as [number, number]),
    ];
    if (coords.length > 0) map.fitBounds(coords, { padding: [30, 30] });
  }, [map]);
  return null;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon, color, to,
}: {
  label: string; value: React.ReactNode; icon: React.ReactNode;
  color: { text: string; bg: string }; to?: string;
}) {
  const inner = (
    <div className={`flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-theme-sm ${to ? 'hover:shadow-theme-md cursor-pointer transition-shadow' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color.bg} ${color.text}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-xl font-bold leading-none ${color.text}`}>{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{label}</p>
      </div>
      {to && (
        <svg className="w-4 h-4 text-gray-300 ml-auto shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      )}
    </div>
  );
  return to ? <Link to={to} className="block">{inner}</Link> : <div>{inner}</div>;
}

// ── Légende carte ─────────────────────────────────────────────────────────────

function MapLegend() {
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16, zIndex: 999,
      background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: '8px 12px',
      border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,.1)',
      fontSize: 11, lineHeight: '1.8',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#374151' }}>Légende</div>
      {[
        { color: '#3b82f6', shape: 'square', label: 'Entrepôt' },
        { color: '#10b981', shape: 'circle', label: 'Douar servi' },
        { color: '#f97316', shape: 'circle', label: 'Douar non servi' },
        { color: '#ef4444', shape: 'circle', label: 'Douar vulnérable' },
        { color: '#3b82f6', shape: 'circle', label: 'Véhicule GPS' },
        { color: '#6366f1', shape: 'line',   label: 'Tournée active' },
      ].map(({ color, shape, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {shape === 'square' && <div style={{ width: 12, height: 12, background: color, borderRadius: 2, border: '1px solid #fff', flexShrink: 0 }} />}
          {shape === 'circle' && <div style={{ width: 12, height: 12, background: color, borderRadius: '50%', border: '1px solid #fff', flexShrink: 0 }} />}
          {shape === 'line'   && <div style={{ width: 20, height: 2, background: color, borderRadius: 1, flexShrink: 0, borderTop: `2px dashed ${color}` }} />}
          <span style={{ color: '#4b5563' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Badge opération audit ─────────────────────────────────────────────────────

const OP_BADGE: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-700',
};

// ── Page principale ───────────────────────────────────────────────────────────

export default function SuperAdminOverview() {
  const [now, setNow] = useState(() => new Date());
  const [refresh, setRefresh] = useState(0);

  // Horloge live
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = useCallback(() => setRefresh(r => r + 1), []);

  // ── KPIs cross-acteurs ────────────────────────────────────────────────────
  const entrepotsActifs  = MOCK_ENTREPOTS.filter(e => e.statut === 'actif').length;
  const tourneesEnCours  = TOURNEES_ENTREPOT_A.filter(t => t.statut === 'en_cours').length;
  const stockEnAlerte    = STOCK_ENTREPOT_A.filter(s => s.quantite <= s.seuilAlerte).length;
  const douarsServis     = MOCK_DOUBLES.filter(d => d.servi).length;
  const distributeursActifs = DISTRIBUTEURS_ENTREPOT_A.filter(d => d.statut === 'en_mission').length;
  const popCouverte      = MOCK_DOUBLES.filter(d => d.servi).reduce((s, d) => s + d.population, 0);

  // ── Liaison entrepôt ──────────────────────────────────────────────────────
  const stockAlertCount  = STOCK_ENTREPOT_A.filter(s => s.quantite <= s.seuilAlerte).length;
  const stockPct         = Math.round(
    STOCK_ENTREPOT_A.reduce((sum, s) => sum + Math.min(1, s.quantite / (s.seuilAlerte * 2 || 1)), 0)
    / STOCK_ENTREPOT_A.length * 100,
  );
  const vehiculesEnMission = VEHICULES_ENTREPOT_A.filter(v => v.statut === 'en_mission').length;

  // ── Tournées actives pour polylines ──────────────────────────────────────
  const tourneesActives = TOURNEES_ENTREPOT_A.filter(t => t.statut === 'en_cours');

  // ── Véhicules avec GPS ────────────────────────────────────────────────────
  const vehiculesGps = VEHICULES_ENTREPOT_A.filter(v => v.statut === 'en_mission' && v.localisation);

  // ── Audit logs récents ────────────────────────────────────────────────────
  const recentLogs = MOCK_AUDIT_LOGS.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vue Régionale — Béni Mellal-Khénifra</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {now.toLocaleDateString('fr-MA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {' · '}
            {now.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Actualiser
        </button>
      </div>

      {/* ── 6 KPIs cross-acteurs ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Entrepôts actifs" value={entrepotsActifs}
          color={{ text: 'text-blue-600', bg: 'bg-blue-50' }}
          to="/superadmin/supervision"
          icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><line x1="3" y1="9" x2="21" y2="9"/></svg>}
        />
        <KpiCard
          label="Tournées en cours" value={tourneesEnCours}
          color={{ text: 'text-indigo-600', bg: 'bg-indigo-50' }}
          to="/superadmin/supervision"
          icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12l2 2 4-4"/></svg>}
        />
        <KpiCard
          label="Stock en alerte" value={stockEnAlerte}
          color={{ text: stockEnAlerte > 0 ? 'text-red-600' : 'text-green-600', bg: stockEnAlerte > 0 ? 'bg-red-50' : 'bg-green-50' }}
          to="/admin/stock"
          icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
        />
        <KpiCard
          label="Douars servis" value={`${douarsServis}/${MOCK_DOUBLES.length}`}
          color={{ text: 'text-green-600', bg: 'bg-green-50' }}
          to="/superadmin/supervision"
          icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>}
        />
        <KpiCard
          label="Distributeurs actifs" value={distributeursActifs}
          color={{ text: 'text-amber-600', bg: 'bg-amber-50' }}
          to="/superadmin/supervision"
          icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8l5 2v7h-5V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
        />
        <KpiCard
          label="Population couverte" value={popCouverte.toLocaleString('fr-MA')}
          color={{ text: 'text-purple-600', bg: 'bg-purple-50' }}
          icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
        />
      </div>

      {/* ── Carte unifiée ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Carte de terrain unifiée</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {MOCK_ENTREPOTS.length} entrepôts · {MOCK_DOUBLES.length} douars · {tourneesEnCours} tournée(s) active(s) · {vehiculesGps.length} véhicule(s) GPS
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Link to="/admin/suivi" className="flex items-center gap-1 text-brand-600 hover:underline font-medium">
              Suivi terrain détaillé ↗
            </Link>
            <Link to="/superadmin/supervision" className="flex items-center gap-1 text-brand-600 hover:underline font-medium">
              Supervision ↗
            </Link>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <MapContainer
            key={refresh}
            center={[32.2, -6.0]}
            zoom={7}
            style={{ height: 520, width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {/* ── Marqueurs entrepôts ────────────────────────────────────── */}
            {MOCK_ENTREPOTS.map(e => (
              <Marker key={e.id} position={[e.latitude, e.longitude]} icon={ENTREPOT_ICON}>
                <Popup minWidth={190}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>{e.nom}</p>
                    <p style={{ color: '#6b7280', fontSize: '0.78rem', marginBottom: 6 }}>{e.province}</p>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700,
                      background: e.statut === 'actif' ? '#d1fae5' : '#fee2e2',
                      color:      e.statut === 'actif' ? '#065f46' : '#991b1b',
                    }}>{e.statut.toUpperCase()}</span>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <a href="/admin" style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600 }}>→ Admin entrepôt</a>
                      <a href="/superadmin/supervision" style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 600 }}>→ Supervision</a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* ── Polylines tournées actives ─────────────────────────────── */}
            {tourneesActives.map((tournee, ti) => {
              const color = TOURNEE_COLORS[ti % TOURNEE_COLORS.length];
              const positions: [number, number][] = [
                [ENTREPOT_A.latitude, ENTREPOT_A.longitude],
                ...tournee.etapes.map(e => [e.lat, e.lng] as [number, number]),
              ];
              return (
                <Polyline
                  key={tournee.id}
                  positions={positions}
                  pathOptions={{ color, weight: 2.5, opacity: 0.8, dashArray: '7 9' }}
                />
              );
            })}

            {/* ── Marqueurs douars ───────────────────────────────────────── */}
            {MOCK_DOUBLES.map(d => {
              const icon = d.servi
                ? DOUAR_ICONS.servi
                : d.zoneVulnerable
                  ? DOUAR_ICONS.vulnerable
                  : DOUAR_ICONS.nonServi;
              return (
                <Marker key={d.id} position={[d.latitude, d.longitude]} icon={icon}>
                  <Popup minWidth={160}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 2 }}>{d.nom}</p>
                      <p style={{ color: '#6b7280', fontSize: '0.78rem', marginBottom: 4 }}>{d.commune} · {d.province}</p>
                      <p style={{ fontSize: '0.78rem', color: '#374151', marginBottom: 4 }}>
                        Pop. <strong>{d.population.toLocaleString('fr-MA')}</strong>
                        {d.zoneVulnerable && (
                          <span style={{ marginLeft: 6, color: '#ef4444', fontWeight: 700 }}>⚠ Zone vulnérable</span>
                        )}
                      </p>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700,
                        background: d.servi ? '#d1fae5' : '#fff7ed',
                        color:      d.servi ? '#065f46' : '#c2410c',
                      }}>{d.servi ? 'SERVI' : 'NON SERVI'}</span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* ── Marqueurs véhicules GPS ────────────────────────────────── */}
            {vehiculesGps.map(v => (
              <Marker
                key={v.id}
                position={[v.localisation!.lat, v.localisation!.lng]}
                icon={VEHICLE_ICON}
              >
                <Popup minWidth={150}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 2 }}>🚚 {v.immatriculation}</p>
                    <p style={{ fontSize: '0.78rem', color: '#3b82f6', fontWeight: 600 }}>En mission</p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
                      GPS: {v.localisation!.lat.toFixed(4)}, {v.localisation!.lng.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}

            <MapFit />
          </MapContainer>

          {/* Légende overlay */}
          <MapLegend />
        </div>
      </div>

      {/* ── Panneau bas : liaison entrepôts + journal ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Liaison Entrepôts → Terrain */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Liaison Entrepôts → Terrain</h2>
            <p className="text-xs text-gray-400 mt-0.5">Stock · Tournées · Flotte en temps réel</p>
          </div>
          <div className="p-4 space-y-4">
            {MOCK_ENTREPOTS.map(entrepot => {
              const isA = entrepot.id === 'entrepot-1'; // Entrepôt Azilal = données disponibles
              const alerts  = isA ? stockAlertCount  : 0;
              const running = isA ? tourneesEnCours  : 0;
              const pct     = isA ? stockPct         : 80;
              const vehs    = isA ? vehiculesEnMission : 0;

              return (
                <div key={entrepot.id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{entrepot.nom}</p>
                      <p className="text-xs text-gray-400">{entrepot.province}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${entrepot.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {entrepot.statut.toUpperCase()}
                    </span>
                  </div>

                  {/* Jauge stock */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Niveau stock</span>
                      <div className="flex items-center gap-2">
                        {alerts > 0 && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                            {alerts} en alerte
                          </span>
                        )}
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct < 40 ? 'bg-red-500' : pct < 65 ? 'bg-amber-400' : 'bg-green-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Métriques inline */}
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span><strong className="text-gray-900 dark:text-white">{running}</strong> tournée{running !== 1 ? 's' : ''} en cours</span>
                    <span><strong className="text-gray-900 dark:text-white">{vehs}</strong> véhicule{vehs !== 1 ? 's' : ''} en mission</span>
                  </div>

                  {/* Liens inter-acteurs */}
                  <div className="flex gap-2 pt-1">
                    <Link
                      to="/admin"
                      className="flex-1 text-center py-1.5 text-xs font-semibold text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
                    >
                      Tableau Admin ↗
                    </Link>
                    <Link
                      to="/superadmin/supervision"
                      className="flex-1 text-center py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      Supervision ↗
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Journal d'activité récent */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Journal d'activité récent</h2>
              <p className="text-xs text-gray-400 mt-0.5">Dernières actions sur le système</p>
            </div>
            <Link to="/superadmin/audit" className="text-xs text-brand-600 hover:underline font-medium">
              Voir tout →
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 flex-1">
            {recentLogs.map(log => (
              <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <span className={`mt-0.5 px-1.5 py-0.5 rounded text-xs font-bold font-mono shrink-0 ${OP_BADGE[log.operation] ?? 'bg-gray-100 text-gray-700'}`}>
                  {log.operation}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    <span className="font-mono text-gray-500">{log.tableCible}</span>
                    {log.acteurEmail && (
                      <span className="text-gray-400"> · {log.acteurEmail}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
            <Link
              to="/superadmin/audit"
              className="block text-center text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Accéder à l'audit complet →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
