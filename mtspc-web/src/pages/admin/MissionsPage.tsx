/**
 * PAGE ORDRES TERRAIN — Admin Entrepôt
 * ======================================
 * Vue centralisée de toutes les missions assignées par le Super Admin.
 * Liens complets : stock (ressources), véhicules, distributeurs, suivi terrain.
 * Actions : assigner, démarrer, mettre à jour étapes, terminer, annuler.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  mockTourneeApi,
  mockVehiculeApi,
  mockDistributeurApi,
} from '../../mock/adminApi';
import { STOCK_ENTREPOT_A, VEHICULES_ENTREPOT_A } from '../../mock/entrepotA';
import { getApiErrorMessage } from '../../services/api';

// ── Types étendus ─────────────────────────────────────────────────────────────

interface Ressources {
  tentes?: number; couvertures?: number; vivres?: number;
  kits_med?: number; eau_litres?: number;
}
interface Etape {
  id: string; ordre: number; douarNom?: string;
  douar?: { nom: string; commune: string; province: string };
  priorite?: string; scoreTopsis?: number;
  population?: number; menages?: number;
  ressources?: Ressources; statut: string;
  lat?: number; lng?: number; distanceKm?: number; tempsEstimeMin?: number;
  arriveeAt?: string | null;
}
interface Mission {
  id: string; missionNumero?: string; criseId?: string;
  statut: string; distanceTotale: number; tempsEstime: number;
  distributeur?: { id: string; nom: string; prenom: string } | null;
  vehiculeId?: string | null;
  entrepot: { id: string; nom: string; province: string };
  etapes: Etape[];
  dateDebut?: string; demarreeAt?: string; termineeAt?: string;
  datePlanification?: string;
}
interface Distributeur { id: string; nom: string; prenom: string; statut: string; vehiculeAssigneId?: string }
interface Vehicule { id: string; immatriculation: string; type: string; statut: string; capaciteKg?: number }

// ── Constantes visuelles ──────────────────────────────────────────────────────

const STATUT_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  planifiee: { label: 'Planifiée',  badge: 'bg-yellow-100 text-yellow-700 border border-yellow-200', dot: 'bg-yellow-400' },
  en_cours:  { label: 'En cours',   badge: 'bg-blue-100 text-blue-700 border border-blue-200',       dot: 'bg-blue-500 animate-pulse' },
  terminee:  { label: 'Terminée',   badge: 'bg-green-100 text-green-700 border border-green-200',    dot: 'bg-green-500' },
  annulee:   { label: 'Annulée',    badge: 'bg-gray-100 text-gray-500 border border-gray-200',       dot: 'bg-gray-300' },
};

const PRIORITE_BADGE: Record<string, string> = {
  CRITIQUE: 'bg-red-100 text-red-700 border border-red-200',
  HAUTE:    'bg-orange-100 text-orange-700 border border-orange-200',
  MOYENNE:  'bg-yellow-100 text-yellow-700 border border-yellow-200',
  BASSE:    'bg-green-100 text-green-700 border border-green-200',
};

const ETAPE_STATUT: Record<string, { label: string; cls: string }> = {
  en_attente: { label: 'En attente', cls: 'bg-gray-100 text-gray-500' },
  en_route:   { label: 'En route',   cls: 'bg-blue-100 text-blue-700' },
  livree:     { label: 'Livré',      cls: 'bg-green-100 text-green-700' },
  echec:      { label: 'Echec',      cls: 'bg-red-100 text-red-600' },
};

// ── Ressources totales d'une mission ─────────────────────────────────────────

function sumRessources(etapes: Etape[]): Ressources {
  return etapes.reduce((acc, e) => {
    if (!e.ressources) return acc;
    return {
      tentes:     (acc.tentes     ?? 0) + (e.ressources.tentes     ?? 0),
      vivres:     (acc.vivres     ?? 0) + (e.ressources.vivres     ?? 0),
      eau_litres: (acc.eau_litres ?? 0) + (e.ressources.eau_litres ?? 0),
      kits_med:   (acc.kits_med   ?? 0) + (e.ressources.kits_med   ?? 0),
      couvertures:(acc.couvertures ?? 0)+ (e.ressources.couvertures ?? 0),
    };
  }, {} as Ressources);
}

// ── Mini modal d'assignation ──────────────────────────────────────────────────

function AssignModal({
  mission, distributeurs, vehicules, onClose, onSaved,
}: {
  mission: Mission;
  distributeurs: Distributeur[];
  vehicules: Vehicule[];
  onClose: () => void;
  onSaved: (updated: Mission) => void;
}) {
  const [distId,   setDistId]   = useState(mission.distributeur?.id ?? '');
  const [vehId,    setVehId]    = useState(mission.vehiculeId ?? '');
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  const dispos = distributeurs.filter(d => d.statut === 'disponible' || d.id === mission.distributeur?.id);
  const vehDispos = vehicules.filter(v => v.statut === 'disponible' || v.id === mission.vehiculeId);

  async function save() {
    if (!distId) { setErr('Sélectionnez un distributeur'); return; }
    setSaving(true); setErr('');
    try {
      const updated = await mockTourneeApi.assignerDistributeur(mission.id, { distributeurId: distId, vehiculeId: vehId || undefined });
      onSaved(updated as Mission);
    } catch (e) { setErr(getApiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Assigner la mission</h3>
              <p className="text-xs text-gray-400">{mission.missionNumero ?? mission.id}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="px-5 py-4 space-y-4">
            {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Distributeur <span className="text-red-500">*</span></label>
              <select value={distId} onChange={e => setDistId(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                <option value="">— Choisir —</option>
                {dispos.map(d => (
                  <option key={d.id} value={d.id}>{d.prenom} {d.nom} ({d.statut})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Véhicule</label>
              <select value={vehId} onChange={e => setVehId(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                <option value="">— Non assigné —</option>
                {vehDispos.map(v => (
                  <option key={v.id} value={v.id}>{v.immatriculation} · {v.type} {v.capaciteKg ? `(${v.capaciteKg} kg)` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="px-5 pb-4 flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Annuler</button>
            <button onClick={save} disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl disabled:opacity-50 transition-colors">
              {saving ? 'Enregistrement...' : 'Confirmer'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Carte mission ─────────────────────────────────────────────────────────────

function MissionCard({
  mission, distributeurs, vehicules,
  onUpdate,
}: {
  mission: Mission;
  distributeurs: Distributeur[];
  vehicules: Vehicule[];
  onUpdate: (m: Mission) => void;
}) {
  const navigate = useNavigate();
  const [expanded,    setExpanded]    = useState(false);
  const [assigning,   setAssigning]   = useState(false);
  const [actionBusy,  setActionBusy]  = useState(false);

  const etapes   = useMemo(() => [...mission.etapes].sort((a, b) => a.ordre - b.ordre), [mission.etapes]);
  const livrees  = etapes.filter(e => e.statut === 'livree').length;
  const total    = etapes.length;
  const pct      = total > 0 ? Math.round(livrees / total * 100) : 0;
  const res      = useMemo(() => sumRessources(etapes), [etapes]);
  const popTotal = etapes.reduce((s, e) => s + (e.population ?? 0), 0);

  const vehicule = vehicules.find(v => v.id === mission.vehiculeId);
  const cfg      = STATUT_CONFIG[mission.statut] ?? STATUT_CONFIG.planifiee;

  async function handleDemarrer() {
    setActionBusy(true);
    try {
      const updated = await mockTourneeApi.demarrer(mission.id);
      onUpdate(updated as Mission);
    } finally { setActionBusy(false); }
  }

  async function handleTerminer() {
    if (!confirm(`Marquer la mission ${mission.missionNumero ?? mission.id} comme terminée ?`)) return;
    setActionBusy(true);
    try {
      const updated = await mockTourneeApi.terminer(mission.id);
      onUpdate(updated as Mission);
    } finally { setActionBusy(false); }
  }

  async function handleAnnuler() {
    if (!confirm('Annuler cette mission ?')) return;
    setActionBusy(true);
    try {
      const updated = await mockTourneeApi.annuler(mission.id);
      onUpdate(updated as unknown as Mission);
    } finally { setActionBusy(false); }
  }

  async function toggleEtape(etape: Etape) {
    const next = etape.statut === 'livree' ? 'en_attente' : etape.statut === 'en_route' ? 'livree' : 'en_route';
    setActionBusy(true);
    try {
      const updated = await mockTourneeApi.updateEtapeStatut(mission.id, etape.id, next);
      onUpdate(updated as Mission);
    } finally { setActionBusy(false); }
  }

  // Ressources — lien vers stock (quels articles sont disponibles)
  const stockLink = (nom: string) => {
    const item = STOCK_ENTREPOT_A.find(s => s.materiel.nom.toLowerCase().includes(nom.toLowerCase()));
    return item ? { nom: item.materiel.nom, qte: item.quantite, unite: item.materiel.unite, alerte: item.quantite <= item.seuilAlerte } : null;
  };

  return (
    <>
      <div className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-theme-sm overflow-hidden transition-all ${
        mission.statut === 'annulee' ? 'opacity-60 border-gray-200 dark:border-gray-800' : 'border-gray-200 dark:border-gray-800'
      }`}>
        {/* ── Header ── */}
        <div
          className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
          onClick={() => setExpanded(e => !e)}
        >
          {/* Dot statut */}
          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />

          {/* Infos principales */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                {mission.missionNumero ?? mission.id}
              </span>
              {mission.criseId && (
                <span className="text-xs text-gray-400">· {mission.criseId}</span>
              )}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
              {mission.statut === 'en_cours' && <span className="text-xs text-blue-500 font-medium">{pct}%</span>}
            </div>

            {/* Résumé */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
              <span>{total} douar{total !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{mission.distanceTotale > 0 ? `${mission.distanceTotale.toFixed(1)} km` : '— km'}</span>
              {popTotal > 0 && <><span>·</span><span>{popTotal.toLocaleString('fr-FR')} hab.</span></>}
              {mission.distributeur
                ? <><span>·</span><span className="font-medium text-gray-700 dark:text-gray-300">{mission.distributeur.prenom} {mission.distributeur.nom}</span></>
                : <><span>·</span><span className="text-orange-500 font-medium">Non assigné</span></>
              }
              {vehicule && <><span>·</span><span>{vehicule.immatriculation}</span></>}
            </div>

            {/* Barre de progression */}
            {total > 0 && mission.statut !== 'planifiee' && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 shrink-0 tabular-nums">{livrees}/{total}</span>
              </div>
            )}
          </div>

          {/* Actions rapides */}
          <div className="flex items-center gap-2 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
            {/* Planifiée sans distributeur → Assigner */}
            {mission.statut === 'planifiee' && !mission.distributeur && (
              <button
                onClick={() => setAssigning(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors"
              >
                Assigner
              </button>
            )}
            {/* Planifiée avec distributeur → Démarrer */}
            {mission.statut === 'planifiee' && mission.distributeur && total > 0 && (
              <button
                onClick={handleDemarrer}
                disabled={actionBusy}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                Démarrer
              </button>
            )}
            {/* En cours → voir carte */}
            {mission.statut === 'en_cours' && (
              <button
                onClick={() => navigate('/admin/suivi')}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                Voir carte
              </button>
            )}
            {/* Annuler (planifiee / en_cours) */}
            {(mission.statut === 'planifiee' || mission.statut === 'en_cours') && (
              <button
                onClick={handleAnnuler}
                disabled={actionBusy}
                title="Annuler"
                className="p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </button>
            )}
            {/* Chevron expand */}
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        {/* ── Détail expandable ── */}
        {expanded && (
          <div className="border-t border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-800">

              {/* Colonne 1 : Étapes / Timeline */}
              <div className="p-4 md:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Étapes ({livrees}/{total})
                  </p>
                  {mission.statut === 'en_cours' && livrees === total && total > 0 && (
                    <button
                      onClick={handleTerminer}
                      disabled={actionBusy}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                    >
                      Terminer
                    </button>
                  )}
                </div>
                {etapes.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Aucune étape définie</p>
                ) : (
                  <div className="space-y-1.5">
                    {etapes.map((etape, idx) => {
                      const es = ETAPE_STATUT[etape.statut] ?? ETAPE_STATUT.en_attente;
                      const nom = etape.douar?.nom ?? etape.douarNom ?? `Étape ${idx + 1}`;
                      return (
                        <div key={etape.id} className="flex items-center gap-2 group">
                          {/* Numéro */}
                          <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                            {etape.ordre}
                          </div>
                          {/* Nom + commune */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{nom}</p>
                            {etape.douar?.commune && <p className="text-[10px] text-gray-400 truncate">{etape.douar.commune}</p>}
                          </div>
                          {/* Priorité */}
                          {etape.priorite && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${PRIORITE_BADGE[etape.priorite] ?? ''}`}>
                              {etape.priorite.slice(0, 3)}
                            </span>
                          )}
                          {/* Statut cliquable (si en cours) */}
                          <button
                            onClick={() => mission.statut === 'en_cours' && toggleEtape(etape)}
                            disabled={mission.statut !== 'en_cours' || actionBusy}
                            title={mission.statut === 'en_cours' ? 'Changer le statut' : ''}
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${es.cls} ${
                              mission.statut === 'en_cours' ? 'cursor-pointer hover:opacity-75' : 'cursor-default'
                            }`}
                          >
                            {es.label}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Colonne 2 : Ressources nécessaires (lien stock) */}
              <div className="p-4 md:col-span-1">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                  Ressources requises
                </p>
                <div className="space-y-2">
                  {[
                    { key: 'tentes',     label: 'Tentes familiales', val: res.tentes,     match: 'Tentes' },
                    { key: 'vivres',     label: 'Kits vivres',       val: res.vivres,     match: 'alimentaires' },
                    { key: 'eau',        label: 'Eau potable',       val: res.eau_litres, match: 'Eau', unit: 'L' },
                    { key: 'kits_med',   label: 'Kits médicaux',     val: res.kits_med,   match: 'médicaux' },
                    { key: 'couv',       label: 'Couvertures',       val: res.couvertures,match: 'Couvertures' },
                  ].filter(r => (r.val ?? 0) > 0).map(r => {
                    const stock = stockLink(r.match);
                    return (
                      <div key={r.key} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{r.label}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums">
                            {(r.val ?? 0).toLocaleString('fr-FR')} {r.unit ?? ''}
                          </span>
                          {stock && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              stock.alerte ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                            }`} title={`Stock : ${stock.qte} ${stock.unite}`}>
                              {stock.alerte ? 'Alerte' : 'OK'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!res.tentes && !res.vivres && !res.eau_litres && !res.kits_med && (
                    <p className="text-xs text-gray-400 italic">Aucune ressource calculée</p>
                  )}
                </div>
                <Link
                  to="/admin/stock"
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 group"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  Voir le stock
                  <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
              </div>

              {/* Colonne 3 : Véhicule + Distributeur + Liens */}
              <div className="p-4 md:col-span-1 space-y-4">
                {/* Distributeur */}
                <div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Distributeur</p>
                  {mission.distributeur ? (
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-700 dark:text-brand-400 text-xs font-bold shrink-0">
                        {mission.distributeur.prenom[0]}{mission.distributeur.nom[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{mission.distributeur.prenom} {mission.distributeur.nom}</p>
                        <button
                          onClick={() => setAssigning(true)}
                          className="text-[10px] text-brand-600 hover:underline"
                        >
                          Réassigner
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAssigning(true)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors"
                    >
                      + Assigner un distributeur
                    </button>
                  )}
                </div>

                {/* Véhicule */}
                <div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Véhicule</p>
                  {vehicule ? (
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8l5 2v7h-5V8z"/>
                          <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{vehicule.immatriculation}</p>
                        <p className="text-xs text-gray-400">{vehicule.type} {vehicule.capaciteKg ? `· ${vehicule.capaciteKg} kg` : ''}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Aucun véhicule assigné</p>
                  )}
                </div>

                {/* Liens rapides */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                  <Link to="/admin/vehicules"
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-gray-200 dark:border-gray-700 flex items-center gap-1 transition-colors">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8l5 2v7h-5V8z"/>
                      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                    Flotte
                  </Link>
                  <Link to="/admin/suivi"
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-gray-200 dark:border-gray-700 flex items-center gap-1 transition-colors">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                      <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
                    </svg>
                    Carte
                  </Link>
                  <Link to="/admin/stock"
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-gray-200 dark:border-gray-700 flex items-center gap-1 transition-colors">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    Stock
                  </Link>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Modal assignation */}
      {assigning && (
        <AssignModal
          mission={mission}
          distributeurs={distributeurs}
          vehicules={vehicules}
          onClose={() => setAssigning(false)}
          onSaved={(updated) => { onUpdate(updated); setAssigning(false); }}
        />
      )}
    </>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

const TABS = [
  { key: '',          label: 'Toutes'    },
  { key: 'planifiee', label: 'Planifiées'},
  { key: 'en_cours',  label: 'En cours'  },
  { key: 'terminee',  label: 'Terminées' },
  { key: 'annulee',   label: 'Annulées'  },
];

export default function MissionsPage() {
  const navigate = useNavigate();
  const [missions,      setMissions]      = useState<Mission[]>([]);
  const [distributeurs, setDistributeurs] = useState<Distributeur[]>([]);
  const [vehicules,     setVehicules]     = useState<Vehicule[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [tab,           setTab]           = useState('');
  const [search,        setSearch]        = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [t, d, v] = await Promise.all([
        mockTourneeApi.getMine(),
        mockDistributeurApi.getAll(),
        mockVehiculeApi.getMine(),
      ]);
      setMissions(t as unknown as Mission[]);
      setDistributeurs(d as unknown as Distributeur[]);
      setVehicules(v as unknown as Vehicule[]);
    } catch (e) { setError(getApiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = missions;
    if (tab)    list = list.filter(m => m.statut === tab);
    if (search) list = list.filter(m =>
      (m.missionNumero ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (m.criseId ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (m.distributeur ? `${m.distributeur.prenom} ${m.distributeur.nom}`.toLowerCase().includes(search.toLowerCase()) : false)
    );
    return list;
  }, [missions, tab, search]);

  // Stats
  const stats = useMemo(() => ({
    total:     missions.length,
    planifiee: missions.filter(m => m.statut === 'planifiee').length,
    enCours:   missions.filter(m => m.statut === 'en_cours').length,
    terminee:  missions.filter(m => m.statut === 'terminee').length,
    sansAssign:missions.filter(m => m.statut === 'planifiee' && !m.distributeur).length,
  }), [missions]);

  function handleUpdate(updated: Mission) {
    setMissions(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ordres Terrain</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Missions assignées par le Super Admin · Gestion complète des tournées
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Actualiser
          </button>
          <button
            onClick={() => navigate('/admin/tournees/create')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouvelle mission
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2">
          {error}<button onClick={() => setError(null)} className="ml-auto">x</button>
        </div>
      )}

      {/* ── Stats KPI ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total missions',    value: stats.total,     color: 'text-gray-900 dark:text-white',   bg: 'bg-white dark:bg-gray-900' },
          { label: 'Planifiées',        value: stats.planifiee, color: 'text-yellow-700',                  bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
          { label: 'En cours',          value: stats.enCours,   color: 'text-blue-700',                    bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Terminées',         value: stats.terminee,  color: 'text-green-700',                   bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3`}>
            <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color} mt-0.5`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Alerte missions non assignées */}
      {stats.sansAssign > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
          <p className="text-sm text-orange-700">
            <span className="font-semibold">{stats.sansAssign} mission{stats.sansAssign > 1 ? 's' : ''}</span>
            {' '}n'ont pas encore de distributeur assigné.
          </p>
          <button onClick={() => setTab('planifiee')} className="ml-auto text-xs font-semibold text-orange-700 underline">
            Voir
          </button>
        </div>
      )}

      {/* ── Filtres ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tabs statut */}
        <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 gap-0.5">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                tab === t.key
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {t.label}
              {t.key && (
                <span className="ml-1.5 text-[10px] font-bold opacity-60">
                  {missions.filter(m => t.key === '' || m.statut === t.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Recherche */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher mission, crise, distributeur..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
      </div>

      {/* ── Liste missions ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-12 text-center">
          <p className="text-sm text-gray-400">Aucune mission trouvée.</p>
          {tab && <button onClick={() => { setTab(''); setSearch(''); }} className="mt-2 text-xs text-brand-600 underline">Effacer les filtres</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <MissionCard
              key={m.id}
              mission={m}
              distributeurs={distributeurs}
              vehicules={VEHICULES_ENTREPOT_A as unknown as Vehicule[]}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
