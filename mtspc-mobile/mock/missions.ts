/**
 * MOCK DATA — Missions de test pour le développement
 * ===================================================
 * Données fictives basées sur les données HCP (Haut Commissariat au Plan)
 * des douars de la région Béni Mellal-Khénifra 2024.
 *
 * CORRESPONDANCE WEB ↔ MOBILE :
 * ─────────────────────────────────────────────────────────────────────────────
 * mission-001 (pending)     ↔  tournee-a-002 (planifiee)  — Youssef Alaoui  — Azilal
 * mission-002 (in_progress) ↔  tournee-a-001 (en_cours)   — Ahmed Benali    — Azilal   (dist-a-001)
 * mission-003 (completed)   ↔  tournee-a-003 (terminee)   — Karim Oulhaj    — Béni Mellal
 * mission-004 (pending)     ↔  tournee-a-004 (planifiee)  — non assigné     — Khouribga
 * mission-005 (pending)     ↔  (hors entrepôt A)          — non assigné     — Khénifra
 * mission-006 (annulee)     ↔  (annulée — pas de tournée) — —               — Azilal
 * mission-007 (pending)     ↔  tournee-007 (assignee)    — Ahmed Benali    — Azilal/FBS  (non signée)
 * ─────────────────────────────────────────────────────────────────────────────
 * Douars de référence : mtspc-web/src/mock/douars.ts  (16 douars réels)
 * Entrepôt principal : mtspc-web/src/mock/entrepotA.ts (TOURNEES_ENTREPOT_A)
 */
import { Mission } from '../types/app';

export interface MissionItem {
  id: string;
  materielNom: string;
  quantitePrevue: number;
  unite: string;
}

export interface DouarInfo {
  codeGeo: string;           // Code géographique du douar
  region: string;            // Région
  province: string;          // Province
  commune: string;           // Commune rurale
  fraction: string;          // Fraction/Municipalité
  douar: string;             // Nom du douar
  nbMenages: number;         // Nombre de ménages
  population: number;        // Population totale
}

export interface MissionMock extends Mission {
  douarInfo: DouarInfo;
  dateAffectation: string;   // Date d'affectation de la mission
  typeAide: string;          // Type d'aide humanitaire
}

// Données des douars basées sur HCP 2024 - Différentes provinces de la région Béni Mellal-Khénifra
export const DOUARS_DATA: DouarInfo[] = [
  // Mission 1: Azilal
  {
    codeGeo: '810301201001',
    region: 'Béni Mellal-Khénifra',
    province: 'Azilal',
    commune: 'Akdi n\'Lkhir',
    fraction: 'Ait Ofza',
    douar: 'Aska',
    nbMenages: 100,
    population: 673,
  },
  // Mission 2: Fquih Ben Salah
  {
    codeGeo: '2550505201003',
    region: 'Béni Mellal-Khénifra',
    province: 'Fquih Ben Salah',
    commune: 'Ouled Bourhmoun',
    fraction: 'Ouled Bouazza',
    douar: 'Ouled Bouazza',
    nbMenages: 987,
    population: 4442,
  },
  // Mission 3: Béni Mellal
  {
    codeGeo: '910301201001',
    region: 'Béni Mellal-Khénifra',
    province: 'Béni Mellal',
    commune: 'Foum Oudi',
    fraction: 'Ait Said Ichou',
    douar: 'Ait Said Ichou',
    nbMenages: 166,
    population: 785,
  },
  // Mission 4: Khouribga
  {
    codeGeo: '3110301201001',
    region: 'Béni Mellal-Khénifra',
    province: 'Khouribga',
    commune: 'Ain Kaicher',
    fraction: 'Ait Jilali',
    douar: 'Ait Jilali',
    nbMenages: 168,
    population: 637,
  },
  // Mission 5: Khénifra
  {
    codeGeo: '3010301201001',
    region: 'Béni Mellal-Khénifra',
    province: 'Khénifra',
    commune: 'Ait Ishaq',
    fraction: 'Ait Mhand',
    douar: 'Ait Mhand',
    nbMenages: 93,
    population: 390,
  },
  // Mission 6: Azilal (autre douar)
  {
    codeGeo: '810301202002',
    region: 'Béni Mellal-Khénifra',
    province: 'Azilal',
    commune: 'Akdi n\'Lkhir',
    fraction: 'Ait Berk',
    douar: 'Takout',
    nbMenages: 120,
    population: 682,
  },
];

