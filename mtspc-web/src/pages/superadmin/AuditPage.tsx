/**
 * PAGE AUDIT GLOBAL — Historique inaltérable de toutes les actions
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { conditionalAuditApi as auditApi, getApiErrorMessage } from '../../services/api';
import type { AuditLog } from '../../types';
import { formatDateTime } from '../../constants';

const PAGE_SIZE    = 50;
const POLL_INTERVAL = 15_000; // 15 secondes

const OPERATION_BADGE: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-700',
};

const OPERATIONS = [
  { value: '',       label: 'Toutes les opérations' },
  { value: 'INSERT', label: 'INSERT' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
];

const TABLES = [
  { value: '',                   label: 'Toutes les tables' },
  { value: 'missions_livraison', label: 'Missions' },
  { value: 'stocks',             label: 'Stocks' },
  { value: 'distributeurs',      label: 'Distributeurs' },
  { value: 'crises',             label: 'Crises' },
  { value: 'tournees',           label: 'Tournées' },
  { value: 'evenements',         label: 'Événements' },
];

function Pagination({ total, page, onChange }: { total: number; page: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500">
      <span>{total.toLocaleString('fr-FR')} entrée(s)</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 0}
          className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          ←
        </button>
        <span className="px-3 py-1 font-medium text-gray-700 dark:text-gray-300">{page + 1} / {pages}</span>
        <button onClick={() => onChange(page + 1)} disabled={page >= pages - 1}
          className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          →
        </button>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const [auditLogs,       setAuditLogs]       = useState<AuditLog[]>([]);
  const [total,           setTotal]           = useState(0);
  const [page,            setPage]            = useState(0);
  const [operationFilter, setOperationFilter] = useState('');
  const [tableFilter,     setTableFilter]     = useState('');
  const [search,          setSearch]          = useState('');
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [polling,         setPolling]         = useState(true);
  const [lastUpdate,      setLastUpdate]      = useState<Date | null>(null);
  const [secsAgo,         setSecsAgo]         = useState(0);
  const [highlighted,     setHighlighted]     = useState<Set<number>>(new Set());
  const lastSeenIds = useRef<Set<number>>(new Set());

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const logs = await auditApi.getLogs({
        page:      page + 1,
        limit:     PAGE_SIZE,
        operation: operationFilter || undefined,
      });
      setAuditLogs(logs.data);
      setTotal(logs.meta.total);
      setLastUpdate(new Date());
      setSecsAgo(0);

      // Détecter les nouvelles entrées
      const newIds = logs.data
        .map((l: AuditLog) => l.id)
        .filter((id: number) => !lastSeenIds.current.has(id));
      if (newIds.length > 0 && lastSeenIds.current.size > 0) {
        setHighlighted(new Set(newIds));
        setTimeout(() => setHighlighted(new Set()), 3000);
      }
      lastSeenIds.current = new Set(logs.data.map((l: AuditLog) => l.id));
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, operationFilter]);

  useEffect(() => { load(); }, [load]);

  // Polling automatique toutes les 15s
  useEffect(() => {
    if (!polling) return;
    const id = setInterval(() => load(true), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [polling, load]);

  // Compteur "mis à jour il y a N s"
  useEffect(() => {
    if (!lastUpdate) return;
    const id = setInterval(() => {
      setSecsAgo(Math.floor((Date.now() - lastUpdate.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [lastUpdate]);

  // Filtre table + recherche acteur côté client (sur la page courante)
  const filtered = auditLogs.filter((log) => {
    const matchTable  = !tableFilter || log.tableCible === tableFilter;
    const matchSearch = !search || (
      (log.acteurEmail ?? '').toLowerCase().includes(search.toLowerCase()) ||
      log.acteurUserId.toLowerCase().includes(search.toLowerCase()) ||
      log.tableCible.toLowerCase().includes(search.toLowerCase())
    );
    return matchTable && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Global</h1>
          <p className="text-sm text-gray-500 mt-0.5">Journal inaltérable de toutes les actions sur le système</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">LECTURE SEULE</span>

          {/* Badge Live */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${polling ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {polling && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
            {polling ? 'Live' : 'Pause'}
          </div>

          {/* Mis à jour il y a N s */}
          {lastUpdate && (
            <span className="text-xs text-gray-400">
              {secsAgo < 5 ? 'À l\'instant' : `Il y a ${secsAgo}s`}
            </span>
          )}

          {/* Bouton Pause/Reprendre */}
          <button
            onClick={() => setPolling(p => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {polling
              ? <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>Pause</>
              : <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>Reprendre</>
            }
          </button>

          <button onClick={() => load()} disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}<button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm p-4">
        <div className="flex flex-wrap gap-3">
          {/* Recherche acteur */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un acteur, email, table…"
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none"
            />
          </div>

          {/* Filtre opération */}
          <select
            value={operationFilter}
            onChange={(e) => { setPage(0); setOperationFilter(e.target.value); }}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:border-brand-400 outline-none"
          >
            {OPERATIONS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
          </select>

          {/* Filtre table */}
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:border-brand-400 outline-none"
          >
            {TABLES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Entrées d'audit</h2>
          <span className="text-xs text-gray-400">{total.toLocaleString('fr-FR')} au total · {filtered.length} sur cette page</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-14"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 text-left text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="px-4 py-3">Date & Heure</th>
                    <th className="px-4 py-3">Opération</th>
                    <th className="px-4 py-3">Table</th>
                    <th className="px-4 py-3">Acteur</th>
                    <th className="px-4 py-3">Rôle</th>
                    <th className="px-4 py-3">IP</th>
                    <th className="px-4 py-3">Données</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                      Aucune entrée correspondant aux filtres
                    </td></tr>
                  ) : filtered.map((log) => {
                    const jsonStr  = log.valeursApres ? JSON.stringify(log.valeursApres).slice(0, 100) : null;
                    const jsonFull = log.valeursApres ? JSON.stringify(log.valeursApres, null, 2) : null;
                    return (
                      <tr key={log.id}
                        className={
                          highlighted.has(log.id)
                            ? 'bg-blue-50 dark:bg-blue-950/20 transition-colors'
                            : log.operation === 'DELETE'
                              ? 'bg-red-50/50 dark:bg-red-950/10'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                        }>
                        <td className="px-4 py-3 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold font-mono ${OPERATION_BADGE[log.operation] ?? 'bg-gray-100 text-gray-700'}`}>
                            {log.operation}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-500 dark:text-gray-400">{log.tableCible}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-white">{log.acteurEmail ?? log.acteurUserId.slice(0, 8) + '…'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full font-mono text-xs">
                            {log.acteurRole}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-400">{log.ipAddress ?? '—'}</td>
                        <td className="px-4 py-3 max-w-[200px]">
                          {jsonStr ? (
                            <span
                              title={jsonFull ?? ''}
                              className="font-mono text-gray-400 truncate block cursor-help"
                              style={{ maxWidth: 200 }}>
                              {jsonStr}{jsonStr.length >= 100 ? '…' : ''}
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
  );
}
