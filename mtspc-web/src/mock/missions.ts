/**
 * MOCK DATA — Missions de test pour le développement Web
 * =======================================================
 * Données fictives basées sur les données HCP (Haut Commissariat au Plan)
 * des douars de la région Béni Mellal-Khénifra 2024.
 */

export interface DouarInfo {
  codeGeo: string;
  region: string;
  province: string;
  commune: string;
  fraction: string;
  douar: string;
  nbMenages: number;
  population: number;
}

export interface MissionItem {
  id: string;
  materielNom: string;
  quantitePrevue: number;
  unite: string;
}

export interface Mission {
  id: string;
  numeroMission: string;
  statut: 'draft' | 'pending' | 'in_progress' | 'completed' | 'annulee';
  priorite: 'low' | 'medium' | 'high' | 'critique';
  dateCreation: string;
  dateEcheance: string;
  dateAffectation?: string;
  destinationLat: number;
  destinationLng: number;
  destinationNom: string;
  entrepotNom: string;
  description: string;
  douarInfo: DouarInfo;
  items: MissionItem[];
  typeAide: string;
}

// Données des douars basées sur HCP 2024
export const DOUARS_DATA: DouarInfo[] = [
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
    codeGeo: '910301201001',
    region: 'Béni Mellal-Khénifra',
    province: 'Béni Mellal',
    commune: 'Foum Oudi',
    fraction: 'Ait Said Ichou',
    douar: 'Ait Said Ichou',
    nbMenages: 166,
    population: 785,
  },
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

// Coordonnées des provinces
const PROVINCE_COORDS: Record<string, { lat: number; lng: number }> = {
  'Azilal': { lat: 31.9, lng: -6.57 },
  'Fquih Ben Salah': { lat: 32.5, lng: -6.7 },
  'Béni Mellal': { lat: 32.33, lng: -6.36 },
  'Khouribga': { lat: 32.88, lng: -6.9 },
  'Khénifra': { lat: 32.93, lng: -5.66 },
};

function getCoords(province: string, index: number): { destinationLat: number; destinationLng: number } {
  const base = PROVINCE_COORDS[province] || { lat: 31.5, lng: -7.5 };
  return {
    destinationLat: base.lat + (index * 0.02),
    destinationLng: base.lng - (index * 0.015),
  };
}

export const MOCK_MISSIONS: Mission[] = [
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
    description: `Distribution de tentes pour les familles du douar ${DOUARS_DATA[0].douar}, commune ${DOUARS_DATA[0].commune}.`,
    douarInfo: DOUARS_DATA[0],
    typeAide: 'Tentes familiales',
    items: [
      { id: 'item-1', materielNom: 'Tentes familiales', quantitePrevue: 25, unite: 'unité' },
      { id: 'item-2', materielNom: 'Couvertures thermiques', quantitePrevue: 200, unite: 'unité' },
    ],
  },
  {
    id: 'mission-002',
    numeroMission: 'MS-2026-002',
    statut: 'in_progress',
    priorite: 'critique',
    dateCreation: '2026-04-02T10:30:00Z',
    dateEcheance: '2026-04-05T12:00:00Z',
    dateAffectation: '2026-04-02T14:00:00Z',
    ...getCoords('Fquih Ben Salah', 0),
    destinationNom: DOUARS_DATA[1].douar,
    entrepotNom: 'Entrepôt B',
    description: `Urgence médicale - Livraison de kits d'hygiène pour ${DOUARS_DATA[1].population} habitants.`,
    douarInfo: DOUARS_DATA[1],
    typeAide: 'Kits d\'hygiène',
    items: [
      { id: 'item-3', materielNom: 'Kits d\'hygiène', quantitePrevue: 987, unite: 'kit' },
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
    description: `Distribution de kits alimentaires aux ${DOUARS_DATA[2].nbMenages} ménages.`,
    douarInfo: DOUARS_DATA[2],
    typeAide: 'Kits alimentaires',
    items: [
      { id: 'item-5', materielNom: 'Kits alimentaires', quantitePrevue: 166, unite: 'kit' },
      { id: 'item-6', materielNom: 'Eau potable', quantitePrevue: 11775, unite: 'litre' },
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
    description: `Livraison de couvertures thermiques pour le douar ${DOUARS_DATA[3].douar}.`,
    douarInfo: DOUARS_DATA[3],
    typeAide: 'Couvertures thermiques',
    items: [
      { id: 'item-7', materielNom: 'Couvertures thermiques', quantitePrevue: 336, unite: 'unité' },
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
    description: `Distribution complète pour le douar ${DOUARS_DATA[4].douar}.`,
    douarInfo: DOUARS_DATA[4],
    typeAide: 'Aide complète',
    items: [
      { id: 'item-8', materielNom: 'Kits alimentaires', quantitePrevue: 93, unite: 'kit' },
      { id: 'item-9', materielNom: 'Tentes familiales', quantitePrevue: 23, unite: 'unité' },
      { id: 'item-10', materielNom: 'Couvertures thermiques', quantitePrevue: 186, unite: 'unité' },
      { id: 'item-11', materielNom: 'Kits d\'hygiène', quantitePrevue: 93, unite: 'kit' },
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
    description: `Mission annulée - Amélioration de la situation sur le douar ${DOUARS_DATA[5].douar}.`,
    douarInfo: DOUARS_DATA[5],
    typeAide: 'N/A',
    items: [],
  },
];

export function getMockMissions(): Promise<Mission[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...MOCK_MISSIONS]), 500);
  });
}

export function getMockMissionById(id: string): Promise<Mission | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mission = MOCK_MISSIONS.find(m => m.id === id) || null;
      resolve(mission ? { ...mission } : null);
    }, 300);
  });
}

export function formatCodeGeo(code: string): string {
  return `${code.slice(0, 2)}.${code.slice(2, 4)}.${code.slice(4, 6)}.${code.slice(6, 9)}.${code.slice(9, 12)}`;
}

export const STATUT_LABEL: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Brouillon', color: '#9E9E9E', bgColor: '#F5F5F5' },
  pending: { label: 'En attente', color: '#FF9800', bgColor: '#FFF3E0' },
  in_progress: { label: 'En cours', color: '#2196F3', bgColor: '#E3F2FD' },
  completed: { label: 'Terminée', color: '#4CAF50', bgColor: '#E8F5E8' },
  annulee: { label: 'Annulée', color: '#F44336', bgColor: '#FFEBEE' },
};

export const PRIORITE_LABEL: Record<string, { label: string; color: string }> = {
  low: { label: 'Basse', color: '#9E9E9E' },
  medium: { label: 'Normale', color: '#FF9800' },
  high: { label: 'Haute', color: '#F44336' },
  critique: { label: 'Critique', color: '#B71C1C' },
};
