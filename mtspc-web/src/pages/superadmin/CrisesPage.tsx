/**
 * PAGE CRISES — Activation, gestion et suivi des crises
 */
import { useState, useEffect, useCallback } from 'react';
import { criseApi, douarApi, getApiErrorMessage } from '../../services/api';
import type { Crise, Douar, CreateCriseDto, CriseType, CriseStatut } from '../../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<CriseType, string> = {
  SEISME:     'Séisme',
  INONDATION: 'Inondation',
  GLISSEMENT: 'Glissement',
  SECHERESSE: 'Sécheresse',
  AUTRE:      'Autre',
};

const STATUT_BADGE: Record<CriseStatut, string> = {
  active:    'bg-red-100 text-red-700',
  suspendue: 'bg-yellow-100 text-yellow-700',
  cloturee:  'bg-gray-100 text-gray-500',
};

const STATUT_DOT: Record<CriseStatut, string> = {
  active:    'bg-red-500',
  suspendue: 'bg-yellow-400',
  cloturee:  'bg-gray-400',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

// ── Composant sévérité douar ───────────────────────────────────────────────────

interface SeveriteRow {
  douarId:       string;
  severite:      number;
  vulnerabilite: number;
  accessibilite: number;
  accesSoins:    number;
}

// ── Modal création ─────────────────────────────────────────────────────────────

function CreateCriseModal({
  douars,
  onClose,
  onCreated,
}: {
  douars: Douar[];
  onClose: () => void;
  onCreated: (c: Crise) => void;
}) {
  const [type,        setType]        = useState<CriseType>('SEISME');
  const [zone,        setZone]        = useState('');
  const [description, setDescription] = useState('');
  const [selected,    setSelected]    = useState<SeveriteRow[]>([]);
  const [search,      setSearch]      = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const filteredDouars = douars.filter((d) =>
    d.nom.toLowerCase().includes(search.toLowerCase()) ||
    d.commune.toLowerCase().includes(search.toLowerCase()),
  );

  function toggleDouar(d: Douar) {
    setSelected((prev) => {
      if (prev.find((r) => r.douarId === d.id)) return prev.filter((r) => r.douarId !== d.id);
      return [...prev, { douarId: d.id, severite: 5, vulnerabilite: 0.5, accessibilite: 0.5, accesSoins: 0.5 }];
    });
  }

  function updateRow(douarId: string, field: keyof Omit<SeveriteRow, 'douarId'>, value: number) {
    setSelected((prev) => prev.map((r) => r.douarId === douarId ? { ...r, [field]: value } : r));
  }

  async function handleSubmit() {
    if (!zone.trim()) { setError('La zone est obligatoire.'); return; }
    if (selected.length === 0) { setError('Sélectionnez au moins un douar affecté.'); return; }
    setSaving(true); setError(null);
    try {
      const dto: CreateCriseDto = { type, zone, description: description || undefined, severitesParDouar: selected };
      const crise = await criseApi.create(dto);
      onCreated(crise);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-theme-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Déclarer une Crise</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tous les champs marqués * sont obligatoires</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/></svg>
              {error}
            </div>
          )}

          {/* Type + Zone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type de crise *</label>
              <select value={type} onChange={(e) => setType(e.target.value as CriseType)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none">
                {(Object.keys(TYPE_LABELS) as CriseType[]).map((k) => (
                  <option key={k} value={k}>{TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Zone géographique *</label>
              <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="ex: Province de Béni Mellal"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none resize-none"
              placeholder="Contexte, gravité estimée, premiers constats…" />
          </div>

          {/* Sélection douars */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Douars affectés * <span className="text-gray-400 font-normal">({selected.length} sélectionné(s))</span>
              </label>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…"
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:border-brand-400 outline-none w-48" />
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {filteredDouars.slice(0, 50).map((d) => {
                  const checked = selected.some((r) => r.douarId === d.id);
                  return (
                    <label key={d.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${checked ? 'bg-brand-50 dark:bg-brand-950' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleDouar(d)}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-400" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{d.nom}</p>
                        <p className="text-xs text-gray-400">{d.commune} · {d.province}</p>
                      </div>
                      <span className="ml-auto text-xs text-gray-400">{d.population.toLocaleString()} hab.</span>
                    </label>
                  );
                })}
                {filteredDouars.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">Aucun résultat</p>
                )}
              </div>
            </div>
          </div>

          {/* Scores par douar */}
          {selected.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scores de sévérité par douar</p>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 text-left">
                      <th className="px-3 py-2 font-semibold">Douar</th>
                      <th className="px-3 py-2 font-semibold">Sévérité (0–10)</th>
                      <th className="px-3 py-2 font-semibold">Vulnérabilité (0–1)</th>
                      <th className="px-3 py-2 font-semibold">Accessibilité (0–1)</th>
                      <th className="px-3 py-2 font-semibold">Accès soins (0–1)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {selected.map((row) => {
                      const d = douars.find((x) => x.id === row.douarId);
                      return (
                        <tr key={row.douarId}>
                          <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{d?.nom ?? row.douarId.slice(0, 8)}</td>
                          {(['severite', 'vulnerabilite', 'accessibilite', 'accesSoins'] as const).map((field) => (
                            <td key={field} className="px-3 py-1.5">
                              <input type="number" value={row[field]}
                                min={field === 'severite' ? 0 : 0}
                                max={field === 'severite' ? 10 : 1}
                                step={field === 'severite' ? 1 : 0.1}
                                onChange={(e) => updateRow(row.douarId, field, parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none text-center" />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Déclarer la crise
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function CrisesPage() {
  const [crises,  setCrises]  = useState<Crise[]>([]);
  const [douars,  setDouars]  = useState<Douar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [c, d] = await Promise.all([criseApi.getAll(), douarApi.getAll()]);
      setCrises(c); setDouars(d);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleStatut(id: string, statut: 'suspendue' | 'cloturee') {
    try {
      const updated = await criseApi.updateStatut(id, statut);
      setCrises((prev) => prev.map((c) => c.id === id ? updated : c));
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }

  const active = crises.filter((c) => c.statut === 'active');

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Crises</h1>
          <p className="text-sm text-gray-500 mt-0.5">Activation, suivi et clôture des crises humanitaires</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Déclarer une crise
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Crise active banner */}
      {active.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-400">{active[0].reference} — EN COURS</p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70">{TYPE_LABELS[active[0].type]} · {active[0].zone}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleStatut(active[0].id, 'suspendue')}
              className="px-3 py-1.5 text-xs font-semibold text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors">
              Suspendre
            </button>
            <button onClick={() => handleStatut(active[0].id, 'cloturee')}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Clôturer
            </button>
          </div>
        </div>
      )}

      {/* Table crises */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Historique des crises</h2>
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">{crises.length}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 text-left text-xs font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">Douars</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Déclenché le</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {crises.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Aucune crise enregistrée</td></tr>
                ) : crises.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white text-xs">{c.reference}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                        {TYPE_LABELS[c.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[180px] truncate">{c.zone}</td>
                    <td className="px-4 py-3 text-gray-500">{c.severitesParDouar.length} douar(s)</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUT_BADGE[c.statut]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUT_DOT[c.statut]}`} />
                        {c.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      {c.statut === 'active' && (
                        <div className="flex gap-1.5">
                          <button onClick={() => handleStatut(c.id, 'suspendue')}
                            className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors">
                            Suspendre
                          </button>
                          <button onClick={() => handleStatut(c.id, 'cloturee')}
                            className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                            Clôturer
                          </button>
                        </div>
                      )}
                      {c.statut === 'suspendue' && (
                        <span className="text-xs text-gray-400 italic">Suspendue</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateCriseModal
          douars={douars}
          onClose={() => setShowCreate(false)}
          onCreated={(c) => { setCrises((prev) => [c, ...prev]); setShowCreate(false); }}
        />
      )}
    </div>
  );
}
