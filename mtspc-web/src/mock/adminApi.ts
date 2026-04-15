/**
 * MOCK API ADMIN — Centralisé
 * ============================
 * Toutes les APIs mock pour l'espace Admin (Entrepôt A uniquement)
 */

import type { StockMouvement, VehiculePosition } from '../types';
import { MOCK_ADMIN_MISSIONS } from './admin';
import { MOCK_DOUBLES } from './douars';
import {
  ENTREPOT_A,
  STOCK_ENTREPOT_A,
  VEHICULES_ENTREPOT_A,
  DISTRIBUTEURS_ENTREPOT_A,
} from './entrepotA';
// Tournées partagées avec le pipeline SuperAdmin
import { tourneesStore } from './store';

// Simuler un délai réseau
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// STOCK API - Entrepôt A uniquement
// ============================================================================
export const mockStockApi = {
  getMine: async () => {
    await delay(400);
    return [..._stocks];
  },

  getAll: async () => {
    await delay(500);
    return [..._stocks];
  },

  addArticle: async (dto: { nom: string; categorie: string; unite: string; quantiteInitiale: number; seuilAlerte: number }) => {
    await delay(600);
    const newMat = await mockMaterielApi.create({ nom: dto.nom, categorie: dto.categorie, unite: dto.unite });
    const newStock = {
      id: `stock-${Date.now()}`,
      entrepot: { id: ENTREPOT_A.id, nom: ENTREPOT_A.nom, province: ENTREPOT_A.province },
      materiel: newMat,
      quantite: dto.quantiteInitiale,
      seuilAlerte: dto.seuilAlerte,
      updatedAt: new Date().toISOString(),
    };
    _stocks = [..._stocks, newStock];
    return newStock;
  },
  
  createMouvement: async (dto: Record<string, unknown>) => {
    await delay(600);
    // Mettre à jour le stock en mémoire
    const mat = _materiels.find(m => m.id === dto.materielId);
    const stockIdx = _stocks.findIndex(s => s.materiel.id === dto.materielId);
    let stockApres = stockIdx >= 0 ? _stocks[stockIdx].quantite : 0;
    if (dto.type === 'ENTREE') stockApres += Number(dto.quantite);
    else stockApres = Math.max(0, stockApres - Number(dto.quantite));
    if (stockIdx >= 0) {
      _stocks = _stocks.map((s, i) => i === stockIdx ? { ...s, quantite: stockApres, updatedAt: new Date().toISOString() } : s);
    }
    return {
      id: `mouv-${Date.now()}`,
      ...dto,
      createdAt: new Date().toISOString(),
      entrepotId: 'entrepot-a',
      materiel: mat || { id: dto.materielId, nom: 'Matériel', categorie: 'AUTRE', unite: 'unité' },
      stockApres,
      acteurNom: 'Admin Entrepôt',
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
// Normalise les données véhicule : capaciteKg → capacite (attendu par TourneesPage)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeVehicule(v: any) {
  return { ...v, capacite: v.capacite ?? v.capaciteKg ?? 0 };
}

export const mockVehiculeApi = {
  getMine: async () => {
    await delay(400);
    return VEHICULES_ENTREPOT_A.map(normalizeVehicule);
  },

  getAll: async () => {
    await delay(500);
    return VEHICULES_ENTREPOT_A.map(normalizeVehicule);
  },
  
  create: async (dto: Record<string, unknown>) => {
    await delay(600);
    const dist = dto.distributeurId
      ? DISTRIBUTEURS_ENTREPOT_A.find(d => d.id === dto.distributeurId) ?? null
      : null;
    return {
      id: `veh-${Date.now()}`,
      entrepotId: ENTREPOT_A.id,
      immatriculation: dto.immatriculation,
      type: dto.type,
      marque: dto.marque ?? null,
      capacite: dto.capacite ?? null,
      statut: 'disponible',
      distributeurId: dto.distributeurId ?? null,
      distributeur: dist ? { id: dist.id, nom: dist.nom, prenom: dist.prenom } : null,
      notes: dto.notes ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
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
// Patch une tournée par id — mise à jour mémoire + localStorage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function patchTournee(id: string, patch: any) {
  tourneesStore.update(id, patch);
}

// Source de vérité : cache mémoire du store (même onglet), puis localStorage (cross-onglets)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAllTournees(): any[] {
  return tourneesStore.getAll();
}

export const mockTourneeApi = {
  getMine: async () => {
    await delay(300);
    return getAllTournees();
  },

  getByCrise: async (criseId?: string) => {
    await delay(300);
    const all = getAllTournees();
    return criseId ? all.filter((t: any) => t.criseId === criseId) : all;
  },

  getById: async (id: string) => {
    await delay(300);
    const t = getAllTournees().find((t: any) => t.id === id);
    if (!t) throw new Error('Tournée non trouvée');
    return t;
  },

  assigner: async (id: string, dto: { distributeurId: string }) => {
    await delay(300);
    const dist = DISTRIBUTEURS_ENTREPOT_A.find(d => d.id === dto.distributeurId);
    const patch = {
      distributeur: dist ? { id: dist.id, nom: dist.nom, prenom: dist.prenom } : { id: dto.distributeurId, nom: '', prenom: '' },
    };
    patchTournee(id, patch);
    const updated = getAllTournees().find((t: any) => t.id === id);
    return updated ?? { id, ...patch };
  },

  reassigner: async (id: string, dto: { distributeurId: string }) => {
    await delay(300);
    const dist = DISTRIBUTEURS_ENTREPOT_A.find(d => d.id === dto.distributeurId);
    const patch = {
      distributeur: dist ? { id: dist.id, nom: dist.nom, prenom: dist.prenom } : { id: dto.distributeurId, nom: '', prenom: '' },
    };
    patchTournee(id, patch);
    const updated = getAllTournees().find((t: any) => t.id === id);
    return updated ?? { id, ...patch };
  },

  annuler: async (id: string) => {
    await delay(300);
    patchTournee(id, { statut: 'annulee' });
    return { id, statut: 'annulee' };
  },

  demarrer: async (id: string) => {
    await delay(300);
    const current = getAllTournees().find((t: any) => t.id === id);
    if (!current) throw new Error('Tournée non trouvée');
    const etapes = (current.etapes as any[]).map((e: any, i: number) =>
      i === 0 ? { ...e, statut: 'en_route' } : e
    );
    patchTournee(id, { statut: 'en_cours', etapes, demarreeAt: new Date().toISOString() });
    return getAllTournees().find((t: any) => t.id === id);
  },

  terminer: async (id: string) => {
    await delay(300);
    const current = getAllTournees().find((t: any) => t.id === id);
    if (!current) throw new Error('Tournée non trouvée');
    const etapes = (current.etapes as any[]).map((e: any) => ({ ...e, statut: 'livree' }));
    patchTournee(id, { statut: 'terminee', etapes, termineeAt: new Date().toISOString() });
    return getAllTournees().find((t: any) => t.id === id);
  },

  assignerDistributeur: async (id: string, dto: { distributeurId: string; vehiculeId?: string }) => {
    await delay(300);
    const dist = DISTRIBUTEURS_ENTREPOT_A.find(d => d.id === dto.distributeurId);
    patchTournee(id, {
      distributeur: dist ? { id: dist.id, nom: dist.nom, prenom: dist.prenom } : undefined,
      vehiculeId: dto.vehiculeId,
    });
    return getAllTournees().find((t: any) => t.id === id);
  },

  updateEtapeStatut: async (tourneeId: string, etapeId: string, statut: string) => {
    await delay(300);
    const current = getAllTournees().find((t: any) => t.id === tourneeId);
    if (!current) throw new Error('Tournée non trouvée');
    const etapes = (current.etapes as any[]).map((e: any) =>
      e.id === etapeId ? { ...e, statut, arriveeAt: statut === 'livree' ? new Date().toISOString() : e.arriveeAt } : e
    );
    const allDone = etapes.every((e: any) => e.statut === 'livree' || e.statut === 'echec');
    patchTournee(tourneeId, { etapes, statut: allDone ? 'terminee' : current.statut });
    return getAllTournees().find((t: any) => t.id === tourneeId);
  },

  create: async (dto: {
    distributeurId: string;
    vehiculeId: string;
    dateDepart: string;
    douarIds: string[];
    description?: string;
  }) => {
    await delay(700);
    const dist = DISTRIBUTEURS_ENTREPOT_A.find(d => d.id === dto.distributeurId);
    const newId = `tournee-${Date.now()}`;
    const missionNum = `MS-A-2026-${String(tourneesStore.getAll().length + 1).padStart(3, '0')}`;
    const etapes = dto.douarIds.map((douarId, i) => {
      const douar = MOCK_DOUBLES.find(d => d.id === douarId);
      return {
        id: `etape-${newId}-${i + 1}`,
        ordre: i + 1,
        douarId,
        douar: douar ? { nom: douar.nom, commune: douar.commune, province: douar.province } : { nom: douarId, commune: '', province: '' },
        douarNom: douar?.nom ?? douarId,
        lat: douar?.latitude ?? 31.96,
        lng: douar?.longitude ?? -6.57,
        distanceKm: parseFloat((10 + Math.random() * 15).toFixed(1)),
        tempsEstimeMin: Math.floor(20 + Math.random() * 25),
        priorite: i === 0 ? 'CRITIQUE' : i < 2 ? 'HAUTE' : 'MOYENNE',
        scoreTopsis: parseFloat((0.9 - i * 0.1).toFixed(3)),
        population: douar?.population ?? 200,
        menages: Math.ceil((douar?.population ?? 200) / 5.5),
        statut: 'en_attente',
        ressources: {
          tentes: Math.floor(Math.ceil((douar?.population ?? 200) / 5.5) * 0.6),
          vivres: Math.ceil((douar?.population ?? 200) / 5.5) * 2,
          kits_med: Math.floor(Math.ceil((douar?.population ?? 200) / 5.5) * 0.3),
          eau_litres: (douar?.population ?? 200) * 5,
        },
      };
    });
    const newTournee = {
      id: newId,
      missionId: `mission-${newId}`,
      missionNumero: missionNum,
      entrepotId: ENTREPOT_A.id,
      entrepot: { id: ENTREPOT_A.id, nom: ENTREPOT_A.nom, province: ENTREPOT_A.province },
      vehiculeId: dto.vehiculeId,
      distributeur: dist ? { id: dist.id, nom: dist.nom, prenom: dist.prenom } : null,
      distanceTotale: etapes.reduce((sum, e) => sum + e.distanceKm, 0),
      tempsEstime: etapes.reduce((sum, e) => sum + e.tempsEstimeMin, 0),
      tempsEstimeTotalMin: etapes.reduce((sum, e) => sum + e.tempsEstimeMin, 0),
      statut: 'planifiee' as const,
      criseId: 'crise-001',
      description: dto.description ?? null,
      datePlanification: dto.dateDepart,
      etapes,
    };
    tourneesStore.add(newTournee);
    return newTournee;
  },
};

// ============================================================================
// DOUAR API
// ============================================================================
export const mockDouarApi = {
  getAll: async () => {
    await delay(400);
    return [...MOCK_DOUBLES];
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

// Liste mutable pour permettre l'ajout dynamique d'articles
let _materiels = [
  { id: 'mat-1', nom: 'Tentes familiales',    categorie: 'TENTE',      unite: 'unité'  },
  { id: 'mat-2', nom: 'Couvertures thermiques',categorie: 'EQUIPEMENT', unite: 'unité'  },
  { id: 'mat-3', nom: 'Kits alimentaires',     categorie: 'NOURRITURE', unite: 'kit'    },
  { id: 'mat-4', nom: 'Eau potable',           categorie: 'EAU',        unite: 'litre'  },
  { id: 'mat-5', nom: 'Kits médicaux',         categorie: 'MEDICAMENT', unite: 'kit'    },
  { id: 'mat-6', nom: 'Kits d\'hygiène',       categorie: 'MEDICAMENT', unite: 'kit'    },
];

// Liste mutable des stocks (pour ajout d'articles)
let _stocks = [...STOCK_ENTREPOT_A];

export const mockMaterielApi = {
  getAll: async () => {
    await delay(400);
    return [..._materiels];
  },

  create: async (dto: { nom: string; categorie: string; unite: string }) => {
    await delay(500);
    const newMat = { id: `mat-${Date.now()}`, ...dto };
    _materiels = [..._materiels, newMat];
    return newMat;
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
    const tourneesEnCours = tourneesStore.getAll().filter((t: any) => t.statut === 'en_cours');
    
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
