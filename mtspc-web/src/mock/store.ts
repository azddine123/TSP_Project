/**
 * STORE PARTAGÉ — Pont entre Super Admin et Admin Entrepôt
 * =========================================================
 * Toutes les opérations vont directement dans localStorage.
 * Pas de variable mémoire intermédiaire → pas de problème HMR / multi-onglets.
 */

import { ENTREPOT_A } from './entrepotA';
import { MOCK_CRISES } from './crises';
import type { Crise } from '../types';

const LS_CRISES   = 'najda_mock_crises';
const LS_TOURNEES = 'najda_mock_tournees';

// ── Helpers ───────────────────────────────────────────────────────────────────

function lsRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

function lsWrite(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

// ── Crises ────────────────────────────────────────────────────────────────────

export const crisesStore = {
  getAll: (): Crise[] =>
    lsRead<Crise[]>(LS_CRISES, [...MOCK_CRISES]),

  getActive: (): Crise[] =>
    crisesStore.getAll().filter(c => c.statut === 'active'),

  add: (c: Crise) => {
    lsWrite(LS_CRISES, [c, ...crisesStore.getAll()]);
  },

  updateStatut: (id: string, statut: Crise['statut']) => {
    const updated = crisesStore.getAll().map(c =>
      c.id === id
        ? { ...c, statut, clotureeAt: statut === 'cloturee' ? new Date().toISOString() : c.clotureeAt }
        : c
    );
    lsWrite(LS_CRISES, updated);
  },

  reset: () => localStorage.removeItem(LS_CRISES),
};

// ── Données de test (seed) — simulant un pipeline VRP déjà exécuté ───────────
// Ces tournées sont visibles dès le premier chargement sans lancer le pipeline.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SEED_TOURNEES: any[] = [
  {
    id: 'tournee-seed-001',
    missionId: 'mission-seed-001',
    missionNumero: 'MS-VRP-2026-001',
    entrepotId: ENTREPOT_A.id,
    entrepot: { id: ENTREPOT_A.id, nom: ENTREPOT_A.nom, province: ENTREPOT_A.province },
    vehiculeId: null,
    distributeur: null,
    distanceTotale: 142.5,
    tempsEstime: 220,
    tempsEstimeTotalMin: 220,
    statut: 'planifiee',
    criseId: 'crise-001',
    datePlanification: '2026-04-10T08:00:00Z',
    ressourcesTotales: { tentes: 58, couvertures: 384, vivres: 192, kits_med: 29, eau_litres: 8250 },
    _fromPipeline: true,
    etapes: [
      {
        id: 'etape-seed-001-1', ordre: 1, douarId: 'douar-s-1',
        douar: { nom: 'Aït Bouali', commune: 'Tabant', province: 'Azilal' },
        latitude: 31.997, longitude: -6.533,
        lat: 31.997, lng: -6.533,
        scoreTopsis: 0.950, population: 650, menages: 118, statut: 'en_attente',
        ressources: { tentes: 15, couvertures: 99, vivres: 49, kits_med: 7, eau_litres: 2125 },
      },
      {
        id: 'etape-seed-001-2', ordre: 2, douarId: 'douar-s-2',
        douar: { nom: 'Zaouiat Ahansal', commune: 'Ahansal', province: 'Azilal' },
        latitude: 31.948, longitude: -6.491,
        lat: 31.948, lng: -6.491,
        scoreTopsis: 0.872, population: 520, menages: 94, statut: 'en_attente',
        ressources: { tentes: 12, couvertures: 79, vivres: 39, kits_med: 6, eau_litres: 1700 },
      },
      {
        id: 'etape-seed-001-3', ordre: 3, douarId: 'douar-s-3',
        douar: { nom: 'Ighil Oufella', commune: 'Tabant', province: 'Azilal' },
        latitude: 31.920, longitude: -6.558,
        lat: 31.920, lng: -6.558,
        scoreTopsis: 0.765, population: 380, menages: 69, statut: 'en_attente',
        ressources: { tentes: 9, couvertures: 58, vivres: 29, kits_med: 5, eau_litres: 1250 },
      },
      {
        id: 'etape-seed-001-4', ordre: 4, douarId: 'douar-s-4',
        douar: { nom: 'Tizi N\'Aït Imi', commune: 'Aït Mhamed', province: 'Azilal' },
        latitude: 31.962, longitude: -6.609,
        lat: 31.962, lng: -6.609,
        scoreTopsis: 0.641, population: 490, menages: 89, statut: 'en_attente',
        ressources: { tentes: 11, couvertures: 75, vivres: 37, kits_med: 5, eau_litres: 1600 },
      },
      {
        id: 'etape-seed-001-5', ordre: 5, douarId: 'douar-s-5',
        douar: { nom: 'Aït Ziri', commune: 'Aït Mhamed', province: 'Azilal' },
        latitude: 31.934, longitude: -6.621,
        lat: 31.934, lng: -6.621,
        scoreTopsis: 0.510, population: 310, menages: 56, statut: 'en_attente',
        ressources: { tentes: 7, couvertures: 47, vivres: 23, kits_med: 3, eau_litres: 1000 },
      },
      {
        id: 'etape-seed-001-6', ordre: 6, douarId: 'douar-s-6',
        douar: { nom: 'Taghat', commune: 'Bzou', province: 'Azilal' },
        latitude: 31.980, longitude: -6.582,
        lat: 31.980, lng: -6.582,
        scoreTopsis: 0.390, population: 215, menages: 39, statut: 'en_attente',
        ressources: { tentes: 4, couvertures: 33, vivres: 16, kits_med: 2, eau_litres: 700 },
      },
    ],
  },
  {
    id: 'tournee-seed-002',
    missionId: 'mission-seed-002',
    missionNumero: 'MS-VRP-2026-002',
    entrepotId: ENTREPOT_A.id,
    entrepot: { id: ENTREPOT_A.id, nom: ENTREPOT_A.nom, province: ENTREPOT_A.province },
    vehiculeId: null,
    distributeur: null,
    distanceTotale: 97.8,
    tempsEstime: 155,
    tempsEstimeTotalMin: 155,
    statut: 'planifiee',
    criseId: 'crise-001',
    datePlanification: '2026-04-10T08:05:00Z',
    ressourcesTotales: { tentes: 38, couvertures: 253, vivres: 126, kits_med: 19, eau_litres: 5425 },
    _fromPipeline: true,
    etapes: [
      {
        id: 'etape-seed-002-1', ordre: 1, douarId: 'douar-s-7',
        douar: { nom: 'Aït Tamlil', commune: 'Aït Tamlil', province: 'Azilal' },
        latitude: 32.025, longitude: -6.498,
        lat: 32.025, lng: -6.498,
        scoreTopsis: 0.905, population: 580, menages: 105, statut: 'en_attente',
        ressources: { tentes: 13, couvertures: 88, vivres: 44, kits_med: 7, eau_litres: 1900 },
      },
      {
        id: 'etape-seed-002-2', ordre: 2, douarId: 'douar-s-8',
        douar: { nom: 'Timoulilt', commune: 'Timoulilt', province: 'Azilal' },
        latitude: 32.004, longitude: -6.472,
        lat: 32.004, lng: -6.472,
        scoreTopsis: 0.800, population: 440, menages: 80, statut: 'en_attente',
        ressources: { tentes: 10, couvertures: 67, vivres: 33, kits_med: 5, eau_litres: 1440 },
      },
      {
        id: 'etape-seed-002-3', ordre: 3, douarId: 'douar-s-9',
        douar: { nom: 'Imi N\'Ifri', commune: 'Demnate', province: 'Azilal' },
        latitude: 31.988, longitude: -6.445,
        lat: 31.988, lng: -6.445,
        scoreTopsis: 0.683, population: 360, menages: 65, statut: 'en_attente',
        ressources: { tentes: 8, couvertures: 55, vivres: 27, kits_med: 4, eau_litres: 1175 },
      },
      {
        id: 'etape-seed-002-4', ordre: 4, douarId: 'douar-s-10',
        douar: { nom: 'Aguerd N\'Ouzrou', commune: 'Bzou', province: 'Azilal' },
        latitude: 32.010, longitude: -6.518,
        lat: 32.010, lng: -6.518,
        scoreTopsis: 0.540, population: 270, menages: 49, statut: 'en_attente',
        ressources: { tentes: 6, couvertures: 41, vivres: 20, kits_med: 3, eau_litres: 870 },
      },
    ],
  },
];

