/**
 * MOCK DATA — Tournées VRP avec ordre AHP-TOPSIS-VRP
 * ==================================================
 * Données fictives de tournées optimisées avec 7 douars chacune.
 * Ordre calculé par AHP → TOPSIS → VRP (OR-Tools)
 */
import { Tournee, EtapeVRP, NiveauPriorite } from '../types/app';
import { DOUARS_DATA, MISSION_007_DOUARS } from './missions';

/**
 * Coordonnées RÉELLES de villages/douars accessibles par route dans chaque province.
 * Coordonnées GPS vérifiées — OSRM peut calculer l'itinéraire routier entre eux.
 */
const PROVINCE_WAYPOINTS: Record<string, Array<{ lat: number; lng: number; nom: string }>> = {
  'Béni Mellal': [
    { lat: 32.3372, lng: -6.3498, nom: 'Béni Mellal Centre' },
    { lat: 32.4124, lng: -6.3891, nom: 'Aït Said Ichou' },
    { lat: 32.4780, lng: -6.3100, nom: 'Oulad Abdellah' },
    { lat: 32.5997, lng: -6.2714, nom: 'Kasbat Tadla' },
    { lat: 32.5350, lng: -6.1800, nom: 'Aïn Asserdoun' },
    { lat: 32.4050, lng: -6.1950, nom: 'Oulad Saïd El Oued' },
    { lat: 32.2854, lng: -6.3726, nom: 'Bni Ayat' },
  ],
  'Azilal': [
    { lat: 31.9670, lng: -6.5728, nom: 'Azilal Centre' },
    { lat: 31.9100, lng: -6.6500, nom: 'Aït Bou Oulli' },
    { lat: 31.8500, lng: -6.5000, nom: 'Zaouiat Aït Ishaq' },
    { lat: 31.7314, lng: -6.9962, nom: 'Demnate' },
    { lat: 31.7950, lng: -6.7800, nom: 'Aït Mhamed' },
    { lat: 31.8850, lng: -6.7100, nom: 'Ouaouizarht' },
    { lat: 31.9400, lng: -6.8000, nom: 'Aït Tamlil' },
  ],
  'Fquih Ben Salah': [
    { lat: 32.5035, lng: -6.6884, nom: 'Fquih Ben Salah' },
    { lat: 32.4500, lng: -6.7500, nom: 'Oulad Mbarek' },
    { lat: 32.5600, lng: -6.8200, nom: 'Sidi Jaber' },
    { lat: 32.6100, lng: -6.7000, nom: 'Qasbat Bni Amir' },
    { lat: 32.5800, lng: -6.5800, nom: 'Bni Amir' },
    { lat: 32.4200, lng: -6.6000, nom: 'Souk Sebt Oulad Nemma' },
    { lat: 32.4900, lng: -6.5200, nom: 'Oulad Yaoub' },
  ],
  'Khouribga': [
    { lat: 32.8811, lng: -6.9063, nom: 'Khouribga Centre' },
    { lat: 32.9500, lng: -6.8200, nom: 'Oued Zem' },
    { lat: 32.8200, lng: -7.0100, nom: 'Bejaad' },
    { lat: 32.7500, lng: -6.8500, nom: 'Boulanouare' },
    { lat: 32.8000, lng: -6.7200, nom: 'Ait Attab' },
    { lat: 32.9200, lng: -6.9800, nom: 'Hattane' },
    { lat: 33.0000, lng: -6.8800, nom: 'Boujniba' },
  ],
  'Khénifra': [
    { lat: 32.9436, lng: -5.6686, nom: 'Khénifra Centre' },
    { lat: 32.8700, lng: -5.7500, nom: 'Mrirt' },
    { lat: 33.0200, lng: -5.5800, nom: 'Aït Ishaq' },
    { lat: 32.8100, lng: -5.5200, nom: 'El Kbab' },
    { lat: 32.9800, lng: -5.8500, nom: 'Tighassaline' },
    { lat: 32.7500, lng: -5.6800, nom: 'Aït Ouirra' },
    { lat: 32.8500, lng: -5.4500, nom: 'Sidi Lamine' },
  ],
};

