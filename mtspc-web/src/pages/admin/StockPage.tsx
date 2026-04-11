/**
 * PAGE STOCK & APPROVISIONNEMENT — Admin Entrepôt
 *
 * UX inspirée UNICEF mWIMS : saisie en < 10s par opération.
 * Grands boutons tactiles, présets de quantités, feedback immédiat.
 */
import { useState, useEffect, useCallback } from 'react';
// Import FORCÉ des mocks
import { mockStockApi as stockApi, mockMaterielApi as materielApi } from '../../mock/adminApi';
import { getApiErrorMessage } from '../../services/api';
import type { StockRow, Materiel, StockMouvement, MouvementType } from '../../types';
import { formatDateTime } from '../../constants';

// ── Constantes ────────────────────────────────────────────────────────────────

const MOTIF_OPTIONS = [
  { value: 'reapprovisionnement', label: 'Réapprovisionnement' },
  { value: 'chargement_mission',  label: 'Chargement mission' },
  { value: 'retour_mission',      label: 'Retour mission' },
  { value: 'perte',               label: 'Perte / avarie' },
  { value: 'correction',          label: 'Correction inventaire' },
  { value: 'autre',               label: 'Autre' },
];

const CATEGORIE_COLOR: Record<string, string> = {
  TENTE:      'bg-blue-50   text-blue-700   border-blue-200',
  EAU:        'bg-cyan-50   text-cyan-700   border-cyan-200',
  MEDICAMENT: 'bg-red-50    text-red-700    border-red-200',
  NOURRITURE: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  EQUIPEMENT: 'bg-purple-50 text-purple-700 border-purple-200',
  AUTRE:      'bg-gray-50   text-gray-600   border-gray-200',
};

// ── Barre de jauge stock ──────────────────────────────────────────────────────

