/**
 * PAGE DISPATCH — Super Admin
 * ============================
 * Affectation rapide des distributeurs aux tournées non assignées.
 * Colonnes : tournées planifiées (gauche) · distributeurs disponibles (droite)
 */
import { useState, useEffect, useCallback } from 'react';
import {
  conditionalCriseApi as criseApi,
  conditionalTourneeApi as tourneeApi,
  conditionalDistributeurApi as distributeurApi,
  getApiErrorMessage,
} from '../../services/api';
import type { Crise, Tournee, Distributeur } from '../../types';

// Résumé des ressources d'une tournée
function ressTotal(t: Tournee) {
  if (t.ressourcesTotales) return t.ressourcesTotales;
  return t.etapes.reduce(
    (acc, e) => {
      const r = e.ressources ?? { tentes: 0, couvertures: 0, vivres: 0, kits_med: 0, eau_litres: 0 };
      return {
        tentes:      acc.tentes      + r.tentes,
        couvertures: acc.couvertures + r.couvertures,
        vivres:      acc.vivres      + r.vivres,
        kits_med:    acc.kits_med    + r.kits_med,
        eau_litres:  acc.eau_litres  + r.eau_litres,
      };
    },
    { tentes: 0, couvertures: 0, vivres: 0, kits_med: 0, eau_litres: 0 }
  );
}

// Badge statut distributeur
function StatutDot({ statut }: { statut: string }) {
  const cls = statut === 'disponible'
    ? 'bg-green-400'
    : statut === 'en_mission'
    ? 'bg-blue-400'
    : 'bg-gray-300';
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />;
}

