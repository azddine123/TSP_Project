/**
 * MOCK DATA — Tournées VRP pour le web
 * =====================================
 * Données fictives de tournées optimisées avec 7 douars chacune.
 * Ordre calculé par AHP → TOPSIS → VRP
 */

export interface EtapeVRP {
  id: string;
  ordre: number;
  douarId: string;
  douar: { nom: string; commune?: string; province?: string };
  douarNom?: string;
  lat: number;
  lng: number;
  distanceKm: number;
  tempsEstimeMin: number;
  priorite: 'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE';
  scoreTopsis: number;
  population: number;
  statut?: string;
  ressources: {
    tentes: number;
    couvertures: number;
    vivres: number;
    kits_med: number;
    eau_litres: number;
  };
}

export interface Tournee {
  id: string;
  missionId: string;
  entrepotId: string;
  entrepot: { id: string; nom: string; province: string };
  vehiculeId: string;
  distanceTotale: number;
  tempsEstimeTotalMin: number;
  tempsEstime: number;
  etapes: EtapeVRP[];
  statut: 'planifiee' | 'en_cours' | 'terminee' | 'assignee';
  criseId: string;
  distributeur?: { id: string; nom: string; prenom: string };
}

import { DOUARS_DATA } from './missions';

const PROVINCE_COORDS: Record<string, { lat: number; lng: number }> = {
  'Azilal': { lat: 31.9, lng: -6.57 },
  'Fquih Ben Salah': { lat: 32.5, lng: -6.7 },
  'Béni Mellal': { lat: 32.33, lng: -6.36 },
  'Khouribga': { lat: 32.88, lng: -6.9 },
  'Khénifra': { lat: 32.93, lng: -5.66 },
};

function generateEtapesVRP(province: string, missionIndex: number): EtapeVRP[] {
  const baseCoords = PROVINCE_COORDS[province] || { lat: 31.5, lng: -7.5 };
  const douarsProvince = DOUARS_DATA.filter(d => d.province === province);
  const baseDouars = douarsProvince.length > 0 ? douarsProvince : DOUARS_DATA.slice(0, 2);
  
  const etapes: EtapeVRP[] = [];
  
  for (let i = 0; i < 7; i++) {
    const douarBase = baseDouars[i % baseDouars.length];
    const scoreTopsis = 0.95 - (i * 0.08);
    
    let priorite: 'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE';
    if (scoreTopsis > 0.8) priorite = 'CRITIQUE';
    else if (scoreTopsis > 0.6) priorite = 'HAUTE';
    else if (scoreTopsis > 0.4) priorite = 'MOYENNE';
    else priorite = 'BASSE';
    
    const angle = (i / 7) * 2 * Math.PI;
    const radius = 0.08 + (Math.random() * 0.04);
    const lat = baseCoords.lat + Math.cos(angle) * radius;
    const lng = baseCoords.lng + Math.sin(angle) * radius;
    
    etapes.push({
      id: `etape-${missionIndex}-${i + 1}`,
      ordre: i + 1,
      douarId: `douar-${missionIndex}-${i + 1}`,
      douar: { 
        nom: `${douarBase.douar} ${String.fromCharCode(65 + i)}`,
        commune: douarBase.commune,
        province: douarBase.province,
      },
      lat: parseFloat(lat.toFixed(5)),
      lng: parseFloat(lng.toFixed(5)),
      distanceKm: i === 0 ? 0 : parseFloat((8 + Math.random() * 12).toFixed(1)),
      tempsEstimeMin: i === 0 ? 0 : Math.floor(15 + Math.random() * 20),
      priorite,
      scoreTopsis: parseFloat(scoreTopsis.toFixed(3)),
      population: douarBase.population || 500 + Math.floor(Math.random() * 800),
      statut: i === 0 ? 'en_route' : 'en_attente',
      ressources: {
        tentes: Math.floor(Math.random() * 30) + 5,
        couvertures: Math.floor(Math.random() * 100) + 20,
        vivres: Math.floor(Math.random() * 200) + 50,
        kits_med: Math.floor(Math.random() * 50) + 10,
        eau_litres: Math.floor(Math.random() * 500) + 200,
      },
    });
  }
  
  return etapes;
}

