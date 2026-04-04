/**
 * MOCK DATA — Tournées VRP avec ordre AHP-TOPSIS-VRP
 * ==================================================
 * Données fictives de tournées optimisées avec 7 douars chacune.
 * Ordre calculé par AHP → TOPSIS → VRP (OR-Tools)
 */
import { Tournee, EtapeVRP } from '../types/app';
import { DOUARS_DATA } from './missions';

// Coordonnées approximatives des provinces
const PROVINCE_COORDS: Record<string, { lat: number; lng: number }> = {
  'Azilal': { lat: 31.9, lng: -6.57 },
  'Fquih Ben Salah': { lat: 32.5, lng: -6.7 },
  'Béni Mellal': { lat: 32.33, lng: -6.36 },
  'Khouribga': { lat: 32.88, lng: -6.9 },
  'Khénifra': { lat: 32.93, lng: -5.66 },
};

// Générer 7 étapes VRP pour une mission à partir de douars de la même province
function generateEtapesVRP(province: string, missionIndex: number): EtapeVRP[] {
  const baseCoords = PROVINCE_COORDS[province] || { lat: 31.5, lng: -7.5 };
  
  // Douars de la province
  const douarsProvince = DOUARS_DATA.filter(d => d.province === province);
  const baseDouars = douarsProvince.length > 0 ? douarsProvince : DOUARS_DATA.slice(0, 2);
  
  const etapes: EtapeVRP[] = [];
  
  for (let i = 0; i < 7; i++) {
    const douarBase = baseDouars[i % baseDouars.length];
    
    // Score TOPSIS simulé (0-1, plus c'est proche de 1 plus c'est prioritaire)
    const scoreTopsis = 0.95 - (i * 0.08);
    
    // Niveau de priorité basé sur le score
    let priorite: 'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE';
    if (scoreTopsis > 0.8) priorite = 'CRITIQUE';
    else if (scoreTopsis > 0.6) priorite = 'HAUTE';
    else if (scoreTopsis > 0.4) priorite = 'MOYENNE';
    else priorite = 'BASSE';
    
    // Coordonnées en cercle autour du centre de la province
    const angle = (i / 7) * 2 * Math.PI;
    const radius = 0.08 + (Math.random() * 0.04);
    const lat = baseCoords.lat + Math.cos(angle) * radius;
    const lng = baseCoords.lng + Math.sin(angle) * radius;
    
    etapes.push({
      ordre: i + 1,
      douarId: `douar-${missionIndex}-${i + 1}`,
      douarNom: `${douarBase.douar} ${String.fromCharCode(65 + i)}`, // Douar A, B, C...
      lat: parseFloat(lat.toFixed(5)),
      lng: parseFloat(lng.toFixed(5)),
      distanceKm: i === 0 ? 0 : parseFloat((8 + Math.random() * 12).toFixed(1)),
      tempsEstimeMin: i === 0 ? 0 : Math.floor(15 + Math.random() * 20),
      priorite,
      scoreTopsis: parseFloat(scoreTopsis.toFixed(3)),
      population: douarBase.population || 500 + Math.floor(Math.random() * 800),
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
    id: 'tournee-002',
    missionId: 'mission-002',
    entrepotId: 'entrepot-b',
    vehiculeId: 'vehicule-002',
    distanceTotaleKm: 182.3,
    tempsEstimeTotalMin: 310,
    etapes: generateEtapesVRP('Fquih Ben Salah', 2),
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
