/**
 * PAGE FLOTTE VÉHICULES — Admin Entrepôt
 * Gestion des statuts : disponible | en_mission | maintenance
 */
import { useState, useEffect, useCallback } from 'react';
import { vehiculeApi, distributeurApi, getApiErrorMessage } from '../../services/api';
import type { Vehicule, Distributeur, VehiculeStatut, VehiculeType, CreateVehiculeDto } from '../../types';

const STATUT_CONFIG: Record<VehiculeStatut, { label: string; color: string; dot: string }> = {
  disponible:  { label: 'Disponible',  color: 'bg-green-100  text-green-700',  dot: 'bg-green-500'  },
  en_mission:  { label: 'En mission',  color: 'bg-blue-100   text-blue-700',   dot: 'bg-blue-500 animate-pulse'   },
  maintenance: { label: 'Maintenance', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
};

const TYPE_ICON: Record<VehiculeType, React.ReactNode> = {
  CAMION: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8l5 2v7h-5V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  PICKUP: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l3 6H5v8z"/><path d="M14 17v-3h8v3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  '4X4':  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 17h18M5 17V9l3-5h8l3 5v8"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg>,
  MOTO:   <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6l3 6H9l3-6h3z"/><path d="M12 12v-4"/></svg>,
};

// ── Modal création véhicule ───────────────────────────────────────────────────

function CreateVehiculeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (v: Vehicule) => void }) {
  const [form, setForm] = useState<CreateVehiculeDto>({ immatriculation: '', type: 'CAMION' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleSubmit() {
    if (!form.immatriculation.trim()) { setError('Immatriculation obligatoire.'); return; }
    setSaving(true); setError(null);
    try {
      const v = await vehiculeApi.create(form);
      onCreated(v);
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-theme-lg w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Ajouter un véhicule</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Immatriculation *</label>
              <input value={form.immatriculation} onChange={(e) => setForm((f) => ({ ...f, immatriculation: e.target.value.toUpperCase() }))}
                placeholder="12345-A-67" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none uppercase" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type *</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as VehiculeType }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:border-brand-400 outline-none">
                {(['CAMION', 'PICKUP', '4X4', 'MOTO'] as VehiculeType[]).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Marque</label>
              <input value={form.marque ?? ''} onChange={(e) => setForm((f) => ({ ...f, marque: e.target.value || undefined }))}
                placeholder="Toyota, Iveco…" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Capacité (kg)</label>
              <input type="number" min="0" value={form.capacite ?? ''} onChange={(e) => setForm((f) => ({ ...f, capacite: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="ex: 1500" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
            <textarea value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || undefined }))}
              rows={2} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none resize-none"
              placeholder="État, particularités…" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Annuler</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Carte véhicule ────────────────────────────────────────────────────────────

function VehiculeCard({
  vehicule, distributeurs, updating,
  onStatut, onDelete,
}: {
  vehicule: Vehicule;
  distributeurs: Distributeur[];
  updating: string | null;
  onStatut: (id: string, statut: VehiculeStatut, distributeurId?: string) => void;
  onDelete: (id: string) => void;
}) {
  const cfg    = STATUT_CONFIG[vehicule.statut];
  const icon   = TYPE_ICON[vehicule.type];
  const isUpd  = updating === vehicule.id;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
            {icon}
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white font-mono">{vehicule.immatriculation}</p>
            <p className="text-xs text-gray-400">{vehicule.type}{vehicule.marque ? ` · ${vehicule.marque}` : ''}{vehicule.capacite ? ` · ${vehicule.capacite} kg` : ''}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {vehicule.distributeur && (
        <p className="text-xs text-gray-500 mb-3">
          <span className="font-medium">{vehicule.distributeur.prenom} {vehicule.distributeur.nom}</span>
        </p>
      )}

      {isUpd ? (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {vehicule.statut !== 'disponible' && (
            <button onClick={() => onStatut(vehicule.id, 'disponible')}
              className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              Disponible
            </button>
          )}
          {vehicule.statut !== 'maintenance' && (
            <button onClick={() => onStatut(vehicule.id, 'maintenance')}
              className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors">
              Maintenance
            </button>
          )}
          <button onClick={() => onDelete(vehicule.id)}
            className="ml-auto px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VehiculesPage() {
  const [vehicules,    setVehicules]    = useState<Vehicule[]>([]);
  const [distributeurs, setDistributeurs] = useState<Distributeur[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [updating,     setUpdating]     = useState<string | null>(null);
  const [confirmDel,   setConfirmDel]   = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState<'' | VehiculeStatut>('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [v, d] = await Promise.all([vehiculeApi.getMine(), distributeurApi.getAll()]);
      setVehicules(v); setDistributeurs(d);
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleStatut(id: string, statut: VehiculeStatut, distributeurId?: string) {
    setUpdating(id);
    try {
      const updated = await vehiculeApi.updateStatut(id, { statut, distributeurId });
      setVehicules((prev) => prev.map((v) => v.id === id ? updated : v));
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setUpdating(null); }
  }

  async function handleDelete(id: string) {
    setUpdating(id);
    try {
      await vehiculeApi.remove(id);
      setVehicules((prev) => prev.filter((v) => v.id !== id));
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setUpdating(null); setConfirmDel(null); }
  }

  const filtered = filterStatut ? vehicules.filter((v) => v.statut === filterStatut) : vehicules;

  const stats = {
    disponible:  vehicules.filter((v) => v.statut === 'disponible').length,
    en_mission:  vehicules.filter((v) => v.statut === 'en_mission').length,
    maintenance: vehicules.filter((v) => v.statut === 'maintenance').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flotte Véhicules</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestion et statuts des véhicules de votre entrepôt</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Actualiser
          </button>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Ajouter
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2">
          {error}<button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {(Object.entries(stats) as [VehiculeStatut, number][]).map(([statut, count]) => (
          <button key={statut} onClick={() => setFilterStatut(filterStatut === statut ? '' : statut)}
            className={`rounded-2xl p-5 flex items-center gap-3 transition-all border-2 ${
              filterStatut === statut ? 'border-brand-400' : 'border-transparent'
            } ${STATUT_CONFIG[statut].color.includes('green') ? 'bg-green-50' : STATUT_CONFIG[statut].color.includes('blue') ? 'bg-blue-50' : 'bg-yellow-50'}`}>
            <p className={`text-3xl font-bold ${STATUT_CONFIG[statut].color.split(' ')[1]}`}>{count}</p>
            <p className="text-sm text-gray-600">{STATUT_CONFIG[statut].label}</p>
          </button>
        ))}
      </div>

      {/* Grille véhicules */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-16 text-center">
          <p className="text-gray-400">{vehicules.length === 0 ? 'Aucun véhicule enregistré' : 'Aucun véhicule dans ce statut'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <VehiculeCard
              key={v.id}
              vehicule={v}
              distributeurs={distributeurs}
              updating={updating}
              onStatut={handleStatut}
              onDelete={(id) => setConfirmDel(id)}
            />
          ))}
        </div>
      )}

      {/* Modal création */}
      {showCreate && (
        <CreateVehiculeModal
          onClose={() => setShowCreate(false)}
          onCreated={(v) => { setVehicules((prev) => [...prev, v]); setShowCreate(false); }}
        />
      )}

      {/* Modal confirmation suppression */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-theme-lg w-full max-w-sm p-6 text-center space-y-4">
            <p className="text-base font-semibold text-gray-900 dark:text-white">Supprimer ce véhicule ?</p>
            <p className="text-sm text-gray-500">Cette action est irréversible.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDel(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={() => handleDelete(confirmDel)}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg flex items-center gap-2">
                {updating === confirmDel && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
