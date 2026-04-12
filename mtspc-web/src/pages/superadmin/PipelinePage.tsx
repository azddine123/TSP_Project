/**
 * PAGE PIPELINE ALGORITHMIQUE — AHP → TOPSIS → VRP
 */
import { useState, useEffect, useCallback } from 'react';
import { conditionalCriseApi as criseApi, conditionalAlgoApi as algoApi, conditionalEntrepotApi as entrepotApi, getApiErrorMessage } from '../../services/api';
import type {
  Crise, Entrepot, PipelineResult, RunPipelineDto,
  AhpMatrice, TopsisRanking, VrpTournee,
} from '../../types';

// ── Valeurs AHP par défaut (RC cohérent) ──────────────────────────────────────
const DEFAULT_AHP: AhpMatrice['comparaisons'] = {
  vuln_vs_sev:   3,
  vuln_vs_acc:   5,
  vuln_vs_soins: 7,
  sev_vs_acc:    3,
  sev_vs_soins:  5,
  acc_vs_soins:  3,
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct > 70 ? 'bg-red-500' : pct > 40 ? 'bg-orange-400' : 'bg-yellow-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-bold w-10 text-right">{score.toFixed(3)}</span>
    </div>
  );
}

function StatuBadge({ statut }: { statut: string }) {
  const cls: Record<string, string> = {
    pending:   'bg-gray-100 text-gray-600',
    running:   'bg-blue-100 text-blue-700 animate-pulse',
    completed: 'bg-green-100 text-green-700',
    failed:    'bg-red-100 text-red-700',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${cls[statut] ?? ''}`}>{statut}</span>;
}

// ── Formulaire AHP ─────────────────────────────────────────────────────────────

const AHP_FIELDS: { key: keyof AhpMatrice['comparaisons']; label: string }[] = [
  { key: 'vuln_vs_sev',   label: 'Vulnérabilité vs Sévérité' },
  { key: 'vuln_vs_acc',   label: 'Vulnérabilité vs Accessibilité' },
  { key: 'vuln_vs_soins', label: 'Vulnérabilité vs Accès Soins' },
  { key: 'sev_vs_acc',    label: 'Sévérité vs Accessibilité' },
  { key: 'sev_vs_soins',  label: 'Sévérité vs Accès Soins' },
  { key: 'acc_vs_soins',  label: 'Accessibilité vs Accès Soins' },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [crises,    setCrises]    = useState<Crise[]>([]);
  const [entrepots, setEntrepots] = useState<Entrepot[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // Formulaire
  const [criseId,   setCriseId]   = useState('');
  const [ahp,       setAhp]       = useState<AhpMatrice['comparaisons']>({ ...DEFAULT_AHP });
  const [lambdas,   setLambdas]   = useState({ distance: 0.4, temps: 0.3, couverture: 0.3 });
  const [vehicules, setVehicules] = useState<{ entrepotId: string; capacite: number; nbVehicules: number }[]>([]);

  // Résultat
  const [result,    setResult]    = useState<PipelineResult | null>(null);
  const [history,   setHistory]   = useState<PipelineResult[]>([]);
  const [running,   setRunning]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, e] = await Promise.all([criseApi.getAll(), entrepotApi.getAll()]);
      const active = c.filter((x) => x.statut === 'active');
      setCrises(active);
      setEntrepots(e);
      if (active.length > 0) {
        setCriseId(active[0].id);
        setVehicules(e.map((ent) => ({ entrepotId: ent.id, capacite: 1000, nbVehicules: 2 })));
        const h = await algoApi.getHistory(active[0].id);
        setHistory(h);
        if (h.length > 0 && h[0].statut === 'completed') setResult(h[0]);
      }
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRun() {
    if (!criseId) { setError('Sélectionnez une crise active.'); return; }
    const usedVehicules = vehicules.filter((v) => entrepots.find((e) => e.id === v.entrepotId));
    if (usedVehicules.length === 0) { setError('Configurez au moins un entrepôt.'); return; }

    setRunning(true); setError(null);
    try {
      const dto: RunPipelineDto = {
        criseId,
        ahpMatrice: { comparaisons: ahp },
        lambdas,
        contraintesVehicules: usedVehicules,
      };
      const r = await algoApi.runPipeline(dto);
      setResult(r);
      setHistory((prev) => [r, ...prev]);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setRunning(false);
    }
  }

  if (loading) return (
    <div className="flex justify-center py-24"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" /></div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipeline Algorithmique</h1>
        <p className="text-sm text-gray-500 mt-0.5">AHP → TOPSIS → VRP (Google OR-Tools)</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}<button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {crises.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl px-5 py-4 text-sm">
          Aucune crise active. Déclarez d'abord une crise dans la page <strong>Crises</strong>.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Formulaire ── */}
        <div className="xl:col-span-1 space-y-5">

          {/* Sélection crise */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Crise cible</h3>
            <select value={criseId} onChange={(e) => setCriseId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none">
              <option value="">-- Sélectionnez --</option>
              {crises.map((c) => <option key={c.id} value={c.id}>{c.reference} · {c.zone}</option>)}
            </select>
          </div>

          {/* Matrice AHP */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Matrice AHP</h3>
              <button onClick={() => setAhp({ ...DEFAULT_AHP })}
                className="text-xs text-brand-500 hover:underline">Réinitialiser</button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Échelle de Saaty : 1 (égal) → 9 (extrêmement important)</p>
            <div className="space-y-2.5">
              {AHP_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">{label}</span>
                  <input type="number" value={ahp[key]} min={0.111} max={9} step={0.5}
                    onChange={(e) => setAhp((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 1 }))}
                    className="w-16 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none text-center" />
                </div>
              ))}
            </div>
          </div>

          {/* Fonction objectif λ */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Coefficients VRP <span className="text-gray-400 font-normal">(Z = λ1·D + λ2·T − λ3·C)</span>
            </h3>
            {[
              { key: 'distance', label: 'λ1 — Distance' },
              { key: 'temps',    label: 'λ2 — Temps' },
              { key: 'couverture', label: 'λ3 — Couverture' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                <input type="number" value={lambdas[key as keyof typeof lambdas]} min={0} max={1} step={0.05}
                  onChange={(e) => setLambdas((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                  className="w-16 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none text-center" />
              </div>
            ))}
          </div>

          {/* Véhicules */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Contraintes Véhicules</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {vehicules.map((v, i) => {
                const e = entrepots.find((ent) => ent.id === v.entrepotId);
                return (
                  <div key={v.entrepotId} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">{e?.nom ?? v.entrepotId.slice(0,8)}</span>
                    <input type="number" value={v.capacite} min={100} step={100}
                      onChange={(e2) => setVehicules((p) => p.map((x, j) => j === i ? { ...x, capacite: parseInt(e2.target.value) || 100 } : x))}
                      className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none text-center" />
                    <span className="text-gray-400">cap</span>
                    <input type="number" value={v.nbVehicules} min={1} max={20}
                      onChange={(e2) => setVehicules((p) => p.map((x, j) => j === i ? { ...x, nbVehicules: parseInt(e2.target.value) || 1 } : x))}
                      className="w-12 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none text-center" />
                    <span className="text-gray-400">véh.</span>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={handleRun} disabled={running || !criseId}
            className="w-full py-3 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {running ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Exécution en cours…</>
            ) : (
              <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg> Lancer le Pipeline</>
            )}
          </button>
        </div>

        {/* ── Résultats ── */}
        <div className="xl:col-span-2 space-y-5">

          {result ? (
            <>
              {/* Header résultat */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Résultat Pipeline</h3>
                    <p className="text-xs text-gray-400 mt-0.5">ID: {result.id.slice(0, 8)}… · {result.executionMs ? `${result.executionMs}ms` : '—'}</p>
                  </div>
                  <StatuBadge statut={result.statut} />
                </div>
                {result.ahp && (
                  <div className="grid grid-cols-4 gap-3">
                    {(Object.entries(result.ahp.poids) as [string, number][]).map(([k, v]) => (
                      <div key={k} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-brand-600">{(v * 100).toFixed(1)}%</p>
                        <p className="text-xs text-gray-500 capitalize mt-0.5">{k}</p>
                      </div>
                    ))}
                  </div>
                )}
                {result.ahp && (
                  <p className={`text-xs mt-3 font-medium ${result.ahp.coherent ? 'text-green-600' : 'text-red-600'}`}>
                    {result.ahp.coherent ? '✓' : '⚠'} RC = {result.ahp.rc.toFixed(4)} {result.ahp.coherent ? '— Matrice cohérente' : '— Incohérence (RC ≥ 0.10)'}
                  </p>
                )}
              </div>

              {/* Classement TOPSIS */}
              {result.topsis?.classement && result.topsis.classement.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Classement TOPSIS — Priorités d'Intervention</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 text-xs font-semibold uppercase tracking-wider text-left">
                          <th className="px-4 py-3">Rang</th>
                          <th className="px-4 py-3">Douar</th>
                          <th className="px-4 py-3">Commune</th>
                          <th className="px-4 py-3 w-40">Score C_i</th>
                          <th className="px-4 py-3">D+</th>
                          <th className="px-4 py-3">D-</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {(result.topsis.classement as TopsisRanking[]).map((r) => (
                          <tr key={r.douarId} className={r.rang <= 3 ? 'bg-red-50/50 dark:bg-red-950/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}>
                            <td className="px-4 py-3">
                              <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold
                                ${r.rang === 1 ? 'bg-red-100 text-red-700' : r.rang === 2 ? 'bg-orange-100 text-orange-700' : r.rang === 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                {r.rang}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.douarNom}</td>
                            <td className="px-4 py-3 text-gray-500">{r.commune}</td>
                            <td className="px-4 py-3 w-40"><ScoreBar score={r.score} /></td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.distances.dPlus.toFixed(4)}</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.distances.dMinus.toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tournées VRP */}
              {result.tournees && result.tournees.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Tournées VRP Optimisées</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{result.tournees.length} tournée(s) générée(s)</p>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(result.tournees as VrpTournee[]).map((t, i) => (
                      <div key={i} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.entrepotNom}</p>
                            <p className="text-xs text-gray-400">{t.etapes.length} étape(s) · {t.distanceTotale} km · {t.tempsEstime} min</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Z = <span className="font-mono font-bold text-brand-600">{t.scoreZ.toFixed(3)}</span></p>
                            <p className="text-xs text-gray-400">Cap. {t.vehiculeCapacite} unités</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {t.etapes.map((e) => (
                            <span key={e.douarId} className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-xs rounded-full">
                              <span className="w-4 h-4 bg-brand-500 text-white rounded-full flex items-center justify-center font-bold" style={{ fontSize: 9 }}>{e.ordre}</span>
                              {e.douarNom}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm p-12 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <p className="text-gray-500 font-medium">Aucun résultat</p>
              <p className="text-sm text-gray-400 mt-1">Configurez les paramètres et lancez le pipeline</p>
            </div>
          )}

          {/* Historique */}
          {history.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Historique d'exécutions</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {history.slice(0, 5).map((h) => (
                  <div key={h.id} className="px-5 py-3 flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    onClick={() => setResult(h)}>
                    <div>
                      <p className="font-mono text-xs text-gray-500">{h.id.slice(0, 8)}…</p>
                      <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {h.executionMs && <span className="text-xs text-gray-400">{h.executionMs}ms</span>}
                      <StatuBadge statut={h.statut} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