function StockGauge({ quantite, seuil }: { quantite: number; seuil: number }) {
  const max  = Math.max(quantite, seuil * 2, 1);
  const pct  = Math.min((quantite / max) * 100, 100);
  const warn = quantite <= seuil;
  const crit = quantite === 0;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={`font-bold text-sm ${crit ? 'text-red-600' : warn ? 'text-orange-500' : 'text-gray-800 dark:text-white'}`}>
          {quantite}
        </span>
        <span className="text-gray-400">seuil {seuil}</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${crit ? 'bg-red-500' : warn ? 'bg-orange-400' : 'bg-green-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Panneau de saisie rapide IN/OUT ───────────────────────────────────────────

const PRESETS = [1, 5, 10, 25, 50, 100];

interface QuickEntryPanelProps {
  stocks:    StockRow[];
  materiels: Materiel[];
  onDone:    (mouv: StockMouvement) => void;
}

function QuickEntryPanel({ stocks, materiels, onDone }: QuickEntryPanelProps) {
  const [type,        setType]       = useState<MouvementType>('ENTREE');
  const [materielId,  setMaterielId] = useState('');
  const [quantite,    setQuantite]   = useState<number | ''>('');
  const [motif,       setMotif]      = useState(MOTIF_OPTIONS[0].value);
  const [referenceDoc,setRef]        = useState('');
  const [saving,      setSaving]     = useState(false);
  const [success,     setSuccess]    = useState(false);
  const [error,       setError]      = useState<string | null>(null);

  // Pré-sélection du premier matériel par défaut
  useEffect(() => {
    if (!materielId && materiels.length > 0) setMaterielId(materiels[0].id);
  }, [materiels, materielId]);

  // Motif par défaut selon le type
  useEffect(() => {
    setMotif(type === 'ENTREE' ? 'reapprovisionnement' : 'chargement_mission');
  }, [type]);

  const currentStock = stocks.find((s) => s.materiel.id === materielId);

  async function handleSubmit() {
    if (!materielId || !quantite || quantite < 1) {
      setError('Sélectionnez un article et une quantité valide.'); return;
    }
    setSaving(true); setError(null);
    try {
      const mouv = await stockApi.createMouvement({
        materielId, type, quantite: Number(quantite),
        motif: motif || undefined,
        referenceDoc: referenceDoc.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      setQuantite('');
      setRef('');
      onDone(mouv);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm p-5 space-y-5">
      <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Saisie rapide</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm flex gap-2">
          {error}<button onClick={() => setError(null)} className="ml-auto shrink-0">✕</button>
        </div>
      )}

      {/* Sélecteur ENTREE / SORTIE — grands boutons tactiles */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setType('ENTREE')}
          className={`py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all ${
            type === 'ENTREE'
              ? 'bg-green-500 border-green-500 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
          }`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          ENTRÉE
        </button>
        <button
          onClick={() => setType('SORTIE')}
          className={`py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all ${
            type === 'SORTIE'
              ? 'bg-orange-500 border-orange-500 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-orange-300'
          }`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
          SORTIE
        </button>
      </div>

      {/* Sélecteur article */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Article</label>
        <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {materiels.map((m) => {
            const st    = stocks.find((s) => s.materiel.id === m.id);
            const alerte = st && st.quantite <= st.seuilAlerte;
            return (
              <button
                key={m.id}
                onClick={() => setMaterielId(m.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left border transition-all ${
                  materielId === m.id
                    ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${alerte ? 'bg-red-500' : 'bg-green-400'}`} />
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">{m.nom}</span>
                {st && <span className="text-xs text-gray-400 shrink-0">{st.quantite} {m.unite}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stock actuel */}
      {currentStock && (
        <div className={`rounded-xl px-4 py-3 border ${
          type === 'ENTREE' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
        }`}>
          <p className="text-xs text-gray-500 mb-1">Stock actuel</p>
          <StockGauge quantite={currentStock.quantite} seuil={currentStock.seuilAlerte} />
          <p className="text-xs text-gray-400 mt-1">{currentStock.materiel.unite}</p>
        </div>
      )}

      {/* Quantité — présets + saisie libre */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quantité</label>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setQuantite(p)}
              className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                quantite === p
                  ? (type === 'ENTREE' ? 'bg-green-500 border-green-500 text-white' : 'bg-orange-500 border-orange-500 text-white')
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          type="number"
          min="1"
          value={quantite}
          onChange={(e) => setQuantite(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)))}
          placeholder="Ou saisir une quantité…"
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none text-center font-bold text-lg"
        />
      </div>

      {/* Motif */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Motif</label>
        <select
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:border-brand-400 outline-none"
        >
          {MOTIF_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Référence doc (optionnel) */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Réf. document <span className="font-normal text-gray-400">(optionnel)</span>
        </label>
        <input
          value={referenceDoc}
          onChange={(e) => setRef(e.target.value)}
          placeholder="N° bon, mission, tournée…"
          className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:border-brand-400 outline-none"
        />
      </div>

      {/* Bouton validation */}
      <button
        onClick={handleSubmit}
        disabled={saving || !materielId || !quantite}
        className={`w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
          success
            ? 'bg-green-500 text-white'
            : type === 'ENTREE'
              ? 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-40'
              : 'bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40'
        }`}
      >
        {saving ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : success ? (
          <><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Enregistré !</>
        ) : (
          <>Valider {type === 'ENTREE' ? 'l\'entrée' : 'la sortie'}{quantite ? ` de ${quantite}` : ''}</>
        )}
      </button>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function StockPage() {
  const [stocks,     setStocks]     = useState<StockRow[]>([]);
  const [materiels,  setMateriels]  = useState<Materiel[]>([]);
  const [mouvements, setMouvements] = useState<StockMouvement[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [tab,        setTab]        = useState<'inventaire' | 'historique'>('inventaire');
  const [mouvPage,   setMouvPage]   = useState(1);
  const [mouvTotal,  setMouvTotal]  = useState(0);
  const [filterType, setFilterType] = useState<'' | 'ENTREE' | 'SORTIE'>('');
  const [loadingMovs, setLoadingMovs] = useState(false);

  const loadStocks = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [s, m] = await Promise.all([stockApi.getMine(), materielApi.getAll()]);
      setStocks(s as StockRow[]); setMateriels(m as Materiel[]);
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  const loadMovements = useCallback(async (page = 1, type?: 'ENTREE' | 'SORTIE') => {
    setLoadingMovs(true);
    try {
      const res = await stockApi.getMouvements({ page, limit: 50, type: type || undefined });
      setMouvements(res.data);
      setMouvTotal(res.meta.total);
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setLoadingMovs(false); }
  }, []);

  useEffect(() => { loadStocks(); }, [loadStocks]);
  useEffect(() => {
    if (tab === 'historique') loadMovements(mouvPage, filterType || undefined);
  }, [tab, mouvPage, filterType, loadMovements]);

  function handleMouvCreated(m: StockMouvement) {
    // Mise à jour optimiste du stock affiché
    setStocks((prev) => prev.map((s) =>
      s.materiel.id === m.materiel.id
        ? { ...s, quantite: m.stockApres, updatedAt: m.createdAt }
        : s,
    ));
    if (tab === 'historique') loadMovements(1, filterType || undefined);
    else setMouvements((prev) => [m, ...prev]);
  }

  const alertes = stocks.filter((s) => s.quantite <= s.seuilAlerte);
  const pages   = Math.ceil(mouvTotal / 50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock & Approvisionnement</h1>
          <p className="text-sm text-gray-500 mt-0.5">Saisie rapide des entrées/sorties · Historique horodaté</p>
        </div>
        <button onClick={loadStocks} disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Actualiser
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2">
          {error}<button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {alertes.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3">
          <svg className="w-5 h-5 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-sm text-red-700 font-medium">
            {alertes.length} article{alertes.length > 1 ? 's' : ''} sous le seuil d'alerte :
            <span className="font-bold"> {alertes.map((s) => s.materiel.nom).join(', ')}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panneau saisie rapide (toujours visible) */}
        <div className="lg:col-span-1">
          {loading ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 flex justify-center">
              <div className="w-7 h-7 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
            </div>
          ) : (
            <QuickEntryPanel stocks={stocks} materiels={materiels} onDone={handleMouvCreated} />
          )}
        </div>

        {/* Panneau principal : inventaire / historique */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
            {/* Onglets */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 px-4">
              {[
                { key: 'inventaire',  label: 'Inventaire',  badge: alertes.length > 0 ? alertes.length : null },
                { key: 'historique',  label: 'Historique mouvements', badge: null },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as 'inventaire' | 'historique')}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.key
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {t.label}
                  {t.badge !== null && t.badge! > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{t.badge}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Inventaire ── */}
            {tab === 'inventaire' && (
              loading ? (
                <div className="flex justify-center py-14">
                  <div className="w-7 h-7 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 text-xs font-semibold uppercase tracking-wider text-left">
                        <th className="px-4 py-3">Article</th>
                        <th className="px-4 py-3">Catégorie</th>
                        <th className="px-4 py-3 w-40">Stock</th>
                        <th className="px-4 py-3">Dernière MAJ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {stocks.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Aucun stock enregistré</td></tr>
                      ) : stocks.map((s) => (
                        <tr key={s.id} className={s.quantite <= s.seuilAlerte ? 'bg-red-50/40 dark:bg-red-950/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-white">{s.materiel.nom}</p>
                            <p className="text-xs text-gray-400">{s.materiel.unite}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${CATEGORIE_COLOR[s.materiel.categorie] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                              {s.materiel.categorie}
                            </span>
                          </td>
                          <td className="px-4 py-3 w-40">
                            <StockGauge quantite={s.quantite} seuil={s.seuilAlerte} />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{formatDateTime(s.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ── Historique mouvements ── */}
            {tab === 'historique' && (
              <>
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex gap-2">
                  {(['', 'ENTREE', 'SORTIE'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => { setFilterType(v); setMouvPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        filterType === v
                          ? v === 'ENTREE' ? 'bg-green-500 text-white' : v === 'SORTIE' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-white dark:bg-white dark:text-gray-900'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {v === '' ? 'Tous' : v}
                    </button>
                  ))}
                  <span className="ml-auto text-xs text-gray-400 self-center">{mouvTotal.toLocaleString('fr-FR')} mouvement(s)</span>
                </div>

                {loadingMovs ? (
                  <div className="flex justify-center py-14">
                    <div className="w-7 h-7 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {mouvements.length === 0 ? (
                        <p className="px-4 py-10 text-center text-sm text-gray-400">Aucun mouvement enregistré</p>
                      ) : mouvements.map((m) => (
                        <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            m.type === 'ENTREE' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                          }`}>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              {m.type === 'ENTREE'
                                ? <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
                                : <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>
                              }
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {m.type === 'ENTREE' ? '+' : '−'}{m.quantite} {m.materiel.unite}
                              </p>
                              <span className="text-xs text-gray-400">→ stock : {m.stockApres}</span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {m.materiel.nom}
                              {m.motif && <span className="text-gray-400"> · {m.motif.replace('_', ' ')}</span>}
                              {m.referenceDoc && <span className="text-gray-400"> · {m.referenceDoc}</span>}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                            <p className="text-xs text-gray-400">{m.acteurNom}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination historique */}
                    {pages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500">
                        <span>{mouvTotal.toLocaleString('fr-FR')} mouvement(s)</span>
                        <div className="flex gap-1">
                          <button onClick={() => setMouvPage((p) => Math.max(1, p - 1))} disabled={mouvPage === 1}
                            className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">←</button>
                          <span className="px-3 py-1 font-medium text-gray-700 dark:text-gray-300">{mouvPage} / {pages}</span>
                          <button onClick={() => setMouvPage((p) => Math.min(pages, p + 1))} disabled={mouvPage >= pages}
                            className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">→</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