export default function DispatchPage() {
  const [crises,        setCrises]        = useState<Crise[]>([]);
  const [criseId,       setCriseId]       = useState('');
  const [tournees,      setTournees]      = useState<Tournee[]>([]);
  const [distributeurs, setDistributeurs] = useState<(Distributeur & { statut?: string; missionsCompletes?: number })[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  // Distributeur sélectionné pour une tournée
  const [selectMap,  setSelectMap]  = useState<Record<string, string>>({});
  const [assigning,  setAssigning]  = useState<string | null>(null);
  // Suivi des distributeurs déjà affectés localement (masqués de la liste)
  const [localAssigned, setLocalAssigned] = useState<Set<string>>(new Set());

  const loadCrises = useCallback(async () => {
    try {
      const c = await criseApi.getAll();
      const active = c.filter(x => x.statut !== 'cloturee');
      setCrises(active);
      if (active.length > 0) setCriseId(active[0].id);
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }, []);

  const loadData = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const [t, d] = await Promise.all([
        tourneeApi.getByCrise(id),
        distributeurApi.getAll(),
      ]);
      // Uniquement les tournées planifiées sans distributeur OU avec distributeur mais non démarrées
      const nonAssignees = t.filter((x: Tournee) => x.statut === 'planifiee' && !x.distributeur);
      setTournees(nonAssignees);
      setDistributeurs(d as typeof distributeurs);
      setSelectMap({});
      setLocalAssigned(new Set());
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCrises(); }, [loadCrises]);
  useEffect(() => { if (criseId) loadData(criseId); }, [criseId, loadData]);

  async function handleAffecter(tourneeId: string) {
    const distId = selectMap[tourneeId];
    if (!distId) return;
    setAssigning(tourneeId); setError(null);
    try {
      await tourneeApi.assigner(tourneeId, { distributeurId: distId });
      // Retirer la tournée de la liste locale
      setTournees(prev => prev.filter(t => t.id !== tourneeId));
      // Marquer le distributeur comme utilisé localement
      setLocalAssigned(prev => new Set([...prev, distId]));
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setAssigning(null);
    }
  }

  // Distributeurs disponibles non encore affectés localement
  const dispos = distributeurs.filter(d =>
    (d as any).statut === 'disponible' && !localAssigned.has(d.id)
  );
  const enMission = distributeurs.filter(d => (d as any).statut === 'en_mission');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dispatch Rapide</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Affectez les distributeurs disponibles aux tournées planifiées
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={criseId}
            onChange={e => setCriseId(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none"
          >
            <option value="">Sélectionner une crise</option>
            {crises.map(c => (
              <option key={c.id} value={c.id}>{c.reference} · {c.zone}</option>
            ))}
          </select>
          <button
            onClick={() => criseId && loadData(criseId)}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-brand-500 transition-colors"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}<button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-2xl p-4">
          <p className="text-3xl font-bold text-yellow-600">{tournees.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Tournées à affecter</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl p-4">
          <p className="text-3xl font-bold text-green-600">{dispos.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Distributeurs disponibles</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4">
          <p className="text-3xl font-bold text-blue-600">{enMission.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">En mission</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Tournées à affecter ── */}
          <div className="lg:col-span-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              Tournées non assignées
              <span className="ml-1 text-xs font-normal text-gray-400">({tournees.length})</span>
            </h2>
            {tournees.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center">
                <svg className="w-10 h-10 mx-auto text-gray-200 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <p className="text-gray-400 text-sm">Toutes les tournées sont affectées</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tournees.map(t => {
                  const res = ressTotal(t);
                  const busy = assigning === t.id;
                  const selectedDist = distributeurs.find(d => d.id === selectMap[t.id]);
                  return (
                    <div
                      key={t.id}
                      className="bg-white dark:bg-gray-900 rounded-2xl border border-yellow-200 dark:border-yellow-900/40 shadow-theme-sm p-4"
                    >
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                            MS-{t.entrepot.province.slice(0, 1).toUpperCase()}-{new Date(t.createdAt).getFullYear()}-{t.id.slice(-3).toUpperCase()}
                          </p>
                          <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-0.5">
                            <span>{t.etapes.length} douar{t.etapes.length !== 1 ? 's' : ''}</span>
                            <span>·</span>
                            <span>{t.distanceTotale.toFixed(1)} km</span>
                            <span>·</span>
                            <span>~{t.tempsEstime} min</span>
                            <span>·</span>
                            <span>{t.entrepot.nom.replace('Entrepôt Régional ', '')}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 shrink-0">
                          Non assignée
                        </span>
                      </div>

                      {/* Ressources */}
                      <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
                        {res.tentes > 0      && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">{res.tentes} tentes</span>}
                        {res.couvertures > 0 && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{res.couvertures} couv.</span>}
                        {res.vivres > 0      && <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full">{res.vivres} kits vivres</span>}
                        {res.kits_med > 0    && <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full">{res.kits_med} kits méd.</span>}
                        {res.eau_litres > 0  && <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-full">{(res.eau_litres / 1000).toFixed(1)} kL eau</span>}
                      </div>

                      {/* Select + bouton Affecter */}
                      <div className="flex gap-2">
                        <select
                          value={selectMap[t.id] ?? ''}
                          onChange={e => setSelectMap(prev => ({ ...prev, [t.id]: e.target.value }))}
                          className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand-300 outline-none"
                        >
                          <option value="">— Choisir un distributeur —</option>
                          {dispos.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.prenom} {d.nom}{(d as any).missionsCompletes != null ? ` (${(d as any).missionsCompletes} missions)` : ''}
                            </option>
                          ))}
                          {dispos.length === 0 && (
                            <option disabled>Aucun distributeur disponible</option>
                          )}
                        </select>
                        <button
                          onClick={() => handleAffecter(t.id)}
                          disabled={!selectMap[t.id] || busy}
                          className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1.5"
                        >
                          {busy ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                          Affecter
                        </button>
                      </div>

                      {/* Résumé sélection */}
                      {selectedDist && (
                        <p className="text-xs text-brand-600 mt-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg px-3 py-1.5">
                          {selectedDist.prenom} {selectedDist.nom}
                          {(selectedDist as any).missionsCompletes != null && ` — ${(selectedDist as any).missionsCompletes} missions effectuées`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Distributeurs ── */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              Équipe terrain
              <span className="ml-1 text-xs font-normal text-gray-400">({distributeurs.length})</span>
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
              {/* Disponibles */}
              {dispos.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Disponibles</p>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {dispos.map(d => (
                      <div key={d.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-bold shrink-0">
                          {d.prenom?.[0]}{d.nom?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{d.prenom} {d.nom}</p>
                          {(d as any).missionsCompletes != null && (
                            <p className="text-xs text-gray-400">{(d as any).missionsCompletes} missions · <span className="text-green-600">disponible</span></p>
                          )}
                        </div>
                        <StatutDot statut={(d as any).statut ?? 'disponible'} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* En mission (grisés) */}
              {enMission.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">En mission</p>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800 opacity-50">
                    {enMission.map(d => (
                      <div key={d.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 text-xs font-bold shrink-0">
                          {d.prenom?.[0]}{d.nom?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{d.prenom} {d.nom}</p>
                          <p className="text-xs text-blue-500">en mission</p>
                        </div>
                        <StatutDot statut="en_mission" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {distributeurs.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-gray-400">
                  {criseId ? 'Aucun distributeur trouvé' : 'Sélectionnez une crise'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
