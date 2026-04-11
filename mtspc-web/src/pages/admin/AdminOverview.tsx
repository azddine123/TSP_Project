/**
 * VUE D'ENSEMBLE — Admin Entrepôt
 * KPIs + alertes stock + tournées en attente
 */
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
// Import FORCÉ des mocks - Entrepôt A uniquement
import { 
  ENTREPOT_A,
  STOCK_ENTREPOT_A,
  VEHICULES_ENTREPOT_A,
  TOURNEES_ENTREPOT_A,
} from '../../mock';
import { getApiErrorMessage } from '../../services/api';

// API MOCK UNIQUEMENT - Entrepôt A pour l'admin
const stockApi = { getMine: () => Promise.resolve([...STOCK_ENTREPOT_A]) };
const vehiculeApi = { getMine: () => Promise.resolve([...VEHICULES_ENTREPOT_A]) };
const tourneeApi = { getMine: () => Promise.resolve([...TOURNEES_ENTREPOT_A]) };
const entrepotApi = { getMine: () => Promise.resolve({...ENTREPOT_A}) };
import type { StockRow, Vehicule, Tournee, Entrepot } from '../../types';
import { formatDateTime } from '../../constants';

function KpiCard({ label, value, sub, color, bg, icon, to }: {
  label: string; value: number | string; sub?: string;
  color: string; bg: string; icon: React.ReactNode; to: string;
}) {
  return (
    <Link to={to} className={`${bg} rounded-2xl p-5 flex items-start gap-4 hover:opacity-90 transition-opacity`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-white/60 ${color}`}>
        {icon}
      </div>
      <div>
        <p className={`text-3xl font-bold leading-none ${color}`}>{value}</p>
        <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </Link>
  );
}

function AlertBanner({ count, entrepot }: { count: number; entrepot: Entrepot | null }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3.5">
      <svg className="w-5 h-5 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <p className="text-sm text-red-700 font-medium">
        <span className="font-bold">{count} article{count > 1 ? 's' : ''}</span> en dessous du seuil d'alerte
        {entrepot && <span className="text-red-500"> — {entrepot.nom}</span>}
      </p>
      <Link to="/admin/stock" className="ml-auto text-xs font-semibold text-red-600 hover:underline shrink-0">
        Gérer →
      </Link>
    </div>
  );
}

export default function AdminOverview() {
  const [entrepot,  setEntrepot]  = useState<Entrepot | null>(null);
  const [stocks,    setStocks]    = useState<StockRow[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [tournees,  setTournees]  = useState<Tournee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [e, s, v, t] = await Promise.all([
        entrepotApi.getMine(),
        stockApi.getMine(),
        vehiculeApi.getMine(),
        tourneeApi.getMine(),
      ]);
      setEntrepot(e as Entrepot); 
      setStocks(s as StockRow[]); 
      setVehicules(v as unknown as Vehicule[]); 
      setTournees(t as unknown as Tournee[]);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const alertes        = stocks.filter((s) => s.quantite <= s.seuilAlerte).length;
  const enMission      = vehicules.filter((v) => v.statut === 'en_mission').length;
  const enAttente      = tournees.filter((t) => t.statut === 'planifiee').length;
  const enCours        = tournees.filter((t) => t.statut === 'en_cours').length;
  const recentMouvs    = stocks.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {entrepot ? entrepot.nom : 'Mon Entrepôt'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {entrepot
              ? `${entrepot.province} · ${entrepot.wilaya} — Tableau de bord opérationnel`
              : 'Chargement…'}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Actualiser
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          {error}<button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Bannière alertes */}
      <AlertBanner count={alertes} entrepot={entrepot} />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              to="/admin/stock" label="Articles en stock" value={stocks.length}
              sub={`${alertes > 0 ? alertes + ' alerte(s)' : 'Aucune alerte'}`}
              color="text-blue-600" bg="bg-blue-50"
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
            />
            <KpiCard
              to="/admin/vehicules" label="Véhicules actifs" value={enMission}
              sub={`${vehicules.length} au total`}
              color="text-orange-600" bg="bg-orange-50"
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8l5 2v7h-5V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
            />
            <KpiCard
              to="/admin/tournees" label="Missions en attente" value={enAttente}
              sub={`${enCours} en cours`}
              color="text-purple-600" bg="bg-purple-50"
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>}
            />
            <KpiCard
              to="/admin/suivi" label="Dist. en terrain" value={enMission}
              sub="GPS temps réel"
              color="text-green-600" bg="bg-green-50"
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>}
            />
          </div>

          {/* Dernières tournées */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Tournées récentes</h2>
                <Link to="/admin/tournees" className="text-xs text-brand-500 hover:underline">Voir tout →</Link>
              </div>
              {tournees.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">Aucune tournée assignée</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {tournees.slice(0, 5).map((t) => (
                    <div key={t.id} className="px-5 py-3 flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        t.statut === 'planifiee' ? 'bg-yellow-400' :
                        t.statut === 'en_cours'  ? 'bg-blue-500' :
                        t.statut === 'terminee'  ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {t.etapes.length} douar(s) · {t.distanceTotale} km
                        </p>
                        <p className="text-xs text-gray-400">{t.distributeur ? `${t.distributeur.nom} ${t.distributeur.prenom}` : 'Non assigné'}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        t.statut === 'planifiee' ? 'bg-yellow-100 text-yellow-700' :
                        t.statut === 'en_cours'  ? 'bg-blue-100 text-blue-700' :
                        t.statut === 'terminee'  ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {t.statut}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stock critique */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Stock critique
                  {alertes > 0 && <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full font-bold">{alertes}</span>}
                </h2>
                <Link to="/admin/stock" className="text-xs text-brand-500 hover:underline">Gérer →</Link>
              </div>
              {recentMouvs.filter((s) => s.quantite <= s.seuilAlerte).length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">Tous les stocks sont au-dessus des seuils</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {stocks.filter((s) => s.quantite <= s.seuilAlerte).slice(0, 5).map((s) => (
                    <div key={s.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{s.materiel.nom}</p>
                        <p className="text-xs text-gray-400">Seuil : {s.seuilAlerte} {s.materiel.unite}</p>
                      </div>
                      <span className="text-sm font-bold text-red-600">{s.quantite} <span className="text-xs font-normal text-gray-400">{s.materiel.unite}</span></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