// ── Tournées (VRP pipeline uniquement) ───────────────────────────────────────
// Cache mémoire : partagé dans le même onglet/SPA (survit à la navigation React)
// localStorage : persistance cross-onglets (si non bloqué par le navigateur)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _memTournees: any[] = [];
// Initialisation unique depuis localStorage (lecture seule → pas de side-effect HMR)
try {
  const raw = localStorage.getItem(LS_TOURNEES);
  if (raw) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _memTournees = (JSON.parse(raw) as any[]).filter((t: any) =>
      t._fromPipeline === true && Array.isArray(t.etapes) && t.etapes.length > 0
    );
  }
} catch { /* localStorage indisponible */ }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readVrpTournees(): any[] {
  // Toujours lire localStorage pour avoir les données cross-onglets fraîches
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ls = lsRead<any[]>(LS_TOURNEES, []).filter((t: any) =>
    t._fromPipeline === true && Array.isArray(t.etapes) && t.etapes.length > 0
  );
  if (ls.length > 0) {
    _memTournees = ls; // sync mémoire avec localStorage
    return ls;
  }
  // Fallback : cache mémoire (localStorage indisponible, même onglet)
  if (_memTournees.length > 0) return _memTournees;
  // Fallback final : données de seed pour le test (aucun pipeline lancé)
  return SEED_TOURNEES;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function writeVrpTournees(list: any[]) {
  _memTournees = list; // toujours en mémoire
  lsWrite(LS_TOURNEES, list); // best-effort localStorage
  // Notifier les autres onglets via BroadcastChannel (ne dépend pas de localStorage)
  try {
    const bc = new BroadcastChannel('najda_tournees');
    bc.postMessage({ type: 'updated', count: list.length });
    bc.close();
  } catch { /* navigateur sans support BroadcastChannel */ }
}

/** Notifie les autres onglets qu'une tournée a été ajoutée (appelé aussi par mockApi) */
export function broadcastTourneesUpdate() {
  try {
    const bc = new BroadcastChannel('najda_tournees');
    bc.postMessage({ type: 'updated' });
    bc.close();
  } catch { /* ignore */ }
}

export const tourneesStore = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (): any[] => readVrpTournees(),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: (ts: any[]) => writeVrpTournees(ts),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  add: (t: any) => writeVrpTournees([...readVrpTournees(), t]),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addMany: (ts: any[]) => {
    writeVrpTournees([...readVrpTournees(), ...ts]);
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, patch: any) => {
    writeVrpTournees(readVrpTournees().map(t => t.id === id ? { ...t, ...patch } : t));
  },

  getById: (id: string) => readVrpTournees().find(t => t.id === id) ?? null,

  reset: () => { _memTournees = []; localStorage.removeItem(LS_TOURNEES); },
};