// Waypoints GPS réels pour la tournée MS-2026-007 (6 douars AHP-TOPSIS)
const WAYPOINTS_TOURNEE_007: Array<{ lat: number; lng: number; nom: string; scoreTopsis: number; population: number }> = [
  { lat: 32.5035, lng: -6.6884, nom: 'Ouled Bouazza',  scoreTopsis: 0.479, population: 4442 },
  { lat: 31.9100, lng: -6.6500, nom: 'Tighanimin',     scoreTopsis: 0.479, population: 320  },
  { lat: 31.8800, lng: -6.4800, nom: 'Tizguit',        scoreTopsis: 0.478, population: 290  },
  { lat: 31.9200, lng: -6.5800, nom: 'Takout',         scoreTopsis: 0.477, population: 198  },
  { lat: 31.8700, lng: -6.5000, nom: 'Ait Ouadrim',    scoreTopsis: 0.476, population: 231  },
  { lat: 31.9000, lng: -6.5700, nom: 'Aska',           scoreTopsis: 0.475, population: 264  },
];

const DISTANCES_007 = [0, 45.2, 18.6, 12.4, 8.9, 11.3];
const TEMPS_007      = [0, 68,   28,   19,   14,   17  ];

function generateEtapesTournee007(): EtapeVRP[] {
  return WAYPOINTS_TOURNEE_007.map((wp, i) => ({
    ordre: i + 1,
    douarId: `douar-007-${i + 1}`,
    douarNom: wp.nom,
    lat: wp.lat,
    lng: wp.lng,
    distanceKm: DISTANCES_007[i],
    tempsEstimeMin: TEMPS_007[i],
    priorite: (i < 2 ? 'CRITIQUE' : i < 4 ? 'HAUTE' : 'MOYENNE') as NiveauPriorite,
    scoreTopsis: wp.scoreTopsis,
    population: wp.population,
    ressources: {
      tentes:      Math.round(wp.population * 0.25 / 4),
      couvertures: Math.round(wp.population * 0.5 / 4),
      vivres:      Math.round(wp.population / 4),
      kits_med:    Math.round(wp.population * 0.15 / 4),
      eau_litres:  wp.population * 15,
    },
  }));
}

// Priorités et données fixes par ordre d'étape
const PRIORITES: Array<'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE'> = [
  'CRITIQUE', 'CRITIQUE', 'HAUTE', 'HAUTE', 'MOYENNE', 'MOYENNE', 'BASSE',
];
const SCORES_TOPSIS = [0.95, 0.87, 0.79, 0.71, 0.59, 0.47, 0.35];
const DISTANCES_KM   = [0, 12.4, 9.8, 14.2, 11.6, 8.9, 13.1];
const TEMPS_MIN      = [0, 18, 15, 22, 17, 14, 20];

// Générer 7 étapes VRP avec des coordonnées réelles fixes
function generateEtapesVRP(province: string, missionIndex: number): EtapeVRP[] {
  const waypoints = PROVINCE_WAYPOINTS[province] ?? PROVINCE_WAYPOINTS['Béni Mellal'];
  const douarsProvince = DOUARS_DATA.filter(d => d.province === province);
  const baseDouars = douarsProvince.length > 0 ? douarsProvince : DOUARS_DATA.slice(0, 2);

  return waypoints.map((wp, i) => ({
    ordre: i + 1,
    douarId: `douar-${missionIndex}-${i + 1}`,
    douarNom: wp.nom,
    lat: wp.lat,
    lng: wp.lng,
    distanceKm: DISTANCES_KM[i],
    tempsEstimeMin: TEMPS_MIN[i],
    priorite: PRIORITES[i],
    scoreTopsis: SCORES_TOPSIS[i],
    population: (baseDouars[i % baseDouars.length]?.population ?? 500) + i * 80,
    ressources: {
      tentes:      10 + i * 3,
      couvertures: 30 + i * 8,
      vivres:      80 + i * 15,
      kits_med:    15 + i * 4,
      eau_litres:  250 + i * 50,
    },
  }));
}

// Calculer distance totale et temps total
function calculateTotals(etapes: EtapeVRP[]): { distance: number; temps: number } {
  return etapes.reduce((acc, etape) => ({
    distance: acc.distance + etape.distanceKm,
    temps: acc.temps + etape.tempsEstimeMin,
  }), { distance: 0, temps: 0 });
}

