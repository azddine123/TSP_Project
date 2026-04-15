/**
 * PAGE UTILISATEURS — Groupement par Entrepôt → Rôle
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { conditionalUsersApi as usersApi, conditionalEntrepotApi as entrepotApi, getApiErrorMessage } from '../../services/api';
import { MOCK_DISTRIBUTEURS } from '../../mock';
import type { AdminEntrepot, CreateAdminEntrepotDto, Entrepot } from '../../types';

// ── Types locaux ───────────────────────────────────────────────────────────────

interface DistributeurRow {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  statut: string;
  entrepotId: string;
}

// ── Modal création ─────────────────────────────────────────────────────────────

function CreateUserModal({
  entrepots, onClose, onCreated,
}: { entrepots: Entrepot[]; onClose: () => void; onCreated: (u: AdminEntrepot) => void }) {
  const [form, setForm] = useState<CreateAdminEntrepotDto>({
    username: '', email: '', firstName: '', lastName: '', password: '', entrepotId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  function set(field: keyof CreateAdminEntrepotDto, value: string) {
    setForm(p => ({ ...p, [field]: value }));
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
    { key: 'username',  label: "Nom d'utilisateur *", placeholder: 'ex: admin.beni_mellal' },
    { key: 'email',     label: 'Email *',              type: 'email', placeholder: 'prenom.nom@najda.ma' },
    { key: 'firstName', label: 'Prénom *',             placeholder: 'Mohamed' },
    { key: 'lastName',  label: 'Nom *',                placeholder: 'Alaoui' },
    { key: 'password',  label: 'Mot de passe initial *', type: 'password', placeholder: '8 caractères minimum' },
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
              <input type={type ?? 'text'} value={form[key] as string} onChange={e => set(key, e.target.value)} placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Entrepôt associé</label>
            <select value={form.entrepotId ?? ''} onChange={e => set('entrepotId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none">
              <option value="">-- Aucun (assignation ultérieure) --</option>
              {entrepots.map(e => <option key={e.id} value={e.id}>{e.nom} · {e.province}</option>)}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Annuler</button>
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
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Annuler</button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-500 hover:bg-brand-600'}`}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm animate-fade-in">
      <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
      {message}
      <button onClick={onClose} className="text-gray-400 hover:text-white ml-1">✕</button>
    </div>
  );
}

// ── Ligne admin ────────────────────────────────────────────────────────────────

function AdminRow({ user, busy, onToggle, onDelete, onReset }: {
  user: AdminEntrepot;
  busy: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
          {(user.firstName?.[0] ?? user.username[0]).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.firstName} {user.lastName}</p>
          <p className="text-xs text-gray-400 font-mono truncate">@{user.username} · {user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${user.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {user.enabled ? 'Actif' : 'Suspendu'}
        </span>
        {busy ? (
          <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={onToggle} title={user.enabled ? 'Suspendre' : 'Activer'}
              className={`p-1.5 rounded-lg transition-colors ${user.enabled ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}>
              {user.enabled
                ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              }
            </button>
            <button onClick={onReset} title="Réinitialiser le mot de passe"
              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
              </svg>
            </button>
            <button onClick={onDelete} title="Supprimer"
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Ligne distributeur (lecture seule) ────────────────────────────────────────

function DistributeurRow({ dist }: { dist: DistributeurRow }) {
  const statusCls: Record<string, string> = {
    disponible: 'bg-green-100 text-green-700',
    en_mission: 'bg-blue-100 text-blue-700',
    inactif:    'bg-gray-100 text-gray-600',
  };
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/30">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-xs font-bold shrink-0">
          {dist.prenom[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{dist.prenom} {dist.nom}</p>
          <p className="text-xs text-gray-400 truncate">{dist.email}</p>
        </div>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusCls[dist.statut] ?? 'bg-gray-100 text-gray-600'}`}>
        {dist.statut.replace('_', ' ')}
      </span>
    </div>
  );
}

// ── Groupe entrepôt ────────────────────────────────────────────────────────────

function EntrepotGroup({
  entrepot, admins, distributeurs, openIds, onToggle, actionId, onAdminToggle, onAdminDelete, onAdminReset, onSetConfirm,
}: {
  entrepot: Entrepot | null;
  admins: AdminEntrepot[];
  distributeurs: DistributeurRow[];
  openIds: Set<string>;
  onToggle: (id: string) => void;
  actionId: string | null;
  onAdminToggle: (u: AdminEntrepot) => void;
  onAdminDelete: (id: string) => void;
  onAdminReset: (id: string, email: string) => void;
  onSetConfirm: (c: { message: string; action: () => void; danger?: boolean }) => void;
}) {
  const groupId = entrepot?.id ?? '__unassigned__';
  const isOpen = openIds.has(groupId);
  const total = admins.length + distributeurs.length;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
      {/* Header groupe */}
      <button
        onClick={() => onToggle(groupId)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">
            {entrepot ? entrepot.nom : 'Non assigné'}
          </span>
          {entrepot && <span className="text-xs text-gray-400">{entrepot.province}</span>}
        </div>
        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-full">
          {total} utilisateur{total !== 1 ? 's' : ''}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {/* Section ADMIN_ENTREPOT */}
          {admins.length > 0 && (
            <div>
              <div className="px-5 py-1.5 bg-brand-50 dark:bg-brand-950/20">
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                  Admin Entrepôt ({admins.length})
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {admins.map(u => (
                  <AdminRow
                    key={u.id}
                    user={u}
                    busy={actionId === u.id}
                    onToggle={() => onSetConfirm({
                      message: u.enabled ? `Suspendre le compte de ${u.username} ?` : `Réactiver le compte de ${u.username} ?`,
                      action: () => onAdminToggle(u),
                    })}
                    onDelete={() => onSetConfirm({
                      message: `Supprimer définitivement le compte "${u.username}" ? Cette action est irréversible.`,
                      action: () => onAdminDelete(u.id),
                      danger: true,
                    })}
                    onReset={() => onSetConfirm({
                      message: `Envoyer un email de réinitialisation du mot de passe à ${u.email} ?`,
                      action: () => onAdminReset(u.id, u.email),
                    })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section DISTRIBUTEUR */}
          {distributeurs.length > 0 && (
            <div>
              <div className="px-5 py-1.5 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Distributeurs ({distributeurs.length})
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {distributeurs.map(d => <DistributeurRow key={d.id} dist={d} />)}
              </div>
            </div>
          )}

          {total === 0 && (
            <p className="px-5 py-4 text-sm text-gray-400 italic">Aucun utilisateur pour cet entrepôt</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users,         setUsers]         = useState<AdminEntrepot[]>([]);
  const [entrepots,     setEntrepots]     = useState<Entrepot[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [confirm,       setConfirm]       = useState<{ message: string; action: () => void; danger?: boolean } | null>(null);
  const [actionId,      setActionId]      = useState<string | null>(null);
  const [toast,         setToast]         = useState<string | null>(null);
  const [openIds,       setOpenIds]       = useState<Set<string>>(new Set());
  const [searchQuery,   setSearchQuery]   = useState('');
  const [filterEntrepot,setFilterEntrepot]= useState('');
  const [filterStatut,  setFilterStatut]  = useState('');
  const [filterRole,    setFilterRole]    = useState('');

  const distributeurs: DistributeurRow[] = MOCK_DISTRIBUTEURS as DistributeurRow[];
  const [liveIndicator, setLiveIndicator] = useState(false);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCount  = useRef(0);   // ref → pas de re-render, utilisé pour détecter les nouveaux comptes

  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(null); }
    try {
      const [u, e] = await Promise.all([usersApi.getAdmins(), entrepotApi.getAll()]);
      // Détecter un nouvel utilisateur ajouté depuis un autre onglet ou poll
      if (prevCount.current > 0 && u.length > prevCount.current) {
        const diff = u.length - prevCount.current;
        setToast(`Nouvel utilisateur ajouté (${diff} nouveau${diff > 1 ? 'x' : ''})`);
        setLiveIndicator(true);
        setTimeout(() => setLiveIndicator(false), 3000);
      }
      prevCount.current = u.length;
      setUsers(u);
      setEntrepots(e);
      if (!silent) {
        // Ouvrir tous les groupes par défaut
        setOpenIds(new Set(['__unassigned__', ...e.map(ent => ent.id)]));
      }
    } catch (e) {
      if (!silent) setError(getApiErrorMessage(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Polling toutes les 8 secondes
    pollRef.current = setInterval(() => load(true), 8000);
    // BroadcastChannel : mise à jour instantanée si un autre onglet modifie les utilisateurs
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('najda_users');
      bc.onmessage = () => load(true);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      bc?.close();
    };
  }, [load]);

  // Recharger après création d'un utilisateur
  const handleUserCreated = useCallback((u: AdminEntrepot) => {
    setUsers(p => [u, ...p]);
    setShowCreate(false);
    setToast(`Compte "${u.username}" créé avec succès dans Keycloak`);
    prevCount.current += 1;
    setLiveIndicator(true);
    setTimeout(() => setLiveIndicator(false), 3000);
  }, []);

  function toggleGroup(id: string) {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleToggle(user: AdminEntrepot) {
    setActionId(user.id);
    try {
      const updated = await usersApi.updateStatut(user.id, { enabled: !user.enabled });
      setUsers(p => p.map(u => u.id === user.id ? updated : u));
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setActionId(null); }
  }

  async function handleDelete(id: string) {
    setActionId(id);
    try {
      await usersApi.delete(id);
      setUsers(p => p.filter(u => u.id !== id));
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setActionId(null); }
  }

  async function handleReset(id: string, email: string) {
    setActionId(id);
    try {
      await usersApi.resetPassword(id);
      setToast(`Email de réinitialisation envoyé à ${email}`);
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setActionId(null); }
  }

  const enabled  = users.filter(u => u.enabled).length;
  const disabled = users.filter(u => !u.enabled).length;

  // Filtrage utilisateurs
  const filteredUsers = users.filter(u => {
    if (filterEntrepot && u.entrepotId !== filterEntrepot) return false;
    if (filterStatut === 'actif'    && !u.enabled)  return false;
    if (filterStatut === 'suspendu' &&  u.enabled)  return false;
    if (filterRole === 'distributeur') return false; // admins seulement
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.username ?? '').toLowerCase().includes(q) ||
        `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredDistributeurs = distributeurs.filter(d => {
    if (filterEntrepot && d.entrepotId !== filterEntrepot) return false;
    if (filterStatut === 'actif'    && d.statut !== 'disponible' && d.statut !== 'en_mission') return false;
    if (filterStatut === 'suspendu' && d.statut !== 'inactif')  return false;
    if (filterRole === 'admin') return false; // admins seulement
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (d.email ?? '').toLowerCase().includes(q) ||
        `${d.prenom ?? ''} ${d.nom ?? ''}`.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const displayedCount = filteredUsers.length + filteredDistributeurs.length;
  const hasFilters = !!(searchQuery || filterEntrepot || filterStatut || filterRole);

  // Groupes : un par entrepôt + un "non assigné"
  const groups = [
    ...entrepots.map(e => ({
      entrepot: e,
      admins: filteredUsers.filter(u => u.entrepotId === e.id),
      distributeurs: filteredDistributeurs.filter(d => d.entrepotId === e.id),
    })),
    {
      entrepot: null,
      admins: filteredUsers.filter(u => !u.entrepotId),
      distributeurs: [] as DistributeurRow[],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Utilisateurs</h1>
            {/* Indicateur temps-réel */}
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full text-xs text-green-700 font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${liveIndicator ? 'bg-green-400 animate-ping' : 'bg-green-400'}`} />
              En direct
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Par entrepôt · Admin Entrepôt & Distributeurs · Actualisation auto toutes les 8 s</p>
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
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Admins Entrepôt', count: users.length,               color: 'text-brand-600',  bg: 'bg-brand-50' },
          { label: 'Distributeurs',   count: distributeurs.length,        color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Comptes actifs',  count: enabled,                     color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Suspendus',       count: disabled,                    color: 'text-red-600',    bg: 'bg-red-50' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-5 flex items-center gap-3`}>
            <p className={`text-3xl font-bold ${color}`}>{count}</p>
            <p className="text-sm text-gray-600">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filtres ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher un utilisateur…"
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none"
            />
          </div>
          {/* Filtre entrepôt */}
          <select
            value={filterEntrepot}
            onChange={e => setFilterEntrepot(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:border-brand-400 outline-none"
          >
            <option value="">Tous les entrepôts</option>
            {entrepots.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
          {/* Filtre statut */}
          <select
            value={filterStatut}
            onChange={e => setFilterStatut(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:border-brand-400 outline-none"
          >
            <option value="">Tous statuts</option>
            <option value="actif">Actif</option>
            <option value="suspendu">Suspendu</option>
          </select>
          {/* Filtre rôle */}
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:border-brand-400 outline-none"
          >
            <option value="">Tous rôles</option>
            <option value="admin">Admin Entrepôt</option>
            <option value="distributeur">Distributeur</option>
          </select>
          {/* Compteur + reset */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500">
              <strong className="text-gray-900 dark:text-white">{displayedCount}</strong> utilisateur{displayedCount !== 1 ? 's' : ''}
            </span>
            {hasFilters && (
              <button
                onClick={() => { setSearchQuery(''); setFilterEntrepot(''); setFilterStatut(''); setFilterRole(''); }}
                className="text-xs text-brand-600 hover:underline font-medium"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Accordéon groupé */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {groups.map(({ entrepot, admins, distributeurs: dists }) => {
            if (admins.length === 0 && dists.length === 0 && entrepot) return null;
            return (
              <EntrepotGroup
                key={entrepot?.id ?? '__unassigned__'}
                entrepot={entrepot}
                admins={admins}
                distributeurs={dists}
                openIds={openIds}
                onToggle={toggleGroup}
                actionId={actionId}
                onAdminToggle={handleToggle}
                onAdminDelete={handleDelete}
                onAdminReset={handleReset}
                onSetConfirm={setConfirm}
              />
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          entrepots={entrepots}
          onClose={() => setShowCreate(false)}
          onCreated={handleUserCreated}
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

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
