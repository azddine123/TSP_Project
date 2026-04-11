/**
 * MOCK API ADMIN — Centralisé
 * ============================
 * Toutes les APIs mock pour l'espace Admin (Entrepôt A uniquement)
 */

import type { StockMouvement, VehiculePosition } from '../types';
import { MOCK_ADMIN_MISSIONS } from './admin';
import { 
  ENTREPOT_A,
  STOCK_ENTREPOT_A,
  VEHICULES_ENTREPOT_A,
  TOURNEES_ENTREPOT_A,
  DISTRIBUTEURS_ENTREPOT_A,
} from './entrepotA';

// Simuler un délai réseau
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// STOCK API - Entrepôt A uniquement
// ============================================================================
export const mockStockApi = {
  getMine: async () => {
    await delay(400);
    return [...STOCK_ENTREPOT_A];
  },
  
  getAll: async () => {
    await delay(500);
    return [...STOCK_ENTREPOT_A];
  },
  
  createMouvement: async (dto: Record<string, unknown>) => {
    await delay(600);
    return {
      id: `mouv-${Date.now()}`,
      ...dto,
      createdAt: new Date().toISOString(),
      entrepotId: 'entrepot-a',
      materiel: { id: dto.materielId, nom: 'Matériel', categorie: 'AUTRE', unite: 'unité' },
      stockApres: 100,
      referenceDoc: dto.referenceDoc || null,
    } as StockMouvement;
  },
  
  getMouvements: async (_params?: { page?: number; limit?: number; type?: string }) => {
    await delay(400);
    return {
      data: [],
      meta: { total: 0 },
    };
  },
};

// ============================================================================
// ENTREPOT API - Entrepôt A uniquement
// ============================================================================
export const mockEntrepotApi = {
  getMine: async () => {
    await delay(300);
    return { ...ENTREPOT_A };
  },
  
  getAll: async () => {
    await delay(500);
    return [ENTREPOT_A];
  },
};

// ============================================================================
// VEHICULE API - Entrepôt A uniquement
// ============================================================================
export const mockVehiculeApi = {
  getMine: async () => {
    await delay(400);
    return [...VEHICULES_ENTREPOT_A];
  },
  
  getAll: async () => {
    await delay(500);
    return [...VEHICULES_ENTREPOT_A];
  },
  
  create: async (dto: unknown) => {
    await delay(600);
    return { id: `veh-${Date.now()}`, ...dto as object };
  },
  
  updateStatut: async (id: string, dto: { statut: string; distributeurId?: string }) => {
    await delay(400);
    return { id, ...dto };
  },
  
  remove: async (id: string) => {
    await delay(400);
    return { id, deleted: true };
  },
};

// ============================================================================
// TOURNEE API - Entrepôt A uniquement
// ============================================================================
export const mockTourneeApi = {
  getMine: async () => {
    await delay(500);
    return [...TOURNEES_ENTREPOT_A];
  },
  
  getByCrise: async () => {
    await delay(500);
    return [...TOURNEES_ENTREPOT_A];
  },
  
  getById: async (id: string) => {
    await delay(400);
    const tournee = TOURNEES_ENTREPOT_A.find(t => t.id === id);
    if (!tournee) throw new Error('Tournée non trouvée');
    return tournee;
  },
  
  assigner: async (id: string, dto: { distributeurId: string }) => {
    await delay(400);
    return { id, ...dto };
  },
  
  reassigner: async (id: string, dto: { distributeurId: string }) => {
    await delay(400);
    return { id, ...dto };
  },
  
  annuler: async (id: string) => {
    await delay(400);
    return { id, statut: 'annulee' };
  },
};

// ============================================================================
// DISTRIBUTEUR API - Entrepôt A uniquement
// ============================================================================
export const mockDistributeurApi = {
  getAll: async () => {
    await delay(400);
    return [...DISTRIBUTEURS_ENTREPOT_A];
  },
  
  getDisponibles: async () => {
    await delay(400);
    return DISTRIBUTEURS_ENTREPOT_A.filter(d => d.statut === 'disponible');
  },
};

// ============================================================================
// MATERIEL API
// ============================================================================
export const mockMaterielApi = {
  getAll: async () => {
    await delay(400);
    return [
      { id: 'mat-1', nom: 'Tentes familiales', categorie: 'TENTE', unite: 'unité' },
      { id: 'mat-2', nom: 'Couvertures thermiques', categorie: 'EQUIPEMENT', unite: 'unité' },
      { id: 'mat-3', nom: 'Kits alimentaires', categorie: 'NOURRITURE', unite: 'kit' },
      { id: 'mat-4', nom: 'Eau potable', categorie: 'EAU', unite: 'litre' },
      { id: 'mat-5', nom: 'Kits médicaux', categorie: 'MEDICAMENT', unite: 'kit' },
      { id: 'mat-6', nom: 'Kits d\'hygiène', categorie: 'MEDICAMENT', unite: 'kit' },
    ];
  },
};

// ============================================================================
// MISSION API
// ============================================================================
export const mockMissionApi = {
  getAll: async () => {
    await delay(500);
    return [...MOCK_ADMIN_MISSIONS];
  },
  
  create: async (dto: unknown) => {
    await delay(600);
    return {
      id: `mission-${Date.now()}`,
      numeroMission: `MS-2026-${String(MOCK_ADMIN_MISSIONS.length + 1).padStart(3, '0')}`,
      statut: 'pending',
      createdAt: new Date().toISOString(),
      ...dto as object,
    };
  },
};

// ============================================================================
// SUPERVISION API - Entrepôt A uniquement
// ============================================================================
export const mockSupervisionApi = {
  getSnapshot: async () => {
    await delay(500);
    const tourneesEnCours = TOURNEES_ENTREPOT_A.filter(t => t.statut === 'en_cours');
    
    return {
      tourneesActives: tourneesEnCours.length,
      alertes: STOCK_ENTREPOT_A.filter(s => s.quantite <= s.seuilAlerte).length,
      lastUpdate: new Date().toISOString(),
      vehicules: tourneesEnCours.map(t => ({
        distributeurId: t.distributeur?.id || '',
        distributeurNom: `${t.distributeur?.prenom || ''} ${t.distributeur?.nom || ''}`.trim(),
        tourneeId: t.id,
        latitude: t.etapes[0]?.lat || ENTREPOT_A.latitude,
        longitude: t.etapes[0]?.lng || ENTREPOT_A.longitude,
        vitesse: 35,
        updatedAt: new Date().toISOString(),
      })),
    };
  },
  
  getStreamUrl: () => '',
};
