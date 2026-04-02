/**
 * PAGE UTILISATEURS — Gestion des comptes Admin Entrepôt (via Keycloak)
 */
import { useState, useEffect, useCallback } from 'react';
import { usersApi, entrepotApi, getApiErrorMessage } from '../../services/api';
import type { AdminEntrepot, CreateAdminEntrepotDto, Entrepot } from '../../types';

// ── Modal création ─────────────────────────────────────────────────────────────

function CreateUserModal({
  entrepots,
  onClose,
  onCreated,
}: { entrepots: Entrepot[]; onClose: () => void; onCreated: (u: AdminEntrepot) => void }) {
  const [form, setForm] = useState<CreateAdminEntrepotDto>({
    username: '', email: '', firstName: '', lastName: '', password: '', entrepotId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  function set(field: keyof CreateAdminEntrepotDto, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit() {
    const required: (keyof CreateAdminEntrepotDto)[] = ['username', 'email', 'firstName', 'lastName', 'password'];
    for (const f of required) {
      if (!form[f]?.toString().trim()) { setError(`Le champ "${f}" est obligatoire.`); return; }
    }
    if (form.password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }

    setSaving(true); setError(null);
    try {
      const user = await usersApi.create({ ...form, entrepotId: form.entrepotId || undefined });
      onCreated(user);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: keyof CreateAdminEntrepotDto; label: string; type?: string; placeholder?: string }[] = [
    { key: 'username',   label: "Nom d'utilisateur *",  placeholder: 'ex: admin.beni_mellal' },
    { key: 'email',      label: 'Email *',               type: 'email', placeholder: 'prenom.nom@protection-civile.ma' },
    { key: 'firstName',  label: 'Prénom *',              placeholder: 'Mohamed' },
    { key: 'lastName',   label: 'Nom *',                 placeholder: 'Alaoui' },
    { key: 'password',   label: 'Mot de passe initial *', type: 'password', placeholder: '8 caractères minimum' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-theme-lg w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Créer un Admin Entrepôt</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}

          {fields.map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
              <input
                type={type ?? 'text'}
                value={form[key] as string}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Entrepôt associé</label>
            <select
              value={form.entrepotId ?? ''}
              onChange={(e) => set('entrepotId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none"
            >
              <option value="">-- Aucun (assignation ultérieure) --</option>
              {entrepots.map((e) => <option key={e.id} value={e.id}>{e.nom} · {e.province}</option>)}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Créer le compte
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm modal ──────────────────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onClose, danger = false }: {
  message: string; onConfirm: () => void; onClose: () => void; danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-theme-lg w-full max-w-sm p-6">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-500 hover:bg-brand-600'}`}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users,      setUsers]      = useState<AdminEntrepot[]>([]);
  const [entrepots,  setEntrepots]  = useState<Entrepot[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirm,    setConfirm]    = useState<{ message: string; action: () => void; danger?: boolean } | null>(null);
  const [actionId,   setActionId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [u, e] = await Promise.all([usersApi.getAdmins(), entrepotApi.getAll()]);
      setUsers(u); setEntrepots(e);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(user: AdminEntrepot) {
    setActionId(user.id);
    try {
      const updated = await usersApi.updateStatut(user.id, { enabled: !user.enabled });
      setUsers((p) => p.map((u) => u.id === user.id ? updated : u));
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(id: string) {
    setActionId(id);
    try {
      await usersApi.delete(id);
      setUsers((p) => p.filter((u) => u.id !== id));
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setActionId(null);
    }
  }

  async function handleResetPassword(id: string) {
    setActionId(id);
    try {
      await usersApi.resetPassword(id);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setActionId(null);
    }
  }

  const enabled  = users.filter((u) => u.enabled).length;
  const disabled = users.filter((u) => !u.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Comptes Admin Entrepôt gérés via Keycloak</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Créer un compte
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}<button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total',    count: users.length, color: 'text-brand-600',  bg: 'bg-brand-50' },
          { label: 'Actifs',   count: enabled,      color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Suspendus', count: disabled,    color: 'text-red-600',    bg: 'bg-red-50' },
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
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Entrepôt</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Créé le</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Aucun Admin Entrepôt créé</td></tr>
                ) : users.map((u) => {
                  const entrepot = entrepots.find((e) => e.id === u.entrepotId);
                  const busy = actionId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                            {(u.firstName?.[0] ?? u.username[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-gray-400 font-mono">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                      <td className="px-4 py-3">
                        {entrepot ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{entrepot.nom}</span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Non assigné</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {u.enabled ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        {busy ? (
                          <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {/* Toggle actif/suspendu */}
                            <button
                              onClick={() => setConfirm({
                                message: u.enabled
                                  ? `Suspendre le compte de ${u.username} ?`
                                  : `Réactiver le compte de ${u.username} ?`,
                                action: () => handleToggle(u),
                              })}
                              title={u.enabled ? 'Suspendre' : 'Activer'}
                              className={`p-1.5 rounded-lg transition-colors ${u.enabled ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}>
                              {u.enabled ? (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                              ) : (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                              )}
                            </button>

                            {/* Reset password */}
                            <button
                              onClick={() => setConfirm({
                                message: `Envoyer un email de réinitialisation du mot de passe à ${u.email} ?`,
                                action: () => handleResetPassword(u.id),
                              })}
                              title="Réinitialiser le mot de passe"
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                              </svg>
                            </button>

                            {/* Supprimer */}
                            <button
                              onClick={() => setConfirm({
                                message: `Supprimer définitivement le compte "${u.username}" ? Cette action est irréversible.`,
                                action: () => handleDelete(u.id),
                                danger: true,
                              })}
                              title="Supprimer"
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          entrepots={entrepots}
          onClose={() => setShowCreate(false)}
          onCreated={(u) => { setUsers((p) => [u, ...p]); setShowCreate(false); }}
        />
      )}

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          danger={confirm.danger}
          onConfirm={confirm.action}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
