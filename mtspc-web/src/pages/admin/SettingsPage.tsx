/**
 * PAGE PARAMÈTRES — Admin Entrepôt
 * Persistance locale via localStorage['najda_settings']
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { mockEntrepotApi } from '../../mock/adminApi';
import type { Entrepot } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NajdaSettings {
  seuilAlerteDefaut:    number;
  notifStockCritique:   boolean;
  notifNouvelleMission: boolean;
  notifIncident:        boolean;
  modeCompact:          boolean;
  langue:               'fr' | 'ar';
}

const DEFAULTS: NajdaSettings = {
  seuilAlerteDefaut:    10,
  notifStockCritique:   true,
  notifNouvelleMission: true,
  notifIncident:        true,
  modeCompact:          false,
  langue:               'fr',
};

const SETTINGS_KEY = 'najda_settings';

function loadSettings(): NajdaSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

function saveSettings(s: NajdaSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// ── Composants utilitaires ────────────────────────────────────────────────────

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm p-6">
      {children}
    </div>
  );
}

function ToggleRow({
  label, description, checked, onChange,
}: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
          checked ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<NajdaSettings>(loadSettings);
  const [entrepot, setEntrepot] = useState<Entrepot | null>(null);
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    mockEntrepotApi.getMine().then(e => setEntrepot(e as Entrepot)).catch(() => null);
  }, []);

  function update<K extends keyof NajdaSettings>(key: K, value: NajdaSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const lastLogin = user
    ? new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })
    : '—';

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
          <p className="text-sm text-gray-500 mt-0.5">Préférences de votre compte et de l'entrepôt</p>
        </div>
        <button
          onClick={handleSave}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-brand-500 hover:bg-brand-600 text-white'
          }`}
        >
          {saved ? (
            <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Enregistré !</>
          ) : (
            <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Enregistrer</>
          )}
        </button>
      </div>

      {/* ── Section Profil ── */}
      <Card>
        <SectionTitle title="Profil" subtitle="Informations de votre compte Keycloak" />
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-xl">
            {user?.username?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{user?.username ?? '—'}</p>
            <p className="text-sm text-gray-500">{user?.email ?? 'Email non disponible'}</p>
            <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {user?.roles?.includes('ADMIN_ENTREPOT') ? 'Admin Entrepôt' : user?.roles?.[0] ?? 'Utilisateur'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">Identifiant</p>
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">{user?.userId ?? '—'}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">Rôle</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {user?.roles?.join(', ') ?? '—'}
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <p className="text-xs text-gray-400">Changer de mot de passe via le portail Keycloak</p>
          <button className="text-xs font-medium text-brand-600 hover:text-brand-700 px-3 py-1.5 rounded-lg border border-brand-200 hover:bg-brand-50 transition-colors">
            Accéder →
          </button>
        </div>
      </Card>

      {/* ── Section Entrepôt ── */}
      <Card>
        <SectionTitle title="Entrepôt" subtitle="Informations de votre entrepôt assigné" />
        {entrepot ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">Nom</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{entrepot.nom}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">Code</p>
                <p className="text-sm font-mono text-gray-700 dark:text-gray-300">{entrepot.code}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">Province</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{entrepot.province}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">Wilaya</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{entrepot.wilaya}</p>
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Seuil d'alerte stock par défaut
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number" min="0" max="1000"
                  value={settings.seuilAlerteDefaut}
                  onChange={(e) => update('seuilAlerteDefaut', Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-24 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none text-center font-bold"
                />
                <p className="text-xs text-gray-400">unités — appliqué aux nouveaux articles</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
          </div>
        )}
      </Card>

      {/* ── Section Notifications ── */}
      <Card>
        <SectionTitle title="Notifications" subtitle="Choisissez les alertes que vous souhaitez recevoir" />
        <ToggleRow
          label="Alertes stock critique"
          description="Notification quand un article passe sous le seuil d'alerte"
          checked={settings.notifStockCritique}
          onChange={(v) => update('notifStockCritique', v)}
        />
        <ToggleRow
          label="Nouvelles missions assignées"
          description="Notification quand le Super Admin vous assigne une nouvelle tournée"
          checked={settings.notifNouvelleMission}
          onChange={(v) => update('notifNouvelleMission', v)}
        />
        <ToggleRow
          label="Incidents terrain"
          description="Alertes des distributeurs en cours de mission"
          checked={settings.notifIncident}
          onChange={(v) => update('notifIncident', v)}
        />
      </Card>

      {/* ── Section Apparence ── */}
      <Card>
        <SectionTitle title="Apparence" subtitle="Personnalisez l'interface" />
        <ToggleRow
          label="Mode compact"
          description="Réduit la densité des listes et tableaux pour afficher plus d'éléments"
          checked={settings.modeCompact}
          onChange={(v) => update('modeCompact', v)}
        />
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 mt-1">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Langue de l'interface</label>
          <div className="flex gap-2">
            {(['fr', 'ar'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => update('langue', lang)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                  settings.langue === lang
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                }`}
              >
                {lang === 'fr' ? 'Français' : 'العربية'}
              </button>
            ))}
          </div>
          {settings.langue === 'ar' && (
            <p className="text-xs text-orange-500 mt-2">La version arabe est en cours de développement.</p>
          )}
        </div>
      </Card>

      {/* ── Section Sécurité ── */}
      <Card>
        <SectionTitle title="Sécurité" subtitle="Informations de session et contrôle d'accès" />
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Dernière connexion</p>
              <p className="text-xs text-gray-400">{lastLogin}</p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">Session active</span>
          </div>
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              Se déconnecter
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
