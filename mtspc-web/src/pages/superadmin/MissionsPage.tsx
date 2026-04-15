/**
 * PAGE ORDRES DE MISSION — Super Admin
 * ======================================
 * Vue centralisée de TOUTES les tournées créées par le pipeline VRP.
 * Chaque tournée = un ordre de mission à appliquer sur le terrain.
 *
 * Fonctionnalités liées :
 *  - Backend : GET /tournees, PATCH /tournees/:id/assigner, /demarrer, /annuler, /etapes/:id/statut
 *  - Distributeurs : GET /distributeurs (liste en temps réel)
 *  - Crises : affichage des références
 *  - Supervision : lien vers carte temps réel
 *  - Incidents : lien vers incidents de la crise
 *  - Audit : chaque action génère un log inaltérable côté backend
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tourneeApi, criseApi, distributeurApi, getApiErrorMessage } from '../../services/api';
import type { Tournee, TourneeEtape, Crise, Distributeur } from '../../types';

// ── Constantes visuelles ──────────────────────────────────────────────────────

const STATUT_CONFIG: Record<string, { label: string; badge: string; dot: string; row: string }> = {
  planifiee: {
    label: 'Planifiée',
    badge: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    dot:   'bg-yellow-400',
    row:   '',
  },
  en_cours: {
    label: 'En cours',
    badge: 'bg-blue-100 text-blue-700 border border-blue-200',
    dot:   'bg-blue-500 animate-pulse',
    row:   'border-l-2 border-l-blue-400',
  },
  terminee: {
    label: 'Terminée',
    badge: 'bg-green-100 text-green-700 border border-green-200',
    dot:   'bg-green-500',
    row:   'opacity-75',
  },
  annulee: {
    label: 'Annulée',
    badge: 'bg-gray-100 text-gray-400 border border-gray-200',
    dot:   'bg-gray-300',
    row:   'opacity-50',
  },
};

const ETAPE_STATUT: Record<string, { label: string; cls: string }> = {
  en_attente: { label: 'En attente', cls: 'bg-gray-100 text-gray-500' },
  en_route:   { label: 'En route',   cls: 'bg-blue-100 text-blue-700' },
  livree:     { label: 'Livré',      cls: 'bg-green-100 text-green-700' },
  echec:      { label: 'Échec',      cls: 'bg-red-100 text-red-600' },
};

// ── Mini-modal assignation ────────────────────────────────────────────────────

function AssignModal({
  tournee, distributeurs, onClose, onSaved,
}: {
  tournee: Tournee;
  distributeurs: Distributeur[];
  onClose: () => void;
  onSaved: (t: Tournee) => void;
}) {
  const [distId, setDistId] = useState(tournee.distributeur?.id ?? '');
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState('');

  const dispos = distributeurs.filter(
    d => (d.statut === 'disponible') || d.id === tournee.distributeur?.id,
  );

  async function confirm() {
    if (!distId) { setErr('Sélectionnez un distributeur'); return; }
    setBusy(true); setErr('');
    try {
      const updated = await tourneeApi.assigner(tournee.id, { distributeurId: distId });
      onSaved(updated);
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Assigner un distributeur</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {tournee.entrepot.nom} · {tournee.etapes.length} douar(s)
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            {err && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                Distributeur disponible <span className="text-red-500">*</span>
              </label>
              <select
                value={distId}
                onChange={e => setDistId(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">— Choisir —</option>
                {dispos.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.prenom} {d.nom}
                  </option>
                ))}
              </select>
              {dispos.length === 0 && (
                <p className="text-xs text-orange-500 mt-1">Aucun distributeur disponible pour le moment.</p>
              )}
            </div>

            {/* Résumé de la mission */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-xs space-y-1 text-gray-500 dark:text-gray-400">
              <p><span className="font-semibold text-gray-700 dark:text-gray-300">Entrepôt :</span> {tournee.entrepot.nom} · {tournee.entrepot.province}</p>
              <p><span className="font-semibold text-gray-700 dark:text-gray-300">Étapes :</span> {tournee.etapes.length} douar(s)</p>
              <p><span className="font-semibold text-gray-700 dark:text-gray-300">Distance :</span> {tournee.distanceTotale.toFixed(1)} km</p>
              <p><span className="font-semibold text-gray-700 dark:text-gray-300">Durée estimée :</span> {tournee.tempsEstime} min</p>
            </div>
          </div>

          <div className="px-5 pb-4 flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
              Annuler
            </button>
            <button
              onClick={confirm}
              disabled={busy || !distId}
              className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl disabled:opacity-50 transition-colors"
            >
              {busy ? 'Enregistrement…' : 'Confirmer'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Carte mission ─────────────────────────────────────────────────────────────

function MissionCard({
  tournee, distributeurs, criseMap, onUpdate,
}: {
  tournee: Tournee;
  distributeurs: Distributeur[];
  criseMap: Map<string, Crise>;
  onUpdate: (t: Tournee) => void;
}) {
  const navigate = useNavigate();
  const [expanded,  setExpanded]  = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [busy,      setBusy]      = useState(false);

  const etapes  = useMemo(() => [...tournee.etapes].sort((a, b) => a.ordre - b.ordre), [tournee.etapes]);
  const livrees = etapes.filter(e => e.statut === 'livree').length;
  const pct     = etapes.length > 0 ? Math.round(livrees / etapes.length * 100) : 0;
  const crise   = criseMap.get(tournee.criseId);
  const cfg     = STATUT_CONFIG[tournee.statut] ?? STATUT_CONFIG.planifiee;

  async function handleDemarrer() {
    if (!confirm(`Démarrer la mission de ${tournee.entrepot.nom} ?`)) return;
    setBusy(true);
    try {
      const updated = await tourneeApi.demarrer(tournee.id);
      onUpdate(updated);
    } catch (e) {
      alert(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleAnnuler() {
    if (!confirm(`Annuler la mission de ${tournee.entrepot.nom} ? Cette action est irréversible.`)) return;
    setBusy(true);
    try {
      const updated = await tourneeApi.annuler(tournee.id);
      onUpdate(updated);
    } catch (e) {
      alert(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden transition-all ${cfg.row}`}>

        {/* ── Header cliquable ── */}
        <div
          className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors select-none"
          onClick={() => setExpanded(e => !e)}
        >
          {/* Indicateur statut */}
          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />

          {/* Infos principales */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                MS-{tournee.entrepot.province.slice(0, 1).toUpperCase()}-{new Date(tournee.createdAt).getFullYear()}-{tournee.id.slice(-3).toUpperCase()}
              </span>
              {crise && (
                <span className="text-xs text-gray-400 font-mono">· {crise.reference}</span>
              )}
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.badge}`}>
                {cfg.label}
              </span>
              {tournee.statut === 'en_cours' && (
                <span className="text-xs text-blue-600 font-semibold">{pct}%</span>
              )}
            </div>

            {/* Résumé ligne */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{etapes.length} douar{etapes.length !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{tournee.distanceTotale.toFixed(1)} km</span>
              <span>·</span>
              <span>{tournee.tempsEstime} min</span>
              <span>·</span>
              <span className="font-medium text-gray-600 dark:text-gray-300">{tournee.entrepot.nom}</span>
              {tournee.distributeur ? (
                <>
                  <span>·</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {tournee.distributeur.prenom} {tournee.distributeur.nom}
                  </span>
                </>
              ) : (
                <>
                  <span>·</span>
                  <span className="text-orange-500 font-semibold">Non assigné</span>
                </>
              )}
            </div>

            {/* Barre de progression */}
            {etapes.length > 0 && tournee.statut !== 'planifiee' && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 tabular-nums shrink-0">{livrees}/{etapes.length}</span>
              </div>
            )}
          </div>

          {/* Actions rapides */}
          <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
            {tournee.statut === 'planifiee' && !tournee.distributeur && (
              <button
                onClick={() => setAssigning(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors"
              >
                Assigner
              </button>
            )}

            {tournee.statut === 'planifiee' && tournee.distributeur && (
              <button
                onClick={handleDemarrer}
                disabled={busy}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {busy ? '…' : 'Démarrer'}
              </button>
            )}

            {tournee.statut === 'en_cours' && (
              <button
                onClick={() => navigate('/superadmin/supervision')}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 transition-colors"
              >
                Voir carte
              </button>
            )}

            {(tournee.statut === 'planifiee' || tournee.statut === 'en_cours') && (
              <button
                onClick={handleAnnuler}
                disabled={busy}
                title="Annuler la mission"
                className="p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
              </button>
            )}

            {/* Chevron expand */}
            <div className="p-1.5 text-gray-300">
              <svg className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ── Détail expandable ── */}
        {expanded && (
          <div className="border-t border-gray-100 dark:border-gray-800 px-4 pb-4 pt-3 space-y-3">

            {/* Métadonnées */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Crise',     value: crise?.reference ?? tournee.criseId.slice(0, 8) },
                { label: 'Entrepôt', value: `${tournee.entrepot.nom} (${tournee.entrepot.province})` },
                { label: 'Distance', value: `${tournee.distanceTotale.toFixed(1)} km` },
                { label: 'Durée estimée', value: `${tournee.tempsEstime} min` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{value}</p>
                </div>
              ))}
            </div>

            {/* Séquence des étapes */}
            {etapes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Séquence de livraison · {etapes.length} douars
                </p>
                <div className="space-y-2">
                  {etapes.map((etape: TourneeEtape) => {
                    const es = ETAPE_STATUT[etape.statut] ?? ETAPE_STATUT.en_attente;
                    return (
                      <div key={etape.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 flex flex-wrap items-start gap-3">
                        {/* Numéro + nom */}
                        <div className="flex items-center gap-2 min-w-[160px]">
                          <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {etape.ordre}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{etape.douar.nom}</p>
                            <p className="text-[10px] text-gray-400">{etape.douar.commune}</p>
                          </div>
                        </div>

                        {/* Population + priorité */}
                        {etape.population != null && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{etape.population.toLocaleString()}</span> hab
                            {etape.menages != null && <span> · {etape.menages} ménages</span>}
                            {etape.scoreTopsis != null && (
                              <span className="ml-1.5 font-semibold text-brand-600 dark:text-brand-400">
                                TOPSIS: {(etape.scoreTopsis * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        )}

                        {/* Ressources */}
                        {etape.ressources && (
                          <div className="flex flex-wrap gap-1.5 text-[10px] font-medium">
                            {etape.ressources.tentes > 0 && (
                              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                {etape.ressources.tentes} tentes
                              </span>
                            )}
                            {etape.ressources.couvertures > 0 && (
                              <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded-full">
                                {etape.ressources.couvertures} couv.
                              </span>
                            )}
                            {etape.ressources.vivres > 0 && (
                              <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-2 py-0.5 rounded-full">
                                {etape.ressources.vivres} kits vivres
                              </span>
                            )}
                            {etape.ressources.kits_med > 0 && (
                              <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2 py-0.5 rounded-full">
                                {etape.ressources.kits_med} kits méd.
                              </span>
                            )}
                            {etape.ressources.eau_litres > 0 && (
                              <span className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 px-2 py-0.5 rounded-full">
                                {etape.ressources.eau_litres.toLocaleString()} L eau
                              </span>
                            )}
                          </div>
                        )}

                        {/* Statut badge */}
                        <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${es.cls}`}>
                          {es.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Ressources totales */}
                {tournee.ressourcesTotales && (
                  <div className="mt-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-xl p-3">
                    <p className="text-xs font-bold text-brand-700 dark:text-brand-400 mb-2">
                      Total mission
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2.5 py-1 rounded-lg">
                        {tournee.ressourcesTotales.tentes} tentes
                      </span>
                      <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-2.5 py-1 rounded-lg">
                        {tournee.ressourcesTotales.couvertures} couvertures
                      </span>
                      <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-2.5 py-1 rounded-lg">
                        {tournee.ressourcesTotales.vivres} kits vivres
                      </span>
                      <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2.5 py-1 rounded-lg">
                        {tournee.ressourcesTotales.kits_med} kits méd.
                      </span>
                      <span className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 px-2.5 py-1 rounded-lg">
                        {tournee.ressourcesTotales.eau_litres.toLocaleString()} L eau
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Liens rapides */}
            <div className="flex flex-wrap gap-2 pt-1">
              {crise && (
                <Link
                  to={`/superadmin/crises`}
                  className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  Crise {crise.reference}
                </Link>
              )}
              <Link
                to="/superadmin/supervision"
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                </svg>
                Supervision temps réel
              </Link>
              {crise && (
                <Link
                  to="/superadmin/incidents"
                  className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Incidents de la crise
                </Link>
              )}
              <Link
                to="/superadmin/audit"
                className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:underline"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
                </svg>
                Audit trail
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Modal assignation */}
      {assigning && (
        <AssignModal
          tournee={tournee}
          distributeurs={distributeurs}
          onClose={() => setAssigning(false)}
          onSaved={(updated) => { onUpdate(updated); setAssigning(false); }}
        />
      )}
    </>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function SuperAdminMissionsPage() {
  const [tournees,      setTournees]      = useState<Tournee[]>([]);
  const [crises,        setCrises]        = useState<Crise[]>([]);
  const [distributeurs, setDistributeurs] = useState<Distributeur[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  // Filtres
  const [filterStatut, setFilterStatut] = useState<string>('');
  const [filterCrise,  setFilterCrise]  = useState<string>('');
  const [search,       setSearch]       = useState('');

  // Map criseId → Crise pour lookup rapide
  const criseMap = useMemo(() => {
    const m = new Map<string, Crise>();
    crises.forEach(c => m.set(c.id, c));
    return m;
  }, [crises]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [t, c, d] = await Promise.all([
        tourneeApi.getAll(),
        criseApi.getAll(),
        distributeurApi.getAll(),
      ]);
      setTournees(t);
      setCrises(c);
      setDistributeurs(d);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Mise à jour locale après action
  function handleUpdate(updated: Tournee) {
    setTournees(prev => prev.map(t => t.id === updated.id ? updated : t));
  }

  // Filtrage
  const filtered = useMemo(() => {
    return tournees.filter(t => {
      if (filterStatut && t.statut !== filterStatut) return false;
      if (filterCrise  && t.criseId !== filterCrise) return false;
      if (search) {
        const q = search.toLowerCase();
        const crise = criseMap.get(t.criseId);
        const matchEntrepot = t.entrepot.nom.toLowerCase().includes(q);
        const matchDist = t.distributeur
          ? `${t.distributeur.prenom} ${t.distributeur.nom}`.toLowerCase().includes(q)
          : false;
        const matchCrise = crise?.reference.toLowerCase().includes(q) ?? false;
        const matchDouar = t.etapes.some(e => e.douar.nom.toLowerCase().includes(q));
        if (!matchEntrepot && !matchDist && !matchCrise && !matchDouar) return false;
      }
      return true;
    });
  }, [tournees, filterStatut, filterCrise, search, criseMap]);

  // Routes bloquées : étapes avec statut 'echec' toutes tournées confondues
  const routesBloquees = useMemo(() => {
    const results: Array<{ tournee: Tournee; etape: TourneeEtape }> = [];
    tournees.forEach((tournee) => {
      if (tournee.statut === 'annulee') return;
      tournee.etapes.forEach((etape) => {
        if (etape.statut === 'echec') results.push({ tournee, etape });
      });
    });
    return results;
  }, [tournees]);

  // Stats globales
  const stats = useMemo(() => ({
    total:     tournees.length,
    planifiee: tournees.filter(t => t.statut === 'planifiee').length,
    en_cours:  tournees.filter(t => t.statut === 'en_cours').length,
    terminee:  tournees.filter(t => t.statut === 'terminee').length,
    annulee:   tournees.filter(t => t.statut === 'annulee').length,
    nonAssign: tournees.filter(t => t.statut === 'planifiee' && !t.distributeur).length,
  }), [tournees]);

  return (
    <div className="space-y-6">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Ordres de Mission
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Toutes les tournées VRP assignées par le Super Admin · Douars prioritaires et besoins
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/superadmin/pipeline"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 rounded-xl hover:bg-brand-100 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Nouveau pipeline VRP
          </Link>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Actualiser
          </button>
        </div>
      </div>

      {/* ── Erreur ── */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
          </svg>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30">✕</button>
        </div>
      )}

      {/* ── Alertes routes bloquées ── */}
      {routesBloquees.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <h3 className="text-sm font-bold text-red-700 dark:text-red-400">
              {routesBloquees.length} route{routesBloquees.length > 1 ? 's' : ''} bloquée{routesBloquees.length > 1 ? 's' : ''} signalée{routesBloquees.length > 1 ? 's' : ''} — Recalcul VRP requis
            </h3>
          </div>
          <div className="space-y-2">
            {routesBloquees.map(({ tournee, etape }) => (
              <div
                key={`${etape.id}`}
                className="flex items-center justify-between gap-3 bg-white dark:bg-gray-900 rounded-xl px-4 py-2.5 border border-red-100 dark:border-red-900"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {etape.douar.nom}
                    <span className="text-gray-400 font-normal"> · {tournee.entrepot.nom}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {criseMap.get(tournee.criseId)?.reference ?? tournee.criseId.slice(0, 8)}
                    {' '}· Étape {etape.ordre}
                  </p>
                </div>
                <Link
                  to={`/superadmin/pipeline?criseId=${tournee.criseId}&routeBloquee=${etape.douar.id}`}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                  </svg>
                  Recalculer VRP
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cartes de stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total',       value: stats.total,     color: 'text-gray-700 dark:text-gray-200',   bg: 'bg-gray-50 dark:bg-gray-800',    filter: ''          },
          { label: 'Planifiées',  value: stats.planifiee, color: 'text-yellow-700',                    bg: 'bg-yellow-50 dark:bg-yellow-900/20', filter: 'planifiee' },
          { label: 'En cours',    value: stats.en_cours,  color: 'text-blue-700',                      bg: 'bg-blue-50 dark:bg-blue-900/20', filter: 'en_cours'  },
          { label: 'Terminées',   value: stats.terminee,  color: 'text-green-700',                     bg: 'bg-green-50 dark:bg-green-900/20', filter: 'terminee'  },
          { label: 'Annulées',    value: stats.annulee,   color: 'text-gray-400',                      bg: 'bg-gray-100 dark:bg-gray-800',   filter: 'annulee'   },
          { label: 'Non assignées', value: stats.nonAssign, color: 'text-orange-700',                  bg: 'bg-orange-50 dark:bg-orange-900/20', filter: 'planifiee' },
        ].map(({ label, value, color, bg, filter }) => (
          <button
            key={label}
            onClick={() => setFilterStatut(filterStatut === filter && label !== 'Total' ? '' : filter)}
            className={`${bg} rounded-2xl p-4 text-left transition-all hover:ring-2 hover:ring-brand-200 ${
              filterStatut === filter && label !== 'Total' ? 'ring-2 ring-brand-400' : ''
            }`}
          >
            <p className={`text-2xl font-bold leading-none ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
          </button>
        ))}
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Recherche */}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher entrepôt, distributeur, douar, crise…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        {/* Filtre statut */}
        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">Tous les statuts</option>
          <option value="planifiee">Planifiées</option>
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminées</option>
          <option value="annulee">Annulées</option>
        </select>

        {/* Filtre crise */}
        <select
          value={filterCrise}
          onChange={e => setFilterCrise(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">Toutes les crises</option>
          {crises.map(c => (
            <option key={c.id} value={c.id}>{c.reference} · {c.zone}</option>
          ))}
        </select>

        {(filterStatut || filterCrise || search) && (
          <button
            onClick={() => { setFilterStatut(''); setFilterCrise(''); setSearch(''); }}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Effacer filtres
          </button>
        )}

        <span className="text-xs text-gray-400 ml-auto">
          {filtered.length} / {tournees.length} mission{tournees.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Alerte missions sans distributeur ── */}
      {stats.nonAssign > 0 && (
        <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-4 py-3 text-sm text-orange-700 dark:text-orange-300">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>
            <span className="font-semibold">{stats.nonAssign} mission{stats.nonAssign > 1 ? 's' : ''}</span> planifiée{stats.nonAssign > 1 ? 's' : ''} sans distributeur assigné — cliquez sur <strong>Assigner</strong> pour les activer.
          </span>
        </div>
      )}

      {/* ── Liste des missions ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-600">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12l2 2 4-4"/>
          </svg>
          <p className="text-sm font-medium">Aucune mission trouvée</p>
          {tournees.length === 0 ? (
            <p className="text-xs mt-1">
              Lancez d'abord le{' '}
              <Link to="/superadmin/pipeline" className="text-brand-500 hover:underline">Pipeline Algo</Link>
              {' '}pour générer des tournées.
            </p>
          ) : (
            <p className="text-xs mt-1">Essayez de modifier vos filtres.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <MissionCard
              key={t.id}
              tournee={t}
              distributeurs={distributeurs}
              criseMap={criseMap}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