export const MOCK_TOURNEES: Record<string, Tournee> = {
  'mission-001': {
    id: 'tournee-001',
    missionId: 'mission-001',
    entrepotId: 'entrepot-a',
    entrepot: { id: 'entrepot-a', nom: 'Entrepôt A', province: 'Azilal' },
    vehiculeId: 'vehicule-001',
    distanceTotale: 145.5,
    tempsEstimeTotalMin: 240,
    tempsEstime: 240,
    etapes: generateEtapesVRP('Azilal', 1),
    statut: 'planifiee',
    criseId: 'crise-2026-001',
    distributeur: { id: 'dist-001', nom: 'Benali', prenom: 'Ahmed' },
  },
  'mission-002': {
    id: 'tournee-002',
    missionId: 'mission-002',
    entrepotId: 'entrepot-b',
    entrepot: { id: 'entrepot-b', nom: 'Entrepôt B', province: 'Fquih Ben Salah' },
    vehiculeId: 'vehicule-002',
    distanceTotale: 182.3,
    tempsEstimeTotalMin: 310,
    tempsEstime: 310,
    etapes: generateEtapesVRP('Fquih Ben Salah', 2),
    statut: 'en_cours',
    criseId: 'crise-2026-001',
    distributeur: { id: 'dist-002', nom: 'Idrissi', prenom: 'Karim' },
  },
  'mission-003': {
    id: 'tournee-003',
    missionId: 'mission-003',
    entrepotId: 'entrepot-a',
    entrepot: { id: 'entrepot-a', nom: 'Entrepôt A', province: 'Azilal' },
    vehiculeId: 'vehicule-003',
    distanceTotale: 98.7,
    tempsEstimeTotalMin: 165,
    tempsEstime: 165,
    etapes: generateEtapesVRP('Béni Mellal', 3),
    statut: 'terminee',
    criseId: 'crise-2026-001',
    distributeur: { id: 'dist-003', nom: 'Alaoui', prenom: 'Youssef' },
  },
  'mission-004': {
    id: 'tournee-004',
    missionId: 'mission-004',
    entrepotId: 'entrepot-a',
    entrepot: { id: 'entrepot-a', nom: 'Entrepôt A', province: 'Azilal' },
    vehiculeId: 'vehicule-004',
    distanceTotale: 156.2,
    tempsEstimeTotalMin: 285,
    tempsEstime: 285,
    etapes: generateEtapesVRP('Khouribga', 4),
    statut: 'planifiee',
    criseId: 'crise-2026-001',
  },
  'mission-005': {
    id: 'tournee-005',
    missionId: 'mission-005',
    entrepotId: 'entrepot-a',
    entrepot: { id: 'entrepot-a', nom: 'Entrepôt A', province: 'Azilal' },
    vehiculeId: 'vehicule-005',
    distanceTotale: 134.8,
    tempsEstimeTotalMin: 225,
    tempsEstime: 225,
    etapes: generateEtapesVRP('Khénifra', 5),
    statut: 'planifiee',
    criseId: 'crise-2026-001',
  },
  'mission-006': {
    id: 'tournee-006',
    missionId: 'mission-006',
    entrepotId: 'entrepot-b',
    entrepot: { id: 'entrepot-b', nom: 'Entrepôt B', province: 'Fquih Ben Salah' },
    vehiculeId: 'vehicule-006',
    distanceTotale: 0,
    tempsEstimeTotalMin: 0,
    tempsEstime: 0,
    etapes: [],
    statut: 'planifiee',
    criseId: 'crise-2026-001',
  },
};

export function getMockTourneeByMissionId(missionId: string): Promise<Tournee | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const tournee = MOCK_TOURNEES[missionId] || null;
      resolve(tournee ? { ...tournee } : null);
    }, 400);
  });
}

export function formatTempsEstime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}`;
}

export const getPrioriteColor = (priorite: string): string => {
  switch (priorite) {
    case 'CRITIQUE': return '#B71C1C';
    case 'HAUTE': return '#F44336';
    case 'MOYENNE': return '#FF9800';
    case 'BASSE': return '#4CAF50';
    default: return '#9E9E9E';
  }
};