// ── Convertisseur VrpTournee → Tournee (format adminApi) ─────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function vrpTourneeToAdminTournee(vrp: any, criseId: string, index: number): any {
  const tourneeId = `tournee-vrp-${Date.now()}-${index}`;
  const count     = readVrpTournees().length;
  const missionNum = `MS-VRP-${new Date().getFullYear()}-${String(count + index + 1).padStart(3, '0')}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const etapes = (vrp.etapes ?? []).map((e: any, i: number) => ({
    id:             `etape-${tourneeId}-${i + 1}`,
    ordre:          e.ordre ?? (i + 1),
    douarId:        e.douarId,
    douar:          { nom: e.douarNom, commune: '', province: '' },
    douarNom:       e.douarNom,
    lat:            e.latitude ?? e.lat ?? ENTREPOT_A.latitude,
    lng:            e.longitude ?? e.lng ?? ENTREPOT_A.longitude,
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
    id:                  tourneeId,
    missionId:           `mission-vrp-${tourneeId}`,
    missionNumero:       missionNum,
    entrepotId:          ENTREPOT_A.id,
    entrepot:            { id: ENTREPOT_A.id, nom: ENTREPOT_A.nom, province: ENTREPOT_A.province },
    vehiculeId:          null,
    distributeur:        null,
    distanceTotale:      vrp.distanceTotale ?? 0,
    tempsEstime:         vrp.tempsEstime ?? 0,
    tempsEstimeTotalMin: vrp.tempsEstime ?? 0,
    statut:              'planifiee' as const,
    criseId,
    datePlanification:   new Date().toISOString(),
    etapes,
    _fromPipeline:       true,
  };
}
