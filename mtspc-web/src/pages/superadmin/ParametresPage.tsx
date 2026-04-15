/**
 * PAGE PARAMÈTRES — Super Admin
 * Persistance locale via localStorage['najda_superadmin_settings']
 */
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { ParametresSysteme } from '../../types';

// ── Valeurs par défaut ────────────────────────────────────────────────────────

const DEFAULTS: ParametresSysteme = {
  generaux: {
    nomApplication: 'NAJDA',
    langue: 'fr',
    fuseauHoraire: 'Africa/Casablanca',
    logoUrl: null,
    contactEmail: 'support@najda.ma',
    regionCible: 'Béni Mellal-Khénifra',
  },
  algorithmes: {
    ahpMatriceDefaut: {
      comparaisons: {
        vuln_vs_sev: 3,
        vuln_vs_acc: 5,
        vuln_vs_soins: 7,
        sev_vs_acc: 3,
        sev_vs_soins: 5,
        acc_vs_soins: 2,
      },
    },
    lambdasDefaut: { distance: 0.4, temps: 0.3, couverture: 0.3 },
    seuilRcAlerte: 0.10,
    vrpMaxIterations: 500,
    vrpPopulationSize: 100,
  },
  notifications: {
    activerEmailAlertes: true,
    activerSmsAlertes: false,
    activerPushMobile: true,
    delaiRappelMission: 30,
    seuilAlertStock: 20,
    intervalleSupervision: 10,
  },
  logistique: {
    capaciteVehiculeDefaut: 500,
    vitesseMoyenne: 60,
    rayonMaxTournee: 150,
    maxDouarsParTournee: 10,
    dureeMaxTournee: 8,
  },
  securite: {
    dureeSessionMinutes: 480,
    tentativesConnexionMax: 5,
    dureeVerrouillageMinutes: 15,
    forcerMfaAdmins: false,
    journaliserActionsAdmin: true,
  },
  updatedAt: new Date().toISOString(),
  updatedById: '',
};

const SETTINGS_KEY = 'najda_superadmin_settings';

