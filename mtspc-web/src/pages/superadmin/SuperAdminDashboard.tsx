/**
 * VUE GLOBALE SUPER-ADMIN — Carte Leaflet + Audit Logs
 */
import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Import FORCÉ des mocks - toujours utilisés même avec auth
import { MOCK_ENTREPOTS, MOCK_AUDIT_LOGS } from '../../mock';

// API MOCK UNIQUEMENT
const entrepotApi = {
  getAll: () => Promise.resolve([...MOCK_ENTREPOTS])
};

const auditApi = {
  getLogs: (params?: { page?: number; limit?: number; operation?: string }) => {
    let logs = [...MOCK_AUDIT_LOGS];
    if (params?.operation) {
      logs = logs.filter(l => l.operation === params.operation);
    }
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    const start = (page - 1) * limit;
    const end = start + limit;
    return Promise.resolve({
      data: logs.slice(start, end),
      meta: { total: logs.length },
    });
  }
};
import type { AuditLog, Entrepot } from '../../types';
import {
  ENTREPOT_STATUT_COLOR, formatDateTime,
} from '../../constants';

// ── Leaflet fix ───────────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createColoredIcon = (color: string) => new L.Icon({
  iconUrl:     `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl:   'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:    [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const ICONS: Record<string, L.Icon> = {
  actif:     createColoredIcon('green'),
  surcharge: createColoredIcon('red'),
  inactif:   createColoredIcon('grey'),
};

// ── Helpers badges Tailwind ───────────────────────────────────────────────────

const OPERATION_BADGE: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-700',
};

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, colorClass, bgClass }: {
  label: string; value: number; icon: React.ReactNode; colorClass: string; bgClass: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-theme-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bgClass} ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className={`text-2xl font-bold leading-none ${colorClass}`}>{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Pagination simple ─────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

function Pagination({ total, page, onChange }: { total: number; page: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500">
      <span>{total} entrée(s)</span>
      <div className="flex gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 0}
          className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Préc.</button>
        <span className="px-3 py-1 font-medium text-gray-700 dark:text-gray-300">{page + 1} / {pages}</span>
        <button onClick={() => onChange(page + 1)} disabled={page >= pages - 1}
          className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Suiv.</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const CENTER: [number, number] = [32.2, -6.0];
const OPERATIONS = [
  { value: '', label: 'Toutes les opérations' },
  { value: 'INSERT', label: 'INSERT' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
];

export default function SuperAdminOverview() {
  const [entrepots,       setEntrepots]       = useState<Entrepot[]>([]);
  const [auditLogs,       setAuditLogs]       = useState<AuditLog[]>([]);
  const [total,           setTotal]           = useState(0);
  const [page,            setPage]            = useState(0);
  const [operationFilter, setOperationFilter] = useState('');
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [e, logs] = await Promise.all([
        entrepotApi.getAll(),
        auditApi.getLogs({ page: page + 1, limit: PAGE_SIZE, operation: operationFilter || undefined }),
      ]);
      setEntrepots(e); setAuditLogs(logs.data); setTotal(logs.meta.total);
    } catch {
      setError('Impossible de charger les données. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [page, operationFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const actifs    = entrepots.filter((e) => e.statut === 'actif').length;
  const surcharge = entrepots.filter((e) => e.statut === 'surcharge').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tableau de bord — Super-Admin</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Vue régionale Béni Mellal-Khénifra · Audit inaltérable des actions</p>
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
          <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400">✕</button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Entrepôts dans la région" value={entrepots.length} colorClass="text-blue-600"  bgClass="bg-blue-50"
          icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><line x1="3" y1="9" x2="21" y2="9"/></svg>} />
        <StatCard label="Entrepôts actifs" value={actifs} colorClass="text-green-600" bgClass="bg-green-50"
          icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>} />
        <StatCard label="En surcharge" value={surcharge} colorClass={surcharge > 0 ? 'text-red-600' : 'text-gray-500'} bgClass={surcharge > 0 ? 'bg-red-50' : 'bg-gray-100'}
          icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} />
      </div>

      {/* Main panels */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Carte Leaflet ── */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Carte des Entrepôts Régionaux</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{entrepots.length} entrepôt(s) dans la région</p>
          </div>

          {/* Carte Leaflet — code Leaflet inchangé */}
          <MapContainer center={CENTER} zoom={8} style={{ height: '390px', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {entrepots.map((e) => (
              <React.Fragment key={e.id}>
                <Circle
                  center={[e.latitude, e.longitude]} radius={15000}
                  pathOptions={{ color: e.statut === 'surcharge' ? '#E05C5C' : '#4A90D9', fillOpacity: 0.07, weight: 1 }}
                />
                <Marker position={[e.latitude, e.longitude]} icon={ICONS[e.statut] ?? ICONS.actif}>
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 2 }}>{e.nom}</p>
                      <p style={{ color: '#666', fontSize: '0.82rem', margin: '4px 0 6px' }}>{e.province} · {e.wilaya}</p>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 6,
                        fontSize: '0.72rem', fontWeight: 700,
                        background: e.statut === 'actif' ? '#e8f5e9' : e.statut === 'surcharge' ? '#ffebee' : '#f5f5f5',
                        color:      e.statut === 'actif' ? '#2e7d32' : e.statut === 'surcharge' ? '#c62828' : '#757575',
                      }}>
                        {e.statut.toUpperCase()}
                      </span>
                      <p style={{ margin: '8px 0 2px', fontSize: '0.75rem', fontFamily: 'monospace', color: '#555' }}>
                        GPS : {e.latitude.toFixed(4)}, {e.longitude.toFixed(4)}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>Code : {e.code}</p>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            ))}
          </MapContainer>

          {/* Légende */}
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex gap-5">
            {[{ statut: 'actif', label: 'Actif' }, { statut: 'surcharge', label: 'En surcharge' }, { statut: 'inactif', label: 'Inactif' }].map(({ statut, label }) => (
              <div key={statut} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ENTREPOT_STATUT_COLOR[statut] }} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Audit Logs ── */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Historique Inaltérable des Actions</h2>
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">LECTURE SEULE</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{total} entrée(s)</p>
            </div>
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round" />
              </svg>
              <select
                value={operationFilter}
                onChange={(e) => { setPage(0); setOperationFilter(e.target.value); }}
                className="pl-7 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-brand-400"
              >
                {OPERATIONS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-14">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/60 text-left text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                      <th className="px-3 py-3">Date & Heure</th>
                      <th className="px-3 py-3">Opération</th>
                      <th className="px-3 py-3">Table</th>
                      <th className="px-3 py-3">Acteur</th>
                      <th className="px-3 py-3">IP</th>
                      <th className="px-3 py-3">Données modifiées</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {auditLogs.length === 0 ? (
                      <tr><td colSpan={6} className="px-3 py-10 text-center text-gray-400">
                        {operationFilter ? `Aucune opération "${operationFilter}"` : 'Aucune action enregistrée'}
                      </td></tr>
                    ) : auditLogs.map((log) => {
                      const jsonStr = log.valeursApres ? JSON.stringify(log.valeursApres).slice(0, 80) : null;
                      const jsonFull = log.valeursApres ? JSON.stringify(log.valeursApres, null, 2) : null;
                      const isDelete = log.operation === 'DELETE';
                      return (
                        <tr key={log.id} className={isDelete ? 'bg-red-50/50 dark:bg-red-950/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}>
                          <td className="px-3 py-3 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold font-mono ${OPERATION_BADGE[log.operation] ?? 'bg-gray-100 text-gray-700'}`}>
                              {log.operation}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-mono text-gray-500">{log.tableCible}</td>
                          <td className="px-3 py-3">
                            <p className="font-medium text-gray-900 dark:text-white">{log.acteurEmail || log.acteurUserId.slice(0, 8) + '…'}</p>
                            <span className="text-gray-400">{log.acteurRole}</span>
                          </td>
                          <td className="px-3 py-3 font-mono text-gray-400">{log.ipAddress || '—'}</td>
                          <td className="px-3 py-3 max-w-[180px]">
                            {jsonStr ? (
                              <span title={jsonFull ?? ''} className="font-mono text-gray-400 truncate block cursor-help" style={{ maxWidth: 180 }}>
                                {jsonStr}{jsonStr.length >= 80 ? '…' : ''}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination total={total} page={page} onChange={(p) => setPage(p)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
