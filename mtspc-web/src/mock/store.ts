/**
 * STORE PARTAGÉ — Pont entre Super Admin et Admin Entrepôt
 * =========================================================
 * Les données mock vivent ici. Le pipeline VRP écrit dedans,
 * les APIs admin entrepôt lisent dedans. Toutes les mutations
 * sont persistées dans localStorage pour survivre aux refresh.
 */

import { TOURNEES_ENTREPOT_A, ENTREPOT_A } from './entrepotA';
import { MOCK_CRISES } from './crises';
import type { Crise } from '../types';

// ── Helpers localStorage ──────────────────────────────────────────────────────

const LS_CRISES   = 'najda_mock_crises';
const LS_TOURNEES = 'najda_mock_tournees';

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // JSON invalide ou localStorage indisponible
  }
  return fallback;
}

function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota dépassé — on continue en mémoire seulement
  }
}

// ── Crises ────────────────────────────────────────────────────────────────────

// Au premier chargement : localStorage → sinon MOCK_CRISES
let _crises: Crise[] = lsGet<Crise[]>(LS_CRISES, [...MOCK_CRISES]);

function saveCrises() { lsSet(LS_CRISES, _crises); }

export const crisesStore = {
  getAll:    (): Crise[] => _crises,
  getActive: (): Crise[] => _crises.filter(c => c.statut === 'active'),

  add: (c: Crise) => {
    _crises = [c, ..._crises];
    saveCrises();
  },

  updateStatut: (id: string, statut: Crise['statut']) => {
    _crises = _crises.map(c =>
      c.id === id
        ? { ...c, statut, clotureeAt: statut === 'cloturee' ? new Date().toISOString() : c.clotureeAt }
        : c
    );
    saveCrises();
  },

  /** Réinitialise aux données mock d'origine (utile en dev) */
  reset: () => {
    _crises = [...MOCK_CRISES];
    localStorage.removeItem(LS_CRISES);
  },
};

// ── Tournées ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _tournees: any[] = lsGet<any[]>(LS_TOURNEES, [...TOURNEES_ENTREPOT_A])
  // Purge les entrées vides (ex: tournee-a-004 supprimée des mocks)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .filter((t: any) => Array.isArray(t.etapes) && t.etapes.length > 0);

function saveTournees() { lsSet(LS_TOURNEES, _tournees); }

// Resynchroniser le localStorage après purge initiale
saveTournees();

export const tourneesStore = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (): any[] => _tournees,

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: (t: any[]) => { _tournees = t; saveTournees(); },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  add: (t: any) => { _tournees = [..._tournees, t]; saveTournees(); },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addMany: (ts: any[]) => { _tournees = [..._tournees, ...ts]; saveTournees(); },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, patch: any) => {
    _tournees = _tournees.map(t => t.id === id ? { ...t, ...patch } : t);
    saveTournees();
  },

  getById: (id: string) => _tournees.find(t => t.id === id) ?? null,

  /** Réinitialise aux données mock d'origine (utile en dev) */
  reset: () => {
    _tournees = [...TOURNEES_ENTREPOT_A];
    localStorage.removeItem(LS_TOURNEES);
  },
};

// ── Convertisseur VrpTournee → Tournee (format adminApi) ─────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function vrpTourneeToAdminTournee(vrp: any, criseId: string, index: number): any {
  const tourneeId  = `tournee-vrp-${Date.now()}-${index}`;
  const missionNum = `MS-VRP-${new Date().getFullYear()}-${String(tourneesStore.getAll().length + index + 1).padStart(3, '0')}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const etapes = (vrp.etapes ?? []).map((e: any, i: number) => ({
    id:             `etape-${tourneeId}-${i + 1}`,
    ordre:          e.ordre ?? (i + 1),
    douarId:        e.douarId,
    douar:          { nom: e.douarNom, commune: '', province: '' },
    douarNom:       e.douarNom,
    lat:            e.latitude  ?? e.lat  ?? ENTREPOT_A.latitude,
    lng:            e.longitude ?? e.lng  ?? ENTREPOT_A.longitude,
    distanceKm:     parseFloat((8 + Math.random() * 12).toFixed(1)),
    tempsEstimeMin: Math.floor(15 + Math.random() * 20),
    priorite:       i === 0 ? 'CRITIQUE' : i < 2 ? 'HAUTE' : 'MOYENNE',
    scoreTopsis:    parseFloat((0.9 - i * 0.1).toFixed(3)),
    population:     e.population ?? 300,
    menages:        Math.ceil((e.population ?? 300) / 5.5),
    statut:         'en_attente' as const,
    ressources: {
      tentes:      Math.floor(Math.ceil((e.population ?? 300) / 5.5) * 0.6),
      couvertures: Math.ceil((e.population ?? 300) / 5.5) * 4,
      vivres:      Math.ceil((e.population ?? 300) / 5.5) * 2,
      kits_med:    Math.floor(Math.ceil((e.population ?? 300) / 5.5) * 0.3),
      eau_litres:  (e.population ?? 300) * 5,
    },
  }));

  return {
    id:                 tourneeId,
    missionId:          `mission-vrp-${tourneeId}`,
    missionNumero:      missionNum,
    entrepotId:         vrp.entrepotId ?? ENTREPOT_A.id,
    entrepot:           { id: vrp.entrepotId ?? ENTREPOT_A.id, nom: vrp.entrepotNom ?? ENTREPOT_A.nom, province: ENTREPOT_A.province },
    vehiculeId:         null,
    distributeur:       null,
    distanceTotale:     vrp.distanceTotale ?? vrp.distanceTotaleKm ?? 0,
    tempsEstime:        vrp.tempsEstime ?? 0,
    tempsEstimeTotalMin:vrp.tempsEstime ?? 0,
    statut:             'planifiee' as const,
    criseId,
    datePlanification:  new Date().toISOString(),
    etapes,
    _fromPipeline:      true,
  };
}