function loadSettings(): ParametresSysteme {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

function saveSettings(s: ParametresSysteme) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// ── Composants utilitaires ────────────────────────────────────────────────────

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
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

function NumberInput({
  label, description, value, onChange, min, max, unit,
}: {
  label: string; description?: string; value: number;
  onChange: (v: number) => void; min?: number; max?: number; unit?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number" min={min} max={max} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-24 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none text-center font-bold"
        />
        {unit && <span className="text-xs text-gray-400">{unit}</span>}
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function ParametresPage() {
  const { user } = useAuth();
  const [p, setP] = useState<ParametresSysteme>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'generaux' | 'algo' | 'notifs' | 'logistique' | 'securite'>('generaux');

  function updateGeneraux<K extends keyof typeof p.generaux>(key: K, value: typeof p.generaux[K]) {
    setP(prev => ({ ...prev, generaux: { ...prev.generaux, [key]: value } }));
  }
  function updateAlgo<K extends keyof typeof p.algorithmes>(key: K, value: typeof p.algorithmes[K]) {
    setP(prev => ({ ...prev, algorithmes: { ...prev.algorithmes, [key]: value } }));
  }
  function updateNotifs<K extends keyof typeof p.notifications>(key: K, value: typeof p.notifications[K]) {
    setP(prev => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }));
  }
  function updateLogistique<K extends keyof typeof p.logistique>(key: K, value: typeof p.logistique[K]) {
    setP(prev => ({ ...prev, logistique: { ...prev.logistique, [key]: value } }));
  }
  function updateSecurite<K extends keyof typeof p.securite>(key: K, value: typeof p.securite[K]) {
    setP(prev => ({ ...prev, securite: { ...prev.securite, [key]: value } }));
  }
  function updateLambda(key: keyof typeof p.algorithmes.lambdasDefaut, value: number) {
    setP(prev => ({
      ...prev,
      algorithmes: {
        ...prev.algorithmes,
        lambdasDefaut: { ...prev.algorithmes.lambdasDefaut, [key]: value },
      },
    }));
  }
  function updateAhp(key: keyof typeof p.algorithmes.ahpMatriceDefaut.comparaisons, value: number) {
    setP(prev => ({
      ...prev,
      algorithmes: {
        ...prev.algorithmes,
        ahpMatriceDefaut: {
          comparaisons: { ...prev.algorithmes.ahpMatriceDefaut.comparaisons, [key]: value },
        },
      },
    }));
  }

  function handleSave() {
    const updated = { ...p, updatedAt: new Date().toISOString(), updatedById: user?.userId ?? '' };
    setP(updated);
    saveSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    setP({ ...DEFAULTS });
  }

  const tabs = [
    { key: 'generaux',    label: 'Général' },
    { key: 'algo',        label: 'Algorithmes' },
    { key: 'notifs',      label: 'Notifications' },
    { key: 'logistique',  label: 'Logistique' },
    { key: 'securite',    label: 'Sécurité' },
  ] as const;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres système</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configuration globale de la plateforme NAJDA</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            Réinitialiser
          </button>
          <button
            onClick={handleSave}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
              saved ? 'bg-green-500 text-white' : 'bg-brand-500 hover:bg-brand-600 text-white'
            }`}
          >
            {saved ? (
              <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Enregistré !</>
            ) : (
              <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Enregistrer</>
            )}
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === t.key
                ? 'bg-white dark:bg-gray-900 text-brand-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Onglet Général ── */}
      {activeTab === 'generaux' && (
        <Card>
          <SectionTitle title="Paramètres généraux" subtitle="Identité et configuration de base de la plateforme" />
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Région cible</label>
              <input
                type="text" value={p.generaux.regionCible}
                onChange={(e) => updateGeneraux('regionCible', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email de contact</label>
              <input
                type="email" value={p.generaux.contactEmail ?? ''}
                onChange={(e) => updateGeneraux('contactEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Langue de l'interface</label>
              <div className="flex gap-2">
                {(['fr', 'ar', 'en'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => updateGeneraux('langue', lang)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                      p.generaux.langue === lang
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {lang === 'fr' ? '🇫🇷 Français' : lang === 'ar' ? '🇲🇦 العربية' : '🇬🇧 English'}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
              Dernière mise à jour : {p.updatedAt ? new Date(p.updatedAt).toLocaleString('fr-FR') : '—'}
            </div>
          </div>
        </Card>
      )}

      {/* ── Onglet Algorithmes ── */}
      {activeTab === 'algo' && (
        <div className="space-y-5">
          <Card>
            <SectionTitle title="Matrice AHP — Poids par défaut" subtitle="Comparaisons par paires des 4 critères (échelle 1–9)" />
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(p.algorithmes.ahpMatriceDefaut.comparaisons) as [keyof typeof p.algorithmes.ahpMatriceDefaut.comparaisons, number][]).map(([key, val]) => (
                <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{key.replace(/_vs_/g, ' / ')}</span>
                  <input
                    type="number" min={1} max={9} step={1} value={val}
                    onChange={(e) => updateAhp(key, parseFloat(e.target.value) || 1)}
                    className="w-16 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-center font-bold focus:border-brand-400 outline-none"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">Critères : Vulnérabilité · Sévérité · Accessibilité · Accès Soins</p>
          </Card>

          <Card>
            <SectionTitle title="Coefficients λ VRP" subtitle="Fonction objectif Z = λ1·Distance + λ2·Temps − λ3·Couverture" />
            <NumberInput label="λ1 — Distance" value={p.algorithmes.lambdasDefaut.distance} onChange={(v) => updateLambda('distance', v)} min={0} max={1} unit="(0–1)" />
            <NumberInput label="λ2 — Temps" value={p.algorithmes.lambdasDefaut.temps} onChange={(v) => updateLambda('temps', v)} min={0} max={1} unit="(0–1)" />
            <NumberInput label="λ3 — Couverture" value={p.algorithmes.lambdasDefaut.couverture} onChange={(v) => updateLambda('couverture', v)} min={0} max={1} unit="(0–1)" />
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Somme λ1+λ2+λ3 = {(p.algorithmes.lambdasDefaut.distance + p.algorithmes.lambdasDefaut.temps + p.algorithmes.lambdasDefaut.couverture).toFixed(2)}
                {Math.abs(p.algorithmes.lambdasDefaut.distance + p.algorithmes.lambdasDefaut.temps + p.algorithmes.lambdasDefaut.couverture - 1) > 0.01
                  ? ' — ⚠️ doit être égal à 1'
                  : ' ✓'}
              </p>
            </div>
          </Card>

          <Card>
            <SectionTitle title="Paramètres VRP" subtitle="Contrôle de l'heuristique d'optimisation" />
            <NumberInput label="Seuil RC AHP" description="Ratio de cohérence max acceptable" value={p.algorithmes.seuilRcAlerte} onChange={(v) => updateAlgo('seuilRcAlerte', v)} min={0.01} max={0.3} unit="" />
            <NumberInput label="Itérations max" description="Nombre max de cycles de l'algorithme" value={p.algorithmes.vrpMaxIterations} onChange={(v) => updateAlgo('vrpMaxIterations', Math.round(v))} min={100} max={5000} unit="iter" />
            <NumberInput label="Taille population" description="Nombre d'individus pour les algorithmes génétiques" value={p.algorithmes.vrpPopulationSize} onChange={(v) => updateAlgo('vrpPopulationSize', Math.round(v))} min={10} max={500} unit="" />
          </Card>
        </div>
      )}

      {/* ── Onglet Notifications ── */}
      {activeTab === 'notifs' && (
        <Card>
          <SectionTitle title="Canaux d'alerte" subtitle="Définissez comment les alertes sont transmises" />
          <ToggleRow label="Alertes par email" description="Envoie un email aux admins concernés" checked={p.notifications.activerEmailAlertes} onChange={(v) => updateNotifs('activerEmailAlertes', v)} />
          <ToggleRow label="Alertes par SMS" description="Envoi SMS (nécessite une intégration opérateur)" checked={p.notifications.activerSmsAlertes} onChange={(v) => updateNotifs('activerSmsAlertes', v)} />
          <ToggleRow label="Notifications push mobile" description="Notifications temps réel sur l'application mobile distributeurs" checked={p.notifications.activerPushMobile} onChange={(v) => updateNotifs('activerPushMobile', v)} />

          <div className="mt-2 pt-4 border-t border-gray-100 dark:border-gray-800">
            <SectionTitle title="Seuils & délais" />
            <NumberInput label="Délai rappel mission" description="Délai avant rappel si une mission n'est pas démarrée" value={p.notifications.delaiRappelMission} onChange={(v) => updateNotifs('delaiRappelMission', Math.round(v))} min={5} max={120} unit="min" />
            <NumberInput label="Seuil alerte stock" description="% de stock en dessous duquel une alerte rupture est levée" value={p.notifications.seuilAlertStock} onChange={(v) => updateNotifs('seuilAlertStock', Math.round(v))} min={5} max={50} unit="%" />
            <NumberInput label="Intervalle supervision SSE" description="Fréquence de rafraîchissement du tableau de supervision" value={p.notifications.intervalleSupervision} onChange={(v) => updateNotifs('intervalleSupervision', Math.round(v))} min={5} max={60} unit="s" />
          </div>
        </Card>
      )}

      {/* ── Onglet Logistique ── */}
      {activeTab === 'logistique' && (
        <Card>
          <SectionTitle title="Paramètres logistiques" subtitle="Contraintes et valeurs par défaut des tournées" />
          <NumberInput label="Capacité véhicule défaut" description="Capacité appliquée aux véhicules non configurés" value={p.logistique.capaciteVehiculeDefaut} onChange={(v) => updateLogistique('capaciteVehiculeDefaut', v)} min={100} unit="kg" />
          <NumberInput label="Vitesse moyenne" description="Utilisée pour estimer la durée des tournées" value={p.logistique.vitesseMoyenne} onChange={(v) => updateLogistique('vitesseMoyenne', v)} min={20} max={120} unit="km/h" />
          <NumberInput label="Rayon max tournée" description="Distance max depuis l'entrepôt" value={p.logistique.rayonMaxTournee} onChange={(v) => updateLogistique('rayonMaxTournee', v)} min={10} max={500} unit="km" />
          <NumberInput label="Douars max / tournée" description="Nombre max de points de livraison par tournée" value={p.logistique.maxDouarsParTournee} onChange={(v) => updateLogistique('maxDouarsParTournee', Math.round(v))} min={2} max={50} unit="" />
          <NumberInput label="Durée max tournée" description="Temps de route maximum par tournée" value={p.logistique.dureeMaxTournee} onChange={(v) => updateLogistique('dureeMaxTournee', v)} min={1} max={24} unit="h" />
        </Card>
      )}

      {/* ── Onglet Sécurité ── */}
      {activeTab === 'securite' && (
        <Card>
          <SectionTitle title="Sécurité & sessions" subtitle="Contrôle d'accès et politique de session" />
          <NumberInput label="Durée de session" description="Délai d'expiration de session inactive" value={p.securite.dureeSessionMinutes} onChange={(v) => updateSecurite('dureeSessionMinutes', Math.round(v))} min={30} max={1440} unit="min" />
          <NumberInput label="Tentatives de connexion max" description="Avant verrouillage du compte" value={p.securite.tentativesConnexionMax} onChange={(v) => updateSecurite('tentativesConnexionMax', Math.round(v))} min={3} max={10} unit="" />
          <NumberInput label="Durée de verrouillage" description="Durée avant déverrouillage automatique" value={p.securite.dureeVerrouillageMinutes} onChange={(v) => updateSecurite('dureeVerrouillageMinutes', Math.round(v))} min={5} max={60} unit="min" />
          <ToggleRow label="Forcer MFA pour les admins" description="Exige une authentification à deux facteurs pour les Admin Entrepôt" checked={p.securite.forcerMfaAdmins} onChange={(v) => updateSecurite('forcerMfaAdmins', v)} />
          <ToggleRow label="Journaliser toutes les actions admin" description="Enregistre chaque action dans le journal d'audit" checked={p.securite.journaliserActionsAdmin} onChange={(v) => updateSecurite('journaliserActionsAdmin', v)} />
        </Card>
      )}
    </div>
  );
}
