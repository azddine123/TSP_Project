/**
 * PAGE MISSIONS / TOURNÉES — Admin Entrepôt
 * Réception des tournées assignées par le Super Admin
 * Validation "Chargement Terminé — Prêt au départ"
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// Import FORCÉ des mocks
import { mockTourneeApi as tourneeApi } from '../../mock/adminApi';
import { getApiErrorMessage } from '../../services/api';
import type { Tournee, TourneeStatut } from '../../types';

const STATUT_CONFIG: Record<TourneeStatut, { label: string; color: string }> = {
  planifiee: { label: 'En attente',   color: 'bg-yellow-100 text-yellow-700' },
  en_cours:  { label: 'En mission',   color: 'bg-blue-100   text-blue-700'   },
  terminee:  { label: 'Terminée',     color: 'bg-green-100  text-green-700'  },
  annulee:   { label: 'Annulée',      color: 'bg-red-100    text-red-600'    },
};

function EtapesList({ etapes }: { etapes: Tournee['etapes'] }) {
  const sorted = [...etapes].sort((a, b) => a.ordre - b.ordre);
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {sorted.map((e) => (
        <span key={e.id} className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${
          e.statut === 'livree'   ? 'bg-green-100 text-green-700' :
          e.statut === 'echec'    ? 'bg-red-100   text-red-600'   :
          e.statut === 'en_route' ? 'bg-blue-100  text-blue-700'  :
          'bg-gray-100 text-gray-500'
        }`}>
          <span className="text-gray-400">{e.ordre}.</span>{e.douar.nom}
        </span>
      ))}
    </div>
  );
}

// Priorité labels / couleurs pour TourneeCard
const PRIORITE_COLOR: Record<string, string> = {
  CRITIQUE: 'bg-red-100 text-red-700',
  HAUTE:    'bg-orange-100 text-orange-700',
  MOYENNE:  'bg-yellow-100 text-yellow-700',
  BASSE:    'bg-green-100 text-green-700',
};

function TourneeCard({
  tournee, starting, onStart,
}: {
  tournee: Tournee;
  starting: string | null;
  onStart: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const cfg           = STATUT_CONFIG[tournee.statut];
  const etapesLivrees = tournee.etapes.filter((e) => e.statut === 'livree').length;
  const progression   = tournee.etapes.length > 0
    ? Math.round((etapesLivrees / tournee.etapes.length) * 100)
    : 0;

  // Accès étendu aux étapes (avec priorite, scoreTopsis, ressources)
  type EtapeExt = typeof tournee.etapes[0] & { priorite?: string; scoreTopsis?: number; ressources?: Record<string, number> };
  const etapesExt = tournee.etapes as EtapeExt[];

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-theme-sm overflow-hidden ${
      tournee.statut === 'planifiee' ? 'border-yellow-200 dark:border-yellow-900/40' :
      tournee.statut === 'en_cours'  ? 'border-blue-200  dark:border-blue-900/40'   :
      'border-gray-200 dark:border-gray-800'
    }`}>
      {/* En-tête cliquable */}
      <div
        className="p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
              {(tournee as unknown as { missionNumero?: string }).missionNumero && (
                <span className="text-xs font-mono text-gray-500">
                  {(tournee as unknown as { missionNumero: string }).missionNumero}
                </span>
              )}
              {tournee.statut === 'planifiee' && !tournee.distributeur && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600">Non assigné</span>
              )}
            </div>
            <p className="font-bold text-gray-900 dark:text-white">{tournee.entrepot.nom}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {tournee.etapes.length} douar(s) · {tournee.distanceTotale} km · ~{tournee.tempsEstime} min
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {tournee.distributeur ? (
              <div className="text-right">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {tournee.distributeur.prenom} {tournee.distributeur.nom}
                </p>
                <p className="text-xs text-gray-400">Distributeur</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Aucun distributeur</p>
            )}
            <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        {/* Progression */}
        {tournee.statut === 'en_cours' && tournee.etapes.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">Progression</span>
              <span className="font-bold text-blue-600">{etapesLivrees}/{tournee.etapes.length} ({progression}%)</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progression}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Détail expandable */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
          {/* Séquence étapes */}
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Séquence de livraison</p>
            <EtapesList etapes={tournee.etapes} />
          </div>

          {/* Détail douars avec priorités et ressources */}
          {etapesExt.some(e => e.priorite || e.scoreTopsis) && (
            <div className="px-5 pb-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2">Détail par douar</p>
              {etapesExt.map(etape => (
                <div key={etape.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {(etape as unknown as { douar?: { nom: string } }).douar?.nom ?? (etape as unknown as { douarNom?: string }).douarNom ?? `Étape ${etape.ordre}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(etape as unknown as { population?: number }).population?.toLocaleString('fr-FR') ?? '—'} hab.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {etape.priorite && (
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${PRIORITE_COLOR[etape.priorite] ?? 'bg-gray-100 text-gray-600'}`}>
                          {etape.priorite}
                        </span>
                      )}
                      {etape.scoreTopsis !== undefined && (
                        <span className="text-xs font-bold text-brand-600 tabular-nums">
                          {(etape.scoreTopsis * 100).toFixed(0)}%
                        </span>
                      )}
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        etape.statut === 'livree'    ? 'bg-green-100 text-green-700' :
                        etape.statut === 'en_route'  ? 'bg-blue-100 text-blue-700 animate-pulse' :
                        'bg-gray-100 text-gray-500'
                      }`}>{etape.statut}</span>
                    </div>
                  </div>
                  {etape.ressources && Object.keys(etape.ressources).some(k => (etape.ressources as Record<string,number>)[k] > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(etape.ressources as Record<string,number>).tentes > 0 && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">⛺ {(etape.ressources as Record<string,number>).tentes}</span>
                      )}
                      {(etape.ressources as Record<string,number>).vivres > 0 && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-600 rounded">🛒 {(etape.ressources as Record<string,number>).vivres}</span>
                      )}
                      {(etape.ressources as Record<string,number>).eau_litres > 0 && (
                        <span className="text-xs px-1.5 py-0.5 bg-cyan-50 text-cyan-600 rounded">💧 {(etape.ressources as Record<string,number>).eau_litres?.toLocaleString('fr-FR')} L</span>
                      )}
                      {(etape.ressources as Record<string,number>).kits_med > 0 && (
                        <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded">🏥 {(etape.ressources as Record<string,number>).kits_med}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {(tournee.statut === 'planifiee' && tournee.distributeur) && (
            <div className="px-5 pb-5">
              {starting === tournee.id ? (
                <div className="flex justify-center py-2">
                  <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                </div>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); onStart(tournee.id); }}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white bg-brand-500 hover:bg-brand-600 transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 11 12 14 22 4"/>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                  Chargement terminé — Départ autorisé
                </button>
              )}
            </div>
          )}

          {tournee.statut === 'planifiee' && !tournee.distributeur && (
            <div className="px-5 pb-5">
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl px-4 py-2.5 text-xs text-orange-600 dark:text-orange-400 text-center">
                En attente d'affectation d'un distributeur par le Super Admin
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions compactes (quand pas expanded) */}
      {!expanded && tournee.statut === 'planifiee' && tournee.distributeur && (
        <div className="px-5 pb-4">
          {starting === tournee.id ? (
            <div className="flex justify-center py-1"><div className="w-4 h-4 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" /></div>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onStart(tournee.id); }}
              className="w-full py-2.5 rounded-xl font-bold text-sm text-white bg-brand-500 hover:bg-brand-600 transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
              Départ autorisé
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TourneesPage() {
  const navigate = useNavigate();
  const [tournees,  setTournees]  = useState<Tournee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [starting,  setStarting]  = useState<string | null>(null);
  const [tabStatut, setTabStatut] = useState<'all' | TourneeStatut>('all');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const t = await tourneeApi.getMine();
      setTournees(t as unknown as Tournee[]);
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleStart(id: string) {
    setStarting(id); setError(null);
    try {
      const updated = await tourneeApi.assigner(id, {
        distributeurId: tournees.find((t) => t.id === id)?.distributeur?.id ?? '',
      });
      // Le back démarre réellement via demarrer — on recharge pour avoir le vrai statut
      await load();
      void updated;
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setStarting(null); }
  }

  const counts = {
    all:       tournees.length,
    planifiee: tournees.filter((t) => t.statut === 'planifiee').length,
    en_cours:  tournees.filter((t) => t.statut === 'en_cours').length,
    terminee:  tournees.filter((t) => t.statut === 'terminee').length,
    annulee:   tournees.filter((t) => t.statut === 'annulee').length,
  };

  const filtered = tabStatut === 'all' ? tournees : tournees.filter((t) => t.statut === tabStatut);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Missions & Tournées</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tournées calculées par le pipeline VRP — Validez le chargement avant le départ</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/admin/tournees/create')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Créer une mission
          </button>
        <button onClick={load} disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Actualiser
        </button>
        </div>
      </div>

      {counts.planifiee > 0 && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-3.5">
          <svg className="w-5 h-5 text-yellow-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-sm text-yellow-700 font-medium">
            <span className="font-bold">{counts.planifiee} tournée{counts.planifiee > 1 ? 's' : ''}</span> en attente de validation chargement
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2">
          {error}<button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Onglets filtre */}
      <div className="flex items-center gap-1 flex-wrap">
        {([
          { key: 'all',       label: 'Toutes',         count: counts.all },
          { key: 'planifiee', label: 'En attente',      count: counts.planifiee },
          { key: 'en_cours',  label: 'En mission',      count: counts.en_cours },
          { key: 'terminee',  label: 'Terminées',       count: counts.terminee },
          { key: 'annulee',   label: 'Annulées',        count: counts.annulee },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTabStatut(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tabStatut === tab.key
                ? 'bg-brand-500 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                tabStatut === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Grille tournées */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-16 text-center">
          <p className="text-gray-400">Aucune tournée dans cette catégorie</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((t) => (
            <TourneeCard key={t.id} tournee={t} starting={starting} onStart={handleStart} />
          ))}
        </div>
      )}
    </div>
  );
}