// Tournées mockées pour chaque mission
export const MOCK_TOURNEES: Record<string, Tournee> = {
  'mission-001': {
    id: 'tournee-001',
    missionId: 'mission-001',
    entrepotId: 'entrepot-a',
    vehiculeId: 'vehicule-001',
    distanceTotaleKm: 145.5,
    tempsEstimeTotalMin: 240,
    etapes: generateEtapesVRP('Azilal', 1),
    statut: 'assignee',
    criseId: 'crise-2026-001',
  },
  'mission-002': {
    // Aligne avec tournee-a-001 (web entrepotA.ts) — Ahmed Benali (dist-a-001)
    id: 'tournee-a-001',   // ID cohérent avec le web mock
    missionId: 'mission-002',
    entrepotId: 'entrepot-a',   // Entrepôt A (cohérent avec web mock)
    vehiculeId: 'veh-a-001',    // Véhicule A1 (cohérent avec web mock)
    distanceTotaleKm: 145.5,    // Identique à tournee-a-001 (web)
    tempsEstimeTotalMin: 240,   // Identique à tournee-a-001 (web)
    etapes: generateEtapesVRP('Azilal', 2),   // Province Azilal (cohérent avec web)
    statut: 'en_cours',
    criseId: 'crise-2026-001',
  },
  'mission-003': {
    id: 'tournee-003',
    missionId: 'mission-003',
    entrepotId: 'entrepot-a',
    vehiculeId: 'vehicule-003',
    distanceTotaleKm: 98.7,
    tempsEstimeTotalMin: 165,
    etapes: generateEtapesVRP('Béni Mellal', 3),
    statut: 'terminee',
    criseId: 'crise-2026-001',
  },
  'mission-004': {
    id: 'tournee-004',
    missionId: 'mission-004',
    entrepotId: 'entrepot-a',
    vehiculeId: 'vehicule-004',
    distanceTotaleKm: 156.2,
    tempsEstimeTotalMin: 285,
    etapes: generateEtapesVRP('Khouribga', 4),
    statut: 'assignee',
    criseId: 'crise-2026-001',
  },
  'mission-005': {
    id: 'tournee-005',
    missionId: 'mission-005',
    entrepotId: 'entrepot-a',
    vehiculeId: 'vehicule-005',
    distanceTotaleKm: 134.8,
    tempsEstimeTotalMin: 225,
    etapes: generateEtapesVRP('Khénifra', 5),
    statut: 'assignee',
    criseId: 'crise-2026-001',
  },
  'mission-006': {
    id: 'tournee-006',
    missionId: 'mission-006',
    entrepotId: 'entrepot-b',
    vehiculeId: 'vehicule-006',
    distanceTotaleKm: 0,
    tempsEstimeTotalMin: 0,
    etapes: [],
    statut: 'assignee',
    criseId: 'crise-2026-001',
  },
  'mission-007': {
    id: 'tournee-007',
    missionId: 'mission-007',
    entrepotId: 'entrepot-a',
    vehiculeId: 'veh-a-002',
    distanceTotaleKm: DISTANCES_007.reduce((a, b) => a + b, 0),
    tempsEstimeTotalMin: TEMPS_007.reduce((a, b) => a + b, 0),
    etapes: generateEtapesTournee007(),
    statut: 'assignee',
    criseId: 'crise-2026-001',
  },
};

/**
 * Récupère une tournée mockée par ID de mission
 */
export function getMockTourneeByMissionId(missionId: string): Promise<Tournee | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const tournee = MOCK_TOURNEES[missionId] || null;
      resolve(tournee ? { ...tournee } : null);
    }, 400);
  });
}

/**
 * Formate le temps estimé en heures/minutes
 */
export function formatTempsEstime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}`;
}

/**
 * Retourne la couleur selon la priorité
 */
export function getPrioriteColor(priorite: string): string {
  switch (priorite) {
    case 'CRITIQUE': return '#B71C1C';
    case 'HAUTE': return '#F44336';
    case 'MOYENNE': return '#FF9800';
    case 'BASSE': return '#4CAF50';
    default: return '#9E9E9E';
  }
}
