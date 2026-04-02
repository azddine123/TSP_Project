/**
 * PAGE INCIDENTS — Signalement et gestion des événements terrain
 */
import { useState, useEffect, useCallback } from 'react';
import { criseApi, evenementApi, getApiErrorMessage } from '../../services/api';
import type { Crise, Evenement, CreateEvenementDto, EvenementType, EvenementSeverite } from '../../types';

const TYPE_LABELS: Record<EvenementType, string> = {
  INCIDENT_TERRAIN: 'Incident terrain',
  RUPTURE_STOCK:    'Rupture stock',
  VEHICULE_PANNE:   'Panne véhicule',
  ROUTE_BLOQUEE:    'Route bloquée',
  ALERTE_PUSH:      'Alerte push',
  RECALCUL_DEMANDE: 'Recalcul demandé',
};

const SEVERITE_BADGE: Record<EvenementSeverite, string> = {
  info:     'bg-blue-100 text-blue-700',
  warning:  'bg-yellow-100 text-yellow-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUT_BADGE: Record<string, string> = {
  ouvert:        'bg-red-100 text-red-700',
  en_traitement: 'bg-yellow-100 text-yellow-700',
  resolu:        'bg-green-100 text-green-700',
};

function CreateEvenementModal({
  criseId,
  onClose,
  onCreated,
}: { criseId: string; onClose: () => void; onCreated: (e: Evenement) => void }) {
  const [type,        setType]        = useState<EvenementType>('INCIDENT_TERRAIN');
  const [severite,    setSeverite]    = useState<EvenementSeverite>('warning');
  const [titre,       setTitre]       = useState('');
  const [description, setDescription] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  async function handleSubmit() {
    if (!titre.trim() || !description.trim()) { setError('Titre et description obligatoires.'); return; }
    setSaving(true); setError(null);
    try {
      const dto: CreateEvenementDto = { criseId, type, severite, titre, description };
      const ev = await evenementApi.create(dto);
      onCreated(ev);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-theme-lg w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Signaler un Incident</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type *</label>
              <select value={type} onChange={(e) => setType(e.target.value as EvenementType)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none">
                {(Object.keys(TYPE_LABELS) as EvenementType[]).map((k) => (
                  <option key={k} value={k}>{TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Sévérité *</label>
              <select value={severite} onChange={(e) => setSeverite(e.target.value as EvenementSeverite)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Titre *</label>
            <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex: Route D1001 coupée suite aux pluies"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none resize-none"
              placeholder="Détails, localisation précise, impact estimé…" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Signaler
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function IncidentsPage() {
  const [crises,      setCrises]      = useState<Crise[]>([]);
  const [criseId,     setCriseId]     = useState('');
  const [evenements,  setEvenements]  = useState<Evenement[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [updating,    setUpdating]    = useState<string | null>(null);

  useEffect(() => {
    criseApi.getAll()
      .then((c) => {
        const active = c.filter((x) => x.statut !== 'cloturee');
        setCrises(active);
        if (active.length > 0) setCriseId(active[0].id);
      })
      .catch((e) => setError(getApiErrorMessage(e)));
  }, []);

  const loadEvenements = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const r = await evenementApi.getByCrise(id);
      setEvenements(r.data);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (criseId) loadEvenements(criseId); }, [criseId, loadEvenements]);

  async function handleUpdateStatut(id: string, statut: 'ouvert' | 'en_traitement' | 'resolu') {
    setUpdating(id);
    try {
      const updated = await evenementApi.updateStatut(id, statut);
      setEvenements((prev) => prev.map((e) => e.id === id ? updated : e));
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setUpdating(null);
    }
  }

  const ouverts  = evenements.filter((e) => e.statut === 'ouvert').length;
  const traites  = evenements.filter((e) => e.statut === 'en_traitement').length;
  const resolus  = evenements.filter((e) => e.statut === 'resolu').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Incidents & Alertes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Suivi et résolution des événements terrain</p>
        </div>
        <div className="flex gap-2">
          <select value={criseId} onChange={(e) => setCriseId(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none">
            <option value="">Sélectionner une crise</option>
            {crises.map((c) => <option key={c.id} value={c.id}>{c.reference} · {c.zone}</option>)}
          </select>
          {criseId && (
            <button onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Signaler
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}<button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ouverts',       count: ouverts, color: 'text-red-600',    bg: 'bg-red-50' },
          { label: 'En traitement', count: traites, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Résolus',       count: resolus, color: 'text-green-600',  bg: 'bg-green-50' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-5 flex items-center gap-3`}>
            <p className={`text-3xl font-bold ${color}`}>{count}</p>
            <p className="text-sm text-gray-600">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 text-xs font-semibold uppercase tracking-wider text-left">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Sévérité</th>
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Signalé par</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {evenements.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {criseId ? 'Aucun incident pour cette crise' : 'Sélectionnez une crise'}
                  </td></tr>
                ) : evenements.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-mono rounded-full">{TYPE_LABELS[ev.type as EvenementType] ?? ev.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${SEVERITE_BADGE[ev.severite as EvenementSeverite] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ev.severite}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{ev.titre}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">{ev.description}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{ev.signaleParNom ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(ev.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUT_BADGE[ev.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ev.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {updating === ev.id ? (
                        <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                      ) : ev.statut === 'ouvert' ? (
                        <div className="flex gap-1.5">
                          <button onClick={() => handleUpdateStatut(ev.id, 'en_traitement')}
                            className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors">
                            Traiter
                          </button>
                          <button onClick={() => handleUpdateStatut(ev.id, 'resolu')}
                            className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                            Résoudre
                          </button>
                        </div>
                      ) : ev.statut === 'en_traitement' ? (
                        <button onClick={() => handleUpdateStatut(ev.id, 'resolu')}
                          className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                          Résoudre
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && criseId && (
        <CreateEvenementModal
          criseId={criseId}
          onClose={() => setShowCreate(false)}
          onCreated={(ev) => { setEvenements((prev) => [ev, ...prev]); setShowCreate(false); }}
        />
      )}
    </div>
  );
}
