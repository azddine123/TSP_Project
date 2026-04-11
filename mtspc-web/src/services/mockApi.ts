/**
 * MOCK API SERVICE
 * ================
 * Simulation des appels API pour le développement
 * Active avec USE_MOCK_DATA = true
 */

import { 
  MOCK_MISSIONS, 
  MOCK_TOURNEES, 
  MOCK_STOCK, 
  MOCK_ADMIN_MISSIONS,
  MOCK_ENTREPOTS,
  MOCK_AUDIT_LOGS,
  MOCK_VEHICULES,
  MOCK_DISTRIBUTEURS,
  MOCK_CRISES,
  MOCK_DOUBLES
} from '../mock';

import type { Mission, Tournee } from '../types';

// Flag pour activer/désactiver les mocks
export const USE_MOCK_DATA = true;

// Simulation de délai réseau
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// API MISSIONS
// ============================================================================

export const missionApi = {
  getAll: async () => {
    await delay(500);
    return Promise.resolve([...MOCK_MISSIONS]);
  },
  
  getById: async (id: string) => {
    await delay(400);
    const mission = MOCK_MISSIONS.find(m => m.id === id);
    if (!mission) {
      throw new Error(`Mission ${id} non trouvée`);
    }
    return Promise.resolve(mission);
  },
  
  create: async (data: Partial<Mission> | Record<string, unknown>) => {
    await delay(600);
    const newMission: Mission = {
      id: `mission-${Date.now()}`,
      numeroMission: `MS-2026-${String(MOCK_MISSIONS.length + 1).padStart(3, '0')}`,
      statut: 'pending',
      priorite: 'medium',
      createdAt: new Date().toISOString(),
      dateEcheance: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      destinationNom: (data as Partial<Mission>).destinationNom || 'Nouvelle destination',
      ...data as Partial<Mission>,
    };
    return Promise.resolve(newMission);
  },
  
  update: async (id: string, data: Partial<Mission>) => {
    await delay(500);
    return Promise.resolve({ id, ...data });
  },
};

// ============================================================================
// API TOURNÉES (VRP)
// ============================================================================

export const tourneeApi = {
  getByMissionId: async (missionId: string) => {
    await delay(600);
    const tournee = MOCK_TOURNEES[missionId];
    if (!tournee) {
      throw new Error(`Tournée pour mission ${missionId} non trouvée`);
    }
    return Promise.resolve(tournee);
  },
  
  updateEtape: async (tourneeId: string, etapeOrdre: number, data: { statut: string; heureArrivee?: string }) => {
    await delay(400);
    return Promise.resolve({ tourneeId, etapeOrdre, ...data });
  },
  
  start: async (tourneeId: string) => {
    await delay(500);
    return Promise.resolve({ id: tourneeId, statut: 'en_cours', dateDebut: new Date().toISOString() });
  },
  
  complete: async (tourneeId: string) => {
    await delay(500);
    return Promise.resolve({ id: tourneeId, statut: 'terminee', dateFin: new Date().toISOString() });
  },
};

// ============================================================================
// API STOCK (Admin)
// ============================================================================

export const stockApi = {
  getAll: async () => {
    await delay(500);
    return Promise.resolve([...MOCK_STOCK]);
  },
  
  getByEntrepot: async (entrepotId: string) => {
    await delay(400);
    return Promise.resolve(MOCK_STOCK.filter(s => s.entrepot.nom.toLowerCase().includes(entrepotId.toLowerCase())));
  },
  
  getAlertes: async () => {
    await delay(400);
    return Promise.resolve(MOCK_STOCK.filter(s => s.quantite <= s.seuilAlerte));
  },
  
  updateQuantite: async (stockId: string, quantite: number) => {
    await delay(500);
    return Promise.resolve({ id: stockId, quantite });
  },
};

// ============================================================================
// API ADMIN MISSIONS (avec distributeurs)
// ============================================================================

export const adminMissionApi = {
  getAll: async () => {
    await delay(500);
    return Promise.resolve([...MOCK_ADMIN_MISSIONS]);
  },
  
  getActives: async () => {
    await delay(400);
    return Promise.resolve(MOCK_ADMIN_MISSIONS.filter(m => m.statut === 'in_progress' || m.statut === 'pending'));
  },
};

