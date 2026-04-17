/**
 * DASHBOARD ADMIN ENTREPÔT — Tailwind CSS
 */
import { useEffect, useState, useCallback } from 'react';
// Import FORCÉ des mocks - toujours utilisés même avec auth
import { MOCK_STOCK, MOCK_ADMIN_MISSIONS } from '../../mock';

// API MOCK UNIQUEMENT - ignore l'API réelle
const stockApi = {
  getAll: () => Promise.resolve([...MOCK_STOCK])
};

const missionApi = {
  getAll: () => Promise.resolve([...MOCK_ADMIN_MISSIONS])
};
import type { StockRow, Mission } from '../../types';
import {
  MISSION_STATUT_LABEL, MISSION_PRIORITE_LABEL,
  formatDateTime, formatDate,
} from '../../constants';
import CreateMissionModal from './CreateMissionModal';

// ── Helpers badges Tailwind ───────────────────────────────────────────────────

type BadgeVariant = 'gray' | 'blue' | 'yellow' | 'green' | 'red';

const STATUT_BADGE: Record<string, BadgeVariant> = {
  draft:       'gray',
  pending:     'yellow',
  in_progress: 'blue',
  completed:   'green',
  annulee:     'red',
};
const PRIORITE_BADGE: Record<string, BadgeVariant> = {
  low:      'gray',
  medium:   'yellow',
  high:     'red',
  critique: 'red',
};
const CATEGORIE_BADGE: Record<string, BadgeVariant> = {
  TENTE:      'blue',
  EAU:        'green',
  MEDICAMENT: 'red',
  NOURRITURE: 'yellow',
};
const BADGE_CLASS: Record<BadgeVariant, string> = {
  gray:   'bg-gray-100 text-gray-700',
  blue:   'bg-blue-100 text-blue-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  green:  'bg-green-100 text-green-700',
  red:    'bg-red-100 text-red-700',
};

function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_CLASS[variant]}`}>
      {label}
    </span>
  );
}

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

function Pagination({ total, page, pageSize, onChange }: { total: number; page: number; pageSize: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500">
      <span>{total} élément(s)</span>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(page - 1)} disabled={page === 0}
          className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >Préc.</button>
        <span className="px-3 py-1 text-gray-700 dark:text-gray-300 font-medium">{page + 1} / {pages}</span>
        <button
          onClick={() => onChange(page + 1)} disabled={page >= pages - 1}
          className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >Suiv.</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export default function AdminDashboard() {
  const [tab,       setTab]       = useState(0);
  const [stocks,    setStocks]    = useState<StockRow[]>([]);
  const [missions,  setMissions]  = useState<Mission[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [stockPage, setStockPage] = useState(0);
  const [missPage,  setMissPage]  = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [s, m] = await Promise.all([stockApi.getAll(), missionApi.getAll()]);
      setStocks(s); setMissions(m);
    } catch {
      setError('Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const alertCount      = stocks.filter((s) => s.quantite <= s.seuilAlerte).length;
  const missionsActives = missions.filter((m) => m.statut === 'in_progress' || m.statut === 'pending').length;

  const pagedStocks   = stocks.slice(stockPage * PAGE_SIZE, (stockPage + 1) * PAGE_SIZE);
  const pagedMissions = missions.slice(missPage  * PAGE_SIZE, (missPage  + 1) * PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tableau de bord — Admin Entrepôt</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gestion du stock et des missions de livraison</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData} disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Actualiser
          </button>
          <button
            onClick={() => setOpenModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nouvelle Mission
          </button>
        </div>
      </div>

      {/* Alerte erreur */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
          <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Articles en stock"  value={stocks.length}    colorClass="text-blue-600"  bgClass="bg-blue-50"   icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>} />
        <StatCard label="Alertes de stock"   value={alertCount}       colorClass={alertCount > 0 ? 'text-red-600' : 'text-gray-500'} bgClass={alertCount > 0 ? 'bg-red-50' : 'bg-gray-100'} icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} />
        <StatCard label="Missions actives"   value={missionsActives}  colorClass="text-green-600" bgClass="bg-green-50"  icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8l5 2v7h-5V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>} />
      </div>

      {/* Panneau onglets */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">

        {/* Onglets */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-4">
          {[
            { label: 'Inventaire du Stock', badge: alertCount > 0 ? alertCount : null, badgeColor: 'bg-red-500' },
            { label: 'Missions', badge: missions.length, badgeColor: 'bg-brand-500' },
          ].map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                tab === i
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
              {t.badge !== null && (
                <span className={`${t.badgeColor} text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Table Stock ── */}
            {tab === 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/60 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-3">Matériel</th>
                        <th className="px-4 py-3">Catégorie</th>
                        <th className="px-4 py-3 text-right">Quantité</th>
                        <th className="px-4 py-3">Unité</th>
                        <th className="px-4 py-3 text-right">Seuil alerte</th>
                        <th className="px-4 py-3">Province</th>
                        <th className="px-4 py-3">Dernière MAJ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {pagedStocks.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Aucun article en stock</td></tr>
                      ) : pagedStocks.map((row) => {
                        const alerte = row.quantite <= row.seuilAlerte;
                        return (
                          <tr key={row.id} className={alerte ? 'bg-red-50/50 dark:bg-red-950/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}>
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.materiel.nom}</td>
                            <td className="px-4 py-3">
                              <Badge label={row.materiel.categorie} variant={CATEGORIE_BADGE[row.materiel.categorie] ?? 'gray'} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-bold ${alerte ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                                {row.quantite}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500">{row.materiel.unite}</td>
                            <td className="px-4 py-3 text-right text-gray-500">{row.seuilAlerte}</td>
                            <td className="px-4 py-3 text-gray-500">{row.entrepot.province}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(row.updatedAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination total={stocks.length} page={stockPage} pageSize={PAGE_SIZE} onChange={setStockPage} />
              </>
            )}

            {/* ── Table Missions ── */}
            {tab === 1 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/60 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-3">N° Mission</th>
                        <th className="px-4 py-3">Destination</th>
                        <th className="px-4 py-3">Statut</th>
                        <th className="px-4 py-3">Priorité</th>
                        <th className="px-4 py-3">Distributeur</th>
                        <th className="px-4 py-3">Échéance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {pagedMissions.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Aucune mission assignée</td></tr>
                      ) : pagedMissions.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">{m.numeroMission}</td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{m.destinationNom}</td>
                          <td className="px-4 py-3">
                            <Badge label={MISSION_STATUT_LABEL[m.statut] ?? m.statut} variant={STATUT_BADGE[m.statut] ?? 'gray'} />
                          </td>
                          <td className="px-4 py-3">
                            <Badge label={MISSION_PRIORITE_LABEL[m.priorite] ?? m.priorite} variant={PRIORITE_BADGE[m.priorite] ?? 'gray'} />
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {m.distributeur ? `${m.distributeur.prenom} ${m.distributeur.nom}` : '— Non assigné'}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(m.dateEcheance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination total={missions.length} page={missPage} pageSize={PAGE_SIZE} onChange={setMissPage} />
              </>
            )}
          </>
        )}
      </div>

      <CreateMissionModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreated={() => { setOpenModal(false); loadData(); }}
      />
    </div>
  );
}
