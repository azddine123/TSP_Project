/**
 * PAGE CRÉATION DE MISSION — Admin Entrepôt
 * Wizard 3 étapes : Infos → Douars → Confirmation
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  mockDistributeurApi,
  mockVehiculeApi,
  mockDouarApi,
  mockTourneeApi,
} from '../../mock/adminApi';
import { getApiErrorMessage } from '../../services/api';
import type { Distributeur, Vehicule } from '../../types';

// ── Types locaux ───────────────────────────────────────────────────────────────

interface Douar {
  id: string;
  nom: string;
  commune: string;
  province: string;
  population: number;
  nbMenages: number;
  coordonnees: { lat: number; lng: number };
  accessibilite: string;
  zoneVulnerable: boolean;
}

interface WizardState {
  distributeurId: string;
  vehiculeId:     string;
  dateDepart:     string;
  description:    string;
  douarIds:       string[];
}

// ── Constantes ────────────────────────────────────────────────────────────────

const ACCESSIBILITE_LABEL: Record<string, string> = {
  piste_bitume:    'Piste bitumée',
  piste_terre:     'Piste en terre',
  piste_difficile: 'Piste difficile',
  sentier:         'Sentier',
};

const ACCESSIBILITE_COLOR: Record<string, string> = {
  piste_bitume:    'bg-green-100 text-green-700',
  piste_terre:     'bg-yellow-100 text-yellow-700',
  piste_difficile: 'bg-orange-100 text-orange-700',
  sentier:         'bg-red-100 text-red-700',
};

// ── Indicateur d'étape ────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = [
    { n: 1, label: 'Informations' },
    { n: 2, label: 'Sélection douars' },
    { n: 3, label: 'Confirmation' },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
              current >= s.n
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}>
              {current > s.n ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : s.n}
            </div>
            <span className={`text-xs mt-1 font-medium hidden sm:block ${current >= s.n ? 'text-brand-600' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-16 sm:w-24 h-0.5 mx-2 mb-5 transition-all ${current > s.n ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Étape 1 : Infos mission ───────────────────────────────────────────────────

function Step1({
  form, setForm, distributeurs, vehicules, onNext,
}: {
  form: WizardState;
  setForm: React.Dispatch<React.SetStateAction<WizardState>>;
  distributeurs: Distributeur[];
  vehicules: Vehicule[];
  onNext: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const disponiblesD = distributeurs.filter(d => (d as unknown as { statut: string }).statut === 'disponible');
  const disponiblesV = vehicules.filter(v => v.statut === 'disponible');

  function validate() {
    if (!form.distributeurId) { setError('Sélectionnez un distributeur.'); return; }
    if (!form.vehiculeId) { setError('Sélectionnez un véhicule.'); return; }
    if (!form.dateDepart) { setError('Indiquez une date de départ estimée.'); return; }
    setError(null);
    onNext();
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2">
          {error}<button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Distributeur *
          <span className="ml-1 font-normal normal-case text-gray-400">({disponiblesD.length} disponible{disponiblesD.length !== 1 ? 's' : ''})</span>
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {disponiblesD.length === 0 ? (
            <p className="text-sm text-orange-500 bg-orange-50 rounded-xl px-4 py-3">Aucun distributeur disponible actuellement.</p>
          ) : disponiblesD.map(d => (
            <button
              key={d.id}
              onClick={() => setForm(f => ({ ...f, distributeurId: d.id }))}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                form.distributeurId === d.id
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                form.distributeurId === d.id ? 'bg-brand-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
                {d.prenom[0]}{d.nom[0]}
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{d.prenom} {d.nom}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Véhicule *
          <span className="ml-1 font-normal normal-case text-gray-400">({disponiblesV.length} disponible{disponiblesV.length !== 1 ? 's' : ''})</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {disponiblesV.length === 0 ? (
            <p className="col-span-2 text-sm text-orange-500 bg-orange-50 rounded-xl px-4 py-3">Aucun véhicule disponible.</p>
          ) : disponiblesV.map(v => (
            <button
              key={v.id}
              onClick={() => setForm(f => ({ ...f, vehiculeId: v.id }))}
              className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                form.vehiculeId === v.id
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="text-xs font-bold font-mono text-gray-900 dark:text-white">{v.immatriculation}</span>
              <span className="text-xs text-gray-400">{v.type}{v.capacite ? ` · ${v.capacite} kg` : ''}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Date de départ estimée *</label>
          <input
            type="datetime-local"
            value={form.dateDepart}
            onChange={e => setForm(f => ({ ...f, dateDepart: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description <span className="font-normal">(optionnel)</span></label>
          <input
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Notes ou instructions particulières"
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={validate}
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2">
          Suivant
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Étape 2 : Sélection des douars ────────────────────────────────────────────

function Step2({
  form, setForm, douars, onNext, onBack,
}: {
  form: WizardState;
  setForm: React.Dispatch<React.SetStateAction<WizardState>>;
  douars: Douar[];
  onNext: () => void;
  onBack: () => void;
}) {
  const [search, setSearch] = useState('');
  const [error,  setError]  = useState<string | null>(null);

  const filtered = douars.filter(d =>
    d.nom.toLowerCase().includes(search.toLowerCase()) ||
    d.commune.toLowerCase().includes(search.toLowerCase())
  );

  function toggleDouar(id: string) {
    setForm(f => ({
      ...f,
      douarIds: f.douarIds.includes(id)
        ? f.douarIds.filter(d => d !== id)
        : [...f.douarIds, id],
    }));
  }

  function validate() {
    if (form.douarIds.length === 0) { setError('Sélectionnez au moins un douar.'); return; }
    setError(null);
    onNext();
  }

  const totalPop = form.douarIds.reduce((sum, id) => {
    const d = douars.find(x => x.id === id);
    return sum + (d?.population ?? 0);
  }, 0);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2">
          {error}<button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-gray-500">
          <span className="font-bold text-brand-600">{form.douarIds.length}</span> douar{form.douarIds.length !== 1 ? 's' : ''} sélectionné{form.douarIds.length !== 1 ? 's' : ''}
          {totalPop > 0 && <> · <span className="font-bold">{totalPop.toLocaleString('fr-FR')}</span> habitants</>}
        </p>
        {form.douarIds.length > 0 && (
          <button onClick={() => setForm(f => ({ ...f, douarIds: [] }))} className="text-xs text-red-500 hover:underline">
            Tout désélectionner
          </button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un douar ou une commune…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-400 outline-none"
        />
      </div>

      {/* Liste des douars */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Aucun douar trouvé</p>
        ) : filtered.map(d => {
          const selected = form.douarIds.includes(d.id);
          const ordre = form.douarIds.indexOf(d.id) + 1;
          return (
            <button
              key={d.id}
              onClick={() => toggleDouar(d.id)}
              className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl border-2 text-left transition-all ${
                selected
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              {/* Numéro d'ordre ou checkbox */}
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                selected ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
              }`}>
                {selected ? ordre : ''}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{d.nom}</span>
                  {d.zoneVulnerable && (
                    <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-medium">Zone vulnérable</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{d.commune} · {d.province}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-gray-500">{d.population.toLocaleString('fr-FR')} hab. · {d.nbMenages} ménages</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${ACCESSIBILITE_COLOR[d.accessibilite] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ACCESSIBILITE_LABEL[d.accessibilite] ?? d.accessibilite}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onBack}
          className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Retour
        </button>
        <button onClick={validate}
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2">
          Suivant
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Étape 3 : Confirmation ────────────────────────────────────────────────────

function Step3({
  form, distributeurs, vehicules, douars, onBack, onSubmit, submitting,
}: {
  form: WizardState;
  distributeurs: Distributeur[];
  vehicules: Vehicule[];
  douars: Douar[];
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const dist = distributeurs.find(d => d.id === form.distributeurId);
  const veh  = vehicules.find(v => v.id === form.vehiculeId);
  const selectedDouars = form.douarIds.map(id => douars.find(d => d.id === id)).filter(Boolean) as Douar[];
  const totalPop = selectedDouars.reduce((s, d) => s + d.population, 0);
  const totalMenages = selectedDouars.reduce((s, d) => s + d.nbMenages, 0);

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-blue-800 mb-1">Résumé de la mission</p>
        <p className="text-xs text-blue-600">Vérifiez les informations avant de créer la mission.</p>
      </div>

      {/* Infos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Distributeur</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {dist ? `${dist.prenom} ${dist.nom}` : '—'}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Véhicule</p>
          <p className="text-sm font-semibold font-mono text-gray-900 dark:text-white">
            {veh ? `${veh.immatriculation} (${veh.type})` : '—'}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Départ estimé</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {form.dateDepart ? new Date(form.dateDepart).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Douars · Population</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {selectedDouars.length} douar{selectedDouars.length > 1 ? 's' : ''} · {totalPop.toLocaleString('fr-FR')} hab.
          </p>
        </div>
      </div>

      {form.description && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Description</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{form.description}</p>
        </div>
      )}

      {/* Liste douars */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Itinéraire ({selectedDouars.length} arrêts · {totalMenages} ménages)
        </p>
        <div className="space-y-1.5">
          {selectedDouars.map((d, i) => (
            <div key={d.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{d.nom}</span>
                <span className="text-xs text-gray-400 ml-2">{d.commune}</span>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{d.population.toLocaleString('fr-FR')} hab.</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} disabled={submitting}
          className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Retour
        </button>
        <button onClick={onSubmit} disabled={submitting}
          className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
          {submitting
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          }
          {submitting ? 'Création…' : 'Créer la mission'}
        </button>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function CreateMissionPage() {
  const navigate = useNavigate();
  const [step,         setStep]         = useState(1);
  const [distributeurs, setDistributeurs] = useState<Distributeur[]>([]);
  const [vehicules,    setVehicules]    = useState<Vehicule[]>([]);
  const [douars,       setDouars]       = useState<Douar[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [submitting,   setSubmitting]   = useState(false);

  const [form, setForm] = useState<WizardState>({
    distributeurId: '',
    vehiculeId:     '',
    dateDepart:     new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    description:    '',
    douarIds:       [],
  });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [d, v, drs] = await Promise.all([
        mockDistributeurApi.getAll(),
        mockVehiculeApi.getMine(),
        mockDouarApi.getAll(),
      ]);
      setDistributeurs(d as Distributeur[]);
      setVehicules(v as unknown as Vehicule[]);
      setDouars(drs as unknown as Douar[]);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit() {
    setSubmitting(true); setError(null);
    try {
      await mockTourneeApi.create({
        distributeurId: form.distributeurId,
        vehiculeId:     form.vehiculeId,
        dateDepart:     form.dateDepart,
        douarIds:       form.douarIds,
        description:    form.description || undefined,
      });
      navigate('/admin/tournees');
    } catch (e) {
      setError(getApiErrorMessage(e));
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/tournees')}
          className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Créer une mission</h1>
          <p className="text-sm text-gray-500">Assignez une tournée de distribution à un distributeur</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2">
          {error}<button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm p-6">
        <StepIndicator current={step} />

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {step === 1 && (
              <Step1
                form={form} setForm={setForm}
                distributeurs={distributeurs} vehicules={vehicules}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <Step2
                form={form} setForm={setForm}
                douars={douars}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <Step3
                form={form}
                distributeurs={distributeurs} vehicules={vehicules} douars={douars}
                onBack={() => setStep(2)}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