// ============================================================================
// API ENTREPÔTS (SuperAdmin)
// ============================================================================

export const entrepotApi = {
  getAll: async () => {
    await delay(600);
    return Promise.resolve([...MOCK_ENTREPOTS]);
  },
  
  getById: async (id: string) => {
    await delay(400);
    const entrepot = MOCK_ENTREPOTS.find(e => e.id === id);
    if (!entrepot) {
      throw new Error(`Entrepôt ${id} non trouvé`);
    }
    return Promise.resolve(entrepot);
  },
  
  getActifs: async () => {
    await delay(400);
    return Promise.resolve(MOCK_ENTREPOTS.filter(e => e.statut === 'actif'));
  },
  
  getEnSurcharge: async () => {
    await delay(400);
    return Promise.resolve(MOCK_ENTREPOTS.filter(e => e.statut === 'surcharge'));
  },
};

// ============================================================================
// API AUDIT LOGS (SuperAdmin)
// ============================================================================

export const auditApi = {
  getLogs: async (params?: { page?: number; limit?: number; operation?: string }) => {
    await delay(700);
    let logs = [...MOCK_AUDIT_LOGS];
    
    if (params?.operation) {
      logs = logs.filter(l => l.operation === params.operation);
    }
    
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return Promise.resolve({
      data: logs.slice(start, end),
      meta: { 
        total: logs.length,
        page,
        limit,
        totalPages: Math.ceil(logs.length / limit),
      },
    });
  },
  
  getByTable: async (table: string) => {
    await delay(500);
    return Promise.resolve(MOCK_AUDIT_LOGS.filter(l => l.tableCible === table));
  },
};

// ============================================================================
// API VÉHICULES
// ============================================================================

export const vehiculeApi = {
  getAll: async () => {
    await delay(500);
    return Promise.resolve([...MOCK_VEHICULES]);
  },
  
  getDisponibles: async () => {
    await delay(400);
    return Promise.resolve(MOCK_VEHICULES.filter(v => v.statut === 'disponible'));
  },
  
  getEnMission: async () => {
    await delay(400);
    return Promise.resolve(MOCK_VEHICULES.filter(v => v.statut === 'en_mission'));
  },
};

// ============================================================================
// API DISTRIBUTEURS
// ============================================================================

export const distributeurApi = {
  getAll: async () => {
    await delay(500);
    return Promise.resolve([...MOCK_DISTRIBUTEURS]);
  },
  
  getDisponibles: async () => {
    await delay(400);
    return Promise.resolve(MOCK_DISTRIBUTEURS.filter(d => d.statut === 'disponible'));
  },
  
  getEnMission: async () => {
    await delay(400);
    return Promise.resolve(MOCK_DISTRIBUTEURS.filter(d => d.statut === 'en_mission'));
  },
};

// ============================================================================
// API CRISES
// ============================================================================

export const criseApi = {
  getAll: async () => {
    await delay(600);
    return Promise.resolve([...MOCK_CRISES]);
  },
  
  getActives: async () => {
    await delay(400);
    return Promise.resolve(MOCK_CRISES.filter(c => c.statut === 'active'));
  },
  
  getByNiveau: async (niveau: 'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE') => {
    await delay(400);
    return Promise.resolve(MOCK_CRISES.filter(c => c.niveau === niveau));
  },
};

// ============================================================================
// API DOUARS
// ============================================================================

export const douarApi = {
  getAll: async () => {
    await delay(600);
    return Promise.resolve([...MOCK_DOUBLES]);
  },
  
  getByProvince: async (province: string) => {
    await delay(400);
    return Promise.resolve(MOCK_DOUBLES.filter(d => d.province.toLowerCase() === province.toLowerCase()));
  },
  
  getByCodeGeo: async (codeGeo: string) => {
    await delay(300);
    return Promise.resolve(MOCK_DOUBLES.find(d => d.codeGeo === codeGeo));
  },
};

// ============================================================================
// EXPORT GLOBAL
// ============================================================================

const mockApi = {
  missionApi,
  tourneeApi,
  stockApi,
  adminMissionApi,
  entrepotApi,
  auditApi,
  vehiculeApi,
  distributeurApi,
  criseApi,
  douarApi,
};

export default mockApi;