// Douars de la tournée prioritaire MS-2026-007 (scores AHP-TOPSIS : 0.479 → 0.475)
export const MISSION_007_DOUARS: DouarInfo[] = [
  {
    codeGeo: '2550505201003',
    region: 'Béni Mellal-Khénifra',
    province: 'Fquih Ben Salah',
    commune: 'Ouled Bourhmoun',
    fraction: 'Ouled Bouazza',
    douar: 'Ouled Bouazza',
    nbMenages: 987,
    population: 4442,
  },
  {
    codeGeo: '810301101002',
    region: 'Béni Mellal-Khénifra',
    province: 'Azilal',
    commune: 'Ait Bou Oulli',
    fraction: 'Tighanimin',
    douar: 'Tighanimin',
    nbMenages: 72,
    population: 320,
  },
  {
    codeGeo: '810301102003',
    region: 'Béni Mellal-Khénifra',
    province: 'Azilal',
    commune: 'Ait Abbas',
    fraction: 'Tizguit',
    douar: 'Tizguit',
    nbMenages: 65,
    population: 290,
  },
  {
    codeGeo: '810301202002',
    region: 'Béni Mellal-Khénifra',
    province: 'Azilal',
    commune: 'Akdi n\'Lkhir',
    fraction: 'Ait Berk',
    douar: 'Takout',
    nbMenages: 53,
    population: 198,
  },
  {
    codeGeo: '810301103004',
    region: 'Béni Mellal-Khénifra',
    province: 'Azilal',
    commune: 'Ait Abbas',
    fraction: 'Ait Ouadrim',
    douar: 'Ait Ouadrim',
    nbMenages: 55,
    population: 231,
  },
  {
    codeGeo: '810301201001',
    region: 'Béni Mellal-Khénifra',
    province: 'Azilal',
    commune: 'Akdi n\'Lkhir',
    fraction: 'Ait Ofza',
    douar: 'Aska',
    nbMenages: 62,
    population: 264,
  },
];

// Coordonnées approximatives des provinces
const PROVINCE_COORDS: Record<string, { lat: number; lng: number }> = {
  'Azilal': { lat: 31.9, lng: -6.57 },
  'Fquih Ben Salah': { lat: 32.5, lng: -6.7 },
  'Béni Mellal': { lat: 32.33, lng: -6.36 },
  'Khouribga': { lat: 32.88, lng: -6.9 },
  'Khénifra': { lat: 32.93, lng: -5.66 },
};

// Types d'aide humanitaire
const TYPES_AIDE = [
  { type: 'Kits alimentaires', unite: 'kit', ratio: 1 },
  { type: 'Tentes familiales', unite: 'unité', ratio: 0.25 },
  { type: 'Couvertures thermiques', unite: 'unité', ratio: 2 },
  { type: 'Kits d\'hygiène', unite: 'kit', ratio: 1 },
  { type: 'Eau potable', unite: 'litre', ratio: 15 },
];

// Calculer la quantité à déposer selon le type d'aide
function calculerQuantite(douar: DouarInfo, typeAideIndex: number): number {
  const aide = TYPES_AIDE[typeAideIndex % TYPES_AIDE.length];
  if (aide.unite === 'litre') {
    return Math.round(douar.population * aide.ratio);
  }
  return Math.round(douar.nbMenages * aide.ratio);
}

// Obtenir les coordonnées avec un petit offset pour varier
function getCoords(province: string, index: number): { destinationLat: number; destinationLng: number } {
  const base = PROVINCE_COORDS[province] || { lat: 31.5, lng: -7.5 };
  return {
    destinationLat: base.lat + (index * 0.02),
    destinationLng: base.lng - (index * 0.015),
  };
}

