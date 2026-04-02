/**
 * PAGE DISPATCH — Affecter les distributeurs aux tournées
 */
import { useState, useEffect, useCallback } from 'react';
import { criseApi, tourneeApi, distributeurApi, getApiErrorMessage } from '../../services/api';
import type { Crise, Tournee, Distributeur } from '../../types';

const STATUT_BADGE: Record<string, string> = {
  planifiee: 'bg-gray-100 text-gray-600',
  en_cours:  'bg-blue-100 text-blue-700',
  terminee:  'bg-green-100 text-green-700',
  annulee:   'bg-red-100 text-red-500',
};

export default function DispatchPage() {
  const [crises,        setCrises]        = useState<Crise[]>([]);
  const [criseId,       setCriseId]       = useState('');
  const [tournees,      setTournees]      = useState<Tournee[]>([]);
  const [distributeurs, setDistributeurs] = useState<Distributeur[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [assigning,     setAssigning]     = useState<string | null>(null);

  useEffect(() => {
    Promise.all([criseApi.getAll(), distributeurApi.getAll()])
      .then(([c, d]) => {
        const active = c.filter((x) => x.statut === 'active');
        setCrises(active);
        setDistributeurs(d);
        if (active.length > 0) setCriseId(active[0].id);
      })
      .catch((e) => setError(getApiErrorMessage(e)));
  }, []);

  const loadTournees = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const t = await tourneeApi.getByCrise(id);
      setTournees(t);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (criseId) loadTournees(criseId); }, [criseId, loadTournees]);

  async function handleAssign(tourneeId: string, distributeurId: string) {
    setAssigning(tourneeId); setError(null);
    try {
      const updated = await tourneeApi.assigner(tourneeId, { distributeurId });
      setTournees((prev) => prev.map((t) => t.id === tourneeId ? updated : t));
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setAssigning(null);
    }
  }

  async function handleDemarrer(tourneeId: string) {
    setAssigning(tourneeId);
    try {
      const updated = await tourneeApi.assigner(tourneeId, { distributeurId: tournees.find(t => t.id === tourneeId)?.distributeur?.id ?? '' });
      setTournees((prev) => prev.map((t) => t.id === tourneeId ? updated : t));
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setAssigning(null);
    }
  }

  const planifiees = tournees.filter((t) => t.statut === 'planifiee');
  const enCours    = tournees.filter((t) => t.statut === 'en_cours');
  const terminees  = tournees.filter((t) => t.statut === 'terminee');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dispatch des Tournées</h1>
          <p className="text-sm text-gray-500 mt-0.5">Affectez les distributeurs aux tournées planifiées par le VRP</p>
        </div>
        <select value={criseId} onChange={(e) => setCriseId(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none">
          <option value="">Sélectionner une crise</option>
          {crises.map((c) => <option key={c.id} value={c.id}>{c.reference} · {c.zone}</option>)}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}<button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Stats résumé */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'À dispatcher', count: planifiees.length, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'En cours',     count: enCours.length,    color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Terminées',    count: terminees.length,  color: 'text-green-600',  bg: 'bg-green-50' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-5 flex items-center gap-3`}>
            <p className={`text-3xl font-bold ${color}`}>{count}</p>
            <p className="text-sm text-gray-600">{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 text-xs font-semibold uppercase tracking-wider text-left">
                  <th className="px-4 py-3">Entrepôt</th>
                  <th className="px-4 py-3">Étapes</th>
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3">Durée</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Distributeur</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {tournees.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {criseId ? 'Aucune tournée pour cette crise. Lancez d\'abord le Pipeline.' : 'Sélectionnez une crise.'}
                  </td></tr>
                ) : tournees.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t.entrepot.nom}</td>
                    <td className="px-4 py-3 text-gray-500">{t.etapes.length} douar(s)</td>
                    <td className="px-4 py-3 text-gray-500">{t.distanceTotale} km</td>
                    <td className="px-4 py-3 text-gray-500">{t.tempsEstime} min</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUT_BADGE[t.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                        {t.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.statut === 'planifiee' ? (
                        <select
                          value={t.distributeur?.id ?? ''}
                          onChange={(e) => handleAssign(t.id, e.target.value)}
                          disabled={assigning === t.id}
                          className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none disabled:opacity-50">
                          <option value="">-- Choisir --</option>
                          {distributeurs.map((d) => (
                            <option key={d.id} value={d.id}>{d.nom} {d.prenom}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {t.distributeur ? `${t.distributeur.nom} ${t.distributeur.prenom}` : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {assigning === t.id ? (
                        <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                      ) : t.statut === 'planifiee' && t.distributeur ? (
                        <button onClick={() => handleDemarrer(t.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors">
                          Démarrer
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Détail étapes par tournée */}
          {tournees.some((t) => t.etapes.length > 0) && (
            <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Séquences de livraison</p>
              <div className="space-y-3">
                {tournees.filter(t => t.etapes.length > 0).map((t) => (
                  <div key={t.id} className="flex items-start gap-3">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-28 shrink-0 pt-0.5">{t.entrepot.nom}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {t.etapes
                        .sort((a, b) => a.ordre - b.ordre)
                        .map((e) => (
                        <span key={e.id} className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full
                          ${e.statut === 'livree' ? 'bg-green-100 text-green-700' :
                            e.statut === 'echec'  ? 'bg-red-100 text-red-600' :
                            e.statut === 'en_route' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'}`}>
                          <span className="font-bold">{e.ordre}.</span>{e.douar.nom}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
