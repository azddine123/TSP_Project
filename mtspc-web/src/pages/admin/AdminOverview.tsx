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

// ── Slide-over générique ──────────────────────────────────────────────────────
function SlideOver({ title, subtitle, onClose, children }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      {/* Panneau */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {children}
        </div>
      </div>
    </>
  );
}

function KpiCard({ label, value, sub, color, bg, icon, to, onClick }: {
  label: string; value: number | string; sub?: string;
  color: string; bg: string; icon: React.ReactNode; to: string;
  onClick?: () => void;
}) {
  return (
    <div className={`${bg} rounded-2xl p-5 flex items-start gap-4 group relative`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-white/60 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-3xl font-bold leading-none ${color}`}>{value}</p>
        <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      <div className="absolute top-3 right-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onClick && (
          <button
            onClick={onClick}
            title="Voir le détail"
            className="p-1 rounded-lg bg-white/80 hover:bg-white shadow-sm text-gray-600"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        )}
        <Link
          to={to}
          title="Ouvrir la page"
          className="p-1 rounded-lg bg-white/80 hover:bg-white shadow-sm text-gray-600"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ── Priorité couleurs ────────────────────────────────────────────────────────
const PRIORITE_STYLE: Record<string, string> = {
  CRITIQUE: 'bg-red-100 text-red-700 border-red-200',
  HAUTE:    'bg-orange-100 text-orange-700 border-orange-200',
  MOYENNE:  'bg-yellow-100 text-yellow-700 border-yellow-200',
  BASSE:    'bg-green-100 text-green-700 border-green-200',
};

const STATUT_STYLE: Record<string, string> = {
  planifiee: 'bg-yellow-100 text-yellow-700',
  en_cours:  'bg-blue-100 text-blue-700',
  terminee:  'bg-green-100 text-green-700',
  annulee:   'bg-gray-100 text-gray-600',
};

// ── Carte mission assignée ─────────────────────────────────────────────────────
interface EtapeRessources {
  tentes?: number; couvertures?: number; vivres?: number;
  kits_med?: number; eau_litres?: number;
}
interface EtapeExtended {
  id: string; ordre: number; douarNom?: string;
  douar?: { nom: string; commune: string; province: string };
  priorite?: string; scoreTopsis?: number; population?: number; menages?: number;
  ressources?: EtapeRessources; statut: string;
}

function MissionAssigneeCard({ tournee }: { tournee: Tournee & { missionNumero?: string; criseId?: string; etapes: EtapeExtended[] } }) {
  const [expanded, setExpanded] = useState(false);

  const etapes: EtapeExtended[] = (tournee.etapes ?? []) as EtapeExtended[];
  const livrees   = etapes.filter(e => e.statut === 'livree').length;
  const total     = etapes.length;
  const pct       = total > 0 ? Math.round((livrees / total) * 100) : 0;
  const topDouars = etapes.filter(e => e.priorite && e.scoreTopsis !== undefined)
    .sort((a, b) => (b.scoreTopsis ?? 0) - (a.scoreTopsis ?? 0))
    .slice(0, 3);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
      {/* Header de la mission */}
      <div
        className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
            tournee.statut === 'en_cours' ? 'bg-blue-500 animate-pulse' :
            tournee.statut === 'planifiee' ? 'bg-yellow-400' :
            tournee.statut === 'terminee' ? 'bg-green-500' : 'bg-gray-300'
          }`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                {tournee.missionNumero ?? tournee.id}
              </span>
              {tournee.criseId && (
                <span className="text-xs text-gray-400">· {tournee.criseId}</span>
              )}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUT_STYLE[tournee.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                {tournee.statut}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>{total} douar{total > 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{tournee.distanceTotale > 0 ? `${tournee.distanceTotale} km` : '— km'}</span>
              {tournee.distributeur && (
                <><span>·</span><span>{tournee.distributeur.prenom} {tournee.distributeur.nom}</span></>
              )}
            </div>
            {/* Barre de progression */}
            {total > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-400 shrink-0">{livrees}/{total}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <Link
            to="/admin/tournees"
            onClick={e => e.stopPropagation()}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2.5 py-1 rounded-lg border border-brand-200 hover:bg-brand-50 transition-colors"
          >
            Détail
          </Link>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Détail expandable */}
      {expanded && etapes.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-3 bg-gray-50/50 dark:bg-gray-800/20">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Douars prioritaires · Score TOPSIS</p>
          {topDouars.length > 0 && (
            <div className="space-y-2">
              {topDouars.map((etape) => (
                <div key={etape.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {etape.douar?.nom ?? etape.douarNom ?? `Étape ${etape.ordre}`}
                      </p>
                      {etape.douar?.commune && (
                        <p className="text-xs text-gray-400">{etape.douar.commune} · {etape.population?.toLocaleString('fr-FR') ?? '—'} hab.</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {etape.priorite && (
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${PRIORITE_STYLE[etape.priorite] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {etape.priorite}
                        </span>
                      )}
                      {etape.scoreTopsis !== undefined && (
                        <span className="text-xs font-bold text-brand-600 tabular-nums">
                          {(etape.scoreTopsis * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {etape.ressources && (
                    <div className="flex flex-wrap gap-1.5">
                      {etape.ressources.tentes != null && etape.ressources.tentes > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">{etape.ressources.tentes} tentes</span>
                      )}
                      {etape.ressources.vivres != null && etape.ressources.vivres > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded">{etape.ressources.vivres} kits vivres</span>
                      )}
                      {etape.ressources.eau_litres != null && etape.ressources.eau_litres > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-cyan-50 text-cyan-600 rounded">{etape.ressources.eau_litres.toLocaleString('fr-FR')} L</span>
                      )}
                      {etape.ressources.kits_med != null && etape.ressources.kits_med > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded">{etape.ressources.kits_med} kits méd.</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {etapes.length > 3 && (
            <p className="text-xs text-gray-400 text-center">+ {etapes.length - 3} douar(s) supplémentaire(s)</p>
          )}
        </div>
      )}
    </div>
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

type SlideOverType = 'stock' | 'vehicules' | 'missions' | 'terrain' | null;

export default function AdminOverview() {
  const [entrepot,  setEntrepot]  = useState<Entrepot | null>(null);
  const [stocks,    setStocks]    = useState<StockRow[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [tournees,  setTournees]  = useState<Tournee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [slideOver, setSlideOver] = useState<SlideOverType>(null);

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
  const vehiculesDispo = vehicules.filter((v) => v.statut === 'disponible').length;
  const enAttente      = tournees.filter((t) => t.statut === 'planifiee').length;
  const enCours        = tournees.filter((t) => t.statut === 'en_cours').length;
  const recentMouvs    = stocks.slice(0, 5);

  // Livraisons du jour : étapes avec arriveeAt dans les dernières 24 h
  const livraisonsJour = tournees.reduce((acc, t) => {
    const etapes = (t.etapes ?? []) as EtapeExtended[];
    return acc + etapes.filter(e => {
      const arrivee = (e as unknown as { arriveeAt?: string }).arriveeAt;
      if (!arrivee) return false;
      return (Date.now() - new Date(arrivee).getTime()) < 24 * 60 * 60 * 1000;
    }).length;
  }, 0);

  // Prochaines tournées planifiées ET assignées (distributeur présent)
  const prochainesTournees = tournees.filter(
    (t) => t.statut === 'planifiee' && t.distributeur != null,
  ).slice(0, 5);

  // Tendance stock 7 jours : variation ±20 % autour du total actuel (données simulées)
  const stockTotal = stocks.reduce((sum, s) => sum + s.quantite, 0);
  const stockTrend = [0.82, 0.88, 0.79, 0.93, 0.85, 0.91, 1.00].map(
    (f) => Math.round(stockTotal * f),
  );
  const trendMax = Math.max(...stockTrend, 1);

  // ── Contenu des slide-overs ─────────────────────────────────────────────────
  const CATEGORIE_COLOR: Record<string, string> = {
    TENTE: 'bg-blue-50 text-blue-700', EAU: 'bg-cyan-50 text-cyan-700',
    MEDICAMENT: 'bg-red-50 text-red-700', NOURRITURE: 'bg-yellow-50 text-yellow-700',
    EQUIPEMENT: 'bg-purple-50 text-purple-700', AUTRE: 'bg-gray-50 text-gray-600',
  };

  const slideOverContent: Record<NonNullable<SlideOverType>, React.ReactNode> = {
    stock: (
      <>
        {stocks.map(s => {
          const pct = Math.min((s.quantite / Math.max(s.seuilAlerte * 2, 1)) * 100, 100);
          const warn = s.quantite <= s.seuilAlerte;
          return (
            <div key={s.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.materiel.nom}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORIE_COLOR[s.materiel.categorie] ?? 'bg-gray-50 text-gray-600'}`}>
                    {s.materiel.categorie}
                  </span>
                </div>
                <span className={`text-sm font-bold ${warn ? 'text-red-600' : 'text-gray-700 dark:text-white'}`}>
                  {s.quantite} <span className="text-xs font-normal text-gray-400">{s.materiel.unite}</span>
                </span>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Seuil : {s.seuilAlerte}</span>
                  <span>{pct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${warn ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </>
    ),
    vehicules: (
      <>
        {vehicules.map((v: Vehicule) => (
          <div key={v.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold font-mono text-gray-900 dark:text-white">{v.immatriculation}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                v.statut === 'en_mission' ? 'bg-blue-100 text-blue-700' :
                v.statut === 'disponible' ? 'bg-green-100 text-green-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>{v.statut}</span>
            </div>
            <p className="text-xs text-gray-400">{v.type}{(v as unknown as { marque?: string }).marque ? ` · ${(v as unknown as { marque: string }).marque}` : ''}</p>
            {v.distributeur && (
              <p className="text-xs text-gray-500 mt-1">{v.distributeur.prenom} {v.distributeur.nom}</p>
            )}
          </div>
        ))}
      </>
    ),
    missions: (
      <>
        {tournees.filter(t => ['planifiee', 'en_cours'].includes(t.statut)).map(t => {
          const etapesExt = (t.etapes ?? []) as EtapeExtended[];
          const livrees = etapesExt.filter(e => e.statut === 'livree').length;
          return (
            <div key={t.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-gray-900 dark:text-white">
                  {(t as unknown as { missionNumero?: string }).missionNumero ?? t.id}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUT_STYLE[t.statut]}`}>{t.statut}</span>
              </div>
              <p className="text-xs text-gray-500">
                {t.etapes.length} douar{t.etapes.length > 1 ? 's' : ''} · {t.distanceTotale > 0 ? `${t.distanceTotale} km` : '— km'}
                {t.distributeur && <> · {t.distributeur.prenom} {t.distributeur.nom}</>}
              </p>
              {t.statut === 'en_cours' && etapesExt.length > 0 && (
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round((livrees / etapesExt.length) * 100)}%` }} />
                </div>
              )}
            </div>
          );
        })}
        {tournees.filter(t => ['planifiee', 'en_cours'].includes(t.statut)).length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">Aucune mission active</p>
        )}
      </>
    ),
    terrain: (
      <>
        {vehicules.filter(v => v.statut === 'en_mission').map(v => (
          <div key={v.id} className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
              <div>
                <p className="text-sm font-bold font-mono text-gray-900 dark:text-white">{v.immatriculation}</p>
                {v.distributeur && (
                  <p className="text-xs text-gray-500">{v.distributeur.prenom} {v.distributeur.nom}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">GPS actif · En mission</p>
              </div>
            </div>
          </div>
        ))}
        {vehicules.filter(v => v.statut === 'en_mission').length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">Aucun distributeur en terrain</p>
        )}
        <Link to="/admin/suivi" className="block w-full text-center text-xs font-medium text-brand-600 hover:underline py-2">
          Voir la carte en temps réel →
        </Link>
      </>
    ),
  };

  return (
    <div className="space-y-6">
      {/* Slide-overs */}
      {slideOver && (
        <SlideOver
          title={{
            stock: 'Articles en stock',
            vehicules: 'Flotte véhicules',
            missions: 'Missions actives',
            terrain: 'Distributeurs en terrain',
          }[slideOver]}
          subtitle={{
            stock: `${stocks.length} article(s) · ${alertes} en alerte`,
            vehicules: `${vehicules.length} véhicule(s) au total`,
            missions: `${enAttente} en attente · ${enCours} en cours`,
            terrain: `${enMission} en mission actuellement`,
          }[slideOver]}
          onClose={() => setSlideOver(null)}
        >
          {slideOverContent[slideOver]}
        </SlideOver>
      )}

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

      {/* Bannière nouvelles tournées VRP depuis le pipeline */}
      {(() => {
        const vrpCount = tournees.filter((t: any) => t._fromPipeline && t.statut === 'planifiee').length;
        if (vrpCount === 0) return null;
        return (
          <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl px-5 py-3.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">
                {vrpCount} nouvelle{vrpCount > 1 ? 's' : ''} tournée{vrpCount > 1 ? 's' : ''} générée{vrpCount > 1 ? 's' : ''} par le pipeline algorithmique (AHP/TOPSIS/VRP)
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                Rendez-vous dans <strong>Missions</strong> pour assigner les distributeurs et démarrer.
              </p>
            </div>
            <a href="/admin/tournees" className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shrink-0">
              Voir →
            </a>
          </div>
        );
      })()}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              to="/admin/stock"
              label="Articles en alerte"
              value={alertes}
              sub={`${stocks.length} article(s) au total`}
              color={alertes > 0 ? 'text-red-600' : 'text-blue-600'}
              bg={alertes > 0 ? 'bg-red-50' : 'bg-blue-50'}
              onClick={() => setSlideOver('stock')}
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            />
            <KpiCard
              to="/admin/vehicules"
              label="Véhicules disponibles"
              value={vehiculesDispo}
              sub={`${enMission} en mission`}
              color="text-orange-600" bg="bg-orange-50"
              onClick={() => setSlideOver('vehicules')}
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8l5 2v7h-5V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
            />
            <KpiCard
              to="/admin/tournees"
              label="Tournées actives"
              value={enCours}
              sub={`${enAttente} en attente`}
              color="text-purple-600" bg="bg-purple-50"
              onClick={() => setSlideOver('missions')}
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>}
            />
            <KpiCard
              to="/admin/suivi"
              label="Livraisons du jour"
              value={livraisonsJour}
              sub={`${enMission} dist. en terrain`}
              color="text-green-600" bg="bg-green-50"
              onClick={() => setSlideOver('terrain')}
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>}
            />
          </div>

          {/* ── Missions assignées par le Super Admin ── */}
          {tournees.filter(t => t.statut !== 'annulee').length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                    Missions assignées
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Tournées assignées par le Super Admin · Douars prioritaires et besoins</p>
                </div>
                <Link to="/admin/tournees" className="text-xs text-brand-500 hover:underline">
                  Voir tout →
                </Link>
              </div>
              <div className="space-y-3">
                {tournees
                  .filter(t => t.statut !== 'annulee')
                  .map(t => (
                    <MissionAssigneeCard
                      key={t.id}
                      tournee={t as Tournee & { missionNumero?: string; criseId?: string; etapes: EtapeExtended[] }}
                    />
                  ))
                }
              </div>
            </div>
          )}

          {/* ── Tendance stock 7 jours ── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Tendance stock — 7 derniers jours</h2>
                <p className="text-xs text-gray-400 mt-0.5">Évolution du total des quantités en stock (simulation ±20 %)</p>
              </div>
              <span className="text-xs text-gray-400 tabular-nums">{stockTotal.toLocaleString('fr-FR')} unités aujourd'hui</span>
            </div>
            <div className="px-5 py-4">
              {/* Labels jours */}
              {(() => {
                const days = ['J-6','J-5','J-4','J-3','J-2','J-1','Auj.'];
                return (
                  <div className="flex items-end gap-2 h-24">
                    {stockTrend.map((val, i) => {
                      const barH = Math.round((val / trendMax) * 80);
                      const isToday = i === stockTrend.length - 1;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-gray-400 tabular-nums">{val > 999 ? `${(val/1000).toFixed(1)}k` : val}</span>
                          <div
                            className={`w-full rounded-t transition-all ${isToday ? 'bg-brand-500' : 'bg-brand-200 dark:bg-brand-800'}`}
                            style={{ height: `${barH}px` }}
                          />
                          <span className={`text-xs ${isToday ? 'font-bold text-brand-600' : 'text-gray-400'}`}>{days[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── Prochaines tournées planifiées et assignées ── */}
          {prochainesTournees.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Prochaines tournées</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Tournées planifiées avec distributeur assigné — prêtes à démarrer</p>
                </div>
                <Link to="/admin/tournees" className="text-xs text-brand-500 hover:underline">Gérer →</Link>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {prochainesTournees.map((t) => {
                  const nbDouars = t.etapes?.length ?? 0;
                  const dist = t.distributeur;
                  const departEstime = (t as unknown as { departPrevu?: string }).departPrevu;
                  return (
                    <div key={t.id} className="px-5 py-3 flex items-center gap-4">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold font-mono text-gray-900 dark:text-white">
                            {(t as unknown as { missionNumero?: string }).missionNumero ?? t.id}
                          </span>
                          {departEstime && (
                            <span className="text-xs text-gray-400">· Départ {formatDateTime(departEstime)}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {nbDouars} douar{nbDouars > 1 ? 's' : ''}
                          {t.distanceTotale > 0 && ` · ${t.distanceTotale} km`}
                          {dist && ` · ${dist.prenom} ${dist.nom}`}
                        </p>
                      </div>
                      <Link
                        to="/admin/tournees"
                        className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2.5 py-1 rounded-lg border border-brand-200 hover:bg-brand-50 transition-colors shrink-0"
                      >
                        Démarrer
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