export const MOCK_MISSIONS: MissionMock[] = [
  {
    id: 'mission-001',
    numeroMission: 'MS-2026-001',
    statut: 'pending',
    priorite: 'high',
    dateCreation: '2026-04-01T08:00:00Z',
    dateEcheance: '2026-04-10T18:00:00Z',
    dateAffectation: '2026-04-02T09:30:00Z',
    ...getCoords('Azilal', 0),
    destinationNom: DOUARS_DATA[0].douar,
    entrepotNom: 'Entrepôt A',
    description: `Distribution de tentes pour les familles du douar ${DOUARS_DATA[0].douar}, commune ${DOUARS_DATA[0].commune}, province ${DOUARS_DATA[0].province}.`,
    douarInfo: DOUARS_DATA[0],
    typeAide: TYPES_AIDE[1].type,
    items: [
      { id: 'item-1', materielNom: 'Tentes familiales', quantitePrevue: calculerQuantite(DOUARS_DATA[0], 1), unite: 'unité' },
      { id: 'item-2', materielNom: 'Couvertures thermiques', quantitePrevue: calculerQuantite(DOUARS_DATA[0], 2), unite: 'unité' },
    ],
  },
  {
    id: 'mission-002',
    // ↑ Correspond à tournee-a-001 (web) — Ahmed Benali (dist-a-001) — Entrepôt A — Azilal
    numeroMission: 'MS-A-2026-001',  // Aligné avec missionNumero web
    statut: 'in_progress',
    priorite: 'critique',
    dateCreation: '2026-04-04T08:00:00Z',
    dateEcheance: '2026-04-05T12:00:00Z',
    dateAffectation: '2026-04-04T08:00:00Z',
    destinationLat: 31.9, destinationLng: -6.57,  // Province Azilal (cohérent avec entrepotA.ts)
    destinationNom: 'Aska',  // Premier douar de tournee-a-001
    entrepotNom: 'Entrepôt A',
    description: `Urgence médicale - Livraison de kits d'hygiène pour ${DOUARS_DATA[1].population} habitants du douar ${DOUARS_DATA[1].douar}, province ${DOUARS_DATA[1].province}.`,
    douarInfo: DOUARS_DATA[1],
    typeAide: TYPES_AIDE[3].type,
    items: [
      { id: 'item-3', materielNom: 'Kits d\'hygiène', quantitePrevue: calculerQuantite(DOUARS_DATA[1], 3), unite: 'kit' },
      { id: 'item-4', materielNom: 'Médicaments de base', quantitePrevue: 500, unite: 'boîte' },
    ],
  },
  {
    id: 'mission-003',
    numeroMission: 'MS-2026-003',
    statut: 'completed',
    priorite: 'medium',
    dateCreation: '2026-03-28T09:00:00Z',
    dateEcheance: '2026-04-01T17:00:00Z',
    dateAffectation: '2026-03-29T08:00:00Z',
    ...getCoords('Béni Mellal', 0),
    destinationNom: DOUARS_DATA[2].douar,
    entrepotNom: 'Entrepôt A',
    description: `Distribution de kits alimentaires aux ${DOUARS_DATA[2].nbMenages} ménages du douar ${DOUARS_DATA[2].douar}, fraction ${DOUARS_DATA[2].fraction}, province ${DOUARS_DATA[2].province}.`,
    douarInfo: DOUARS_DATA[2],
    typeAide: TYPES_AIDE[0].type,
    items: [
      { id: 'item-5', materielNom: 'Kits alimentaires', quantitePrevue: calculerQuantite(DOUARS_DATA[2], 0), unite: 'kit' },
      { id: 'item-6', materielNom: 'Eau potable', quantitePrevue: calculerQuantite(DOUARS_DATA[2], 4), unite: 'litre' },
    ],
  },
  {
    id: 'mission-004',
    numeroMission: 'MS-2026-004',
    statut: 'pending',
    priorite: 'low',
    dateCreation: '2026-04-03T14:00:00Z',
    dateEcheance: '2026-04-15T16:00:00Z',
    dateAffectation: '2026-04-04T10:00:00Z',
    ...getCoords('Khouribga', 0),
    destinationNom: DOUARS_DATA[3].douar,
    entrepotNom: 'Entrepôt A',
    description: `Livraison de couvertures thermiques pour le douar ${DOUARS_DATA[3].douar}, commune ${DOUARS_DATA[3].commune}, province ${DOUARS_DATA[3].province}.`,
    douarInfo: DOUARS_DATA[3],
    typeAide: TYPES_AIDE[2].type,
    items: [
      { id: 'item-7', materielNom: 'Couvertures thermiques', quantitePrevue: calculerQuantite(DOUARS_DATA[3], 2), unite: 'unité' },
    ],
  },
  {
    id: 'mission-005',
    numeroMission: 'MS-2026-005',
    statut: 'pending',
    priorite: 'high',
    dateCreation: '2026-04-04T07:45:00Z',
    dateEcheance: '2026-04-08T14:00:00Z',
    dateAffectation: '2026-04-04T09:00:00Z',
    ...getCoords('Khénifra', 0),
    destinationNom: DOUARS_DATA[4].douar,
    entrepotNom: 'Entrepôt A',
    description: `Distribution complète pour le douar ${DOUARS_DATA[4].douar}, commune ${DOUARS_DATA[4].commune}, province ${DOUARS_DATA[4].province}.`,
    douarInfo: DOUARS_DATA[4],
    typeAide: 'Aide complète',
    items: [
      { id: 'item-8', materielNom: 'Kits alimentaires', quantitePrevue: calculerQuantite(DOUARS_DATA[4], 0), unite: 'kit' },
      { id: 'item-9', materielNom: 'Tentes familiales', quantitePrevue: calculerQuantite(DOUARS_DATA[4], 1), unite: 'unité' },
      { id: 'item-10', materielNom: 'Couvertures thermiques', quantitePrevue: calculerQuantite(DOUARS_DATA[4], 2), unite: 'unité' },
      { id: 'item-11', materielNom: 'Kits d\'hygiène', quantitePrevue: calculerQuantite(DOUARS_DATA[4], 3), unite: 'kit' },
    ],
  },
  {
    id: 'mission-007',
    numeroMission: 'MS-2026-007',
    statut: 'pending',
    priorite: 'critique',
    dateCreation: '2026-04-17T09:00:00Z',
    dateEcheance: '2026-04-25T17:00:00Z',
    dateAffectation: '2026-04-17T09:00:00Z',
    destinationLat: 31.9615,
    destinationLng: -6.5717,
    destinationNom: 'Tournée — 6 douars prioritaires (Azilal)',
    entrepotNom: 'Entrepôt A',
    description:
      'Tournée prioritaire AHP-TOPSIS couvrant 6 douars : Ouled Bouazza (score 0.479), Tighanimin (0.479), Tizguit (0.478), Takout (0.477), Ait Ouadrim (0.476), Aska (0.475). Mission non encore signée.',
    douarInfo: MISSION_007_DOUARS[0],
    typeAide: 'Aide complète',
    items: [
      { id: 'item-007-1', materielNom: 'Kits alimentaires',    quantitePrevue: 320, unite: 'kit'   },
      { id: 'item-007-2', materielNom: 'Tentes familiales',    quantitePrevue: 85,  unite: 'unité' },
      { id: 'item-007-3', materielNom: 'Couvertures thermiques', quantitePrevue: 640, unite: 'unité' },
      { id: 'item-007-4', materielNom: 'Kits d\'hygiène',      quantitePrevue: 320, unite: 'kit'   },
      { id: 'item-007-5', materielNom: 'Eau potable',          quantitePrevue: 9000, unite: 'litre' },
    ],
  },
  {
    id: 'mission-006',
    numeroMission: 'MS-2026-006',
    statut: 'annulee',
    priorite: 'medium',
    dateCreation: '2026-04-01T11:00:00Z',
    dateEcheance: '2026-04-06T10:00:00Z',
    dateAffectation: '2026-04-01T15:00:00Z',
    ...getCoords('Azilal', 3),
    destinationNom: DOUARS_DATA[5].douar,
    entrepotNom: 'Entrepôt B',
    description: `Mission annulée - Amélioration de la situation sur le douar ${DOUARS_DATA[5].douar}, commune ${DOUARS_DATA[5].commune}.`,
    douarInfo: DOUARS_DATA[5],
    typeAide: 'N/A',
    items: [],
  },
];

/**
 * Récupère les missions mockées
 */
export function getMockMissions(): Promise<Mission[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...MOCK_MISSIONS]);
    }, 500);
  });
}

/**
 * Récupère une mission mockée par son ID
 */
export function getMockMissionById(id: string): Promise<MissionMock | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mission = MOCK_MISSIONS.find(m => m.id === id) || null;
      resolve(mission ? { ...mission } : null);
    }, 300);
  });
}

/**
 * Formate le code géographique pour l'affichage
 */
export function formatCodeGeo(code: string): string {
  return `${code.slice(0, 2)}.${code.slice(2, 4)}.${code.slice(4, 6)}.${code.slice(6, 9)}.${code.slice(9, 12)}`;
}

/**
 * Formate la date d'affectation
 */
export function formatDateAffectation(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
