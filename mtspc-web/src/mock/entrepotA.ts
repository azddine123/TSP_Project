/**
 * MOCK DATA — Entrepôt A (Azilal)
 * ================================
 * Données complètes pour l'admin de l'Entrepôt A
 */

import type { StockRow } from '../types';

// ============================================================================
// ENTREPÔT A
// ============================================================================
export const ENTREPOT_A = {
  id: 'entrepot-a',
  code: 'ENT-A-001',
  nom: 'Entrepôt Régional Azilal',
  province: 'Azilal',
  wilaya: 'Béni Mellal-Khénifra',
  statut: 'actif' as const,
  latitude: 31.9615,
  longitude: -6.5717,
};

// ============================================================================
// STOCK - Entrepôt A uniquement
// ============================================================================
export const STOCK_ENTREPOT_A: StockRow[] = [
  {
    id: 'stock-a-1',
    entrepot: { id: 'entrepot-a', nom: 'Entrepôt A', province: 'Azilal' },
    materiel: { id: 'mat-1', nom: 'Tentes familiales', categorie: 'TENTE', unite: 'unité' },
    quantite: 120,
    seuilAlerte: 50,
    updatedAt: '2026-04-04T10:30:00Z',
  },
  {
    id: 'stock-a-2',
    entrepot: { id: 'entrepot-a', nom: 'Entrepôt A', province: 'Azilal' },
    materiel: { id: 'mat-2', nom: 'Couvertures thermiques', categorie: 'EQUIPEMENT', unite: 'unité' },
    quantite: 450,
    seuilAlerte: 150,
    updatedAt: '2026-04-04T09:15:00Z',
  },
  {
    id: 'stock-a-3',
    entrepot: { id: 'entrepot-a', nom: 'Entrepôt A', province: 'Azilal' },
    materiel: { id: 'mat-3', nom: 'Kits alimentaires', categorie: 'NOURRITURE', unite: 'kit' },
    quantite: 85,
    seuilAlerte: 100, // En alerte
    updatedAt: '2026-04-03T16:45:00Z',
  },
  {
    id: 'stock-a-4',
    entrepot: { id: 'entrepot-a', nom: 'Entrepôt A', province: 'Azilal' },
    materiel: { id: 'mat-4', nom: 'Eau potable', categorie: 'EAU', unite: 'litre' },
    quantite: 2500,
    seuilAlerte: 500,
    updatedAt: '2026-04-04T11:00:00Z',
  },
  {
    id: 'stock-a-5',
    entrepot: { id: 'entrepot-a', nom: 'Entrepôt A', province: 'Azilal' },
    materiel: { id: 'mat-5', nom: 'Kits médicaux', categorie: 'MEDICAMENT', unite: 'kit' },
    quantite: 95,
    seuilAlerte: 30,
    updatedAt: '2026-04-04T08:20:00Z',
  },
  {
    id: 'stock-a-6',
    entrepot: { id: 'entrepot-a', nom: 'Entrepôt A', province: 'Azilal' },
    materiel: { id: 'mat-6', nom: 'Kits d\'hygiène', categorie: 'MEDICAMENT', unite: 'kit' },
    quantite: 180,
    seuilAlerte: 50,
    updatedAt: '2026-04-04T09:45:00Z',
  },
  {
    id: 'stock-a-7',
    entrepot: { id: 'entrepot-a', nom: 'Entrepôt A', province: 'Azilal' },
    materiel: { id: 'mat-7', nom: 'Bâches de protection', categorie: 'EQUIPEMENT', unite: 'unité' },
    quantite: 200,
    seuilAlerte: 80,
    updatedAt: '2026-04-03T14:30:00Z',
  },
  {
    id: 'stock-a-8',
    entrepot: { id: 'entrepot-a', nom: 'Entrepôt A', province: 'Azilal' },
    materiel: { id: 'mat-8', nom: 'Vêtements chauds', categorie: 'EQUIPEMENT', unite: 'carton' },
    quantite: 320,
    seuilAlerte: 100,
    updatedAt: '2026-04-04T10:15:00Z',
  },
];

// ============================================================================
// VÉHICULES - Entrepôt A uniquement
// ============================================================================
export const VEHICULES_ENTREPOT_A = [
  {
    id: 'veh-a-001',
    immatriculation: '54237-A-6',
    type: '4x4',
    capaciteKg: 800,
    statut: 'en_mission',
    entrepotId: 'entrepot-a',
    localisation: { lat: 31.9523, lng: -6.5124 },
  },
  {
    id: 'veh-a-002',
    immatriculation: '54238-B-6',
    type: 'camionette',
    capaciteKg: 1500,
    statut: 'disponible',
    entrepotId: 'entrepot-a',
  },
  {
    id: 'veh-a-003',
    immatriculation: '54239-C-6',
    type: '4x4',
    capaciteKg: 900,
    statut: 'disponible',
    entrepotId: 'entrepot-a',
  },
  {
    id: 'veh-a-004',
    immatriculation: '54240-D-6',
    type: 'camion',
    capaciteKg: 5000,
    statut: 'maintenance',
    entrepotId: 'entrepot-a',
  },
];

// ============================================================================
// DISTRIBUTEURS - Entrepôt A uniquement
// ============================================================================
export const DISTRIBUTEURS_ENTREPOT_A = [
  {
    id: 'dist-a-001',
    prenom: 'Ahmed',
    nom: 'Benali',
    email: 'ahmed.benali@najda.ma',
    telephone: '+212 612 345 678',
    statut: 'en_mission',
    entrepotId: 'entrepot-a',
    vehiculeAssigneId: 'veh-a-001',
    missionsCompletes: 12,
  },
  {
    id: 'dist-a-002',
    prenom: 'Youssef',
    nom: 'Alaoui',
    email: 'youssef.alaoui@najda.ma',
    telephone: '+212 634 567 890',
    statut: 'disponible',
    entrepotId: 'entrepot-a',
    vehiculeAssigneId: 'veh-a-002',
    missionsCompletes: 15,
  },
  {
    id: 'dist-a-003',
    prenom: 'Mohammed',
    nom: 'Tazi',
    email: 'mohammed.tazi@najda.ma',
    telephone: '+212 645 678 901',
    statut: 'disponible',
    entrepotId: 'entrepot-a',
    vehiculeAssigneId: 'veh-a-003',
    missionsCompletes: 6,
  },
];

// ============================================================================
// ÉTAPES VRP pour Entrepôt A
// ============================================================================
const ETAPES_TOURNEE_A1 = [
  { ordre: 1, douarNom: 'Aska', commune: 'Akdi n\'Lkhir', lat: 31.9523, lng: -6.5124, population: 264, menages: 48 },
  { ordre: 2, douarNom: 'Takout', commune: 'Akdi n\'Lkhir', lat: 31.9487, lng: -6.5089, population: 198, menages: 36 },
  { ordre: 3, douarNom: 'Ait Ouadrim', commune: 'Ait Abbas', lat: 32.0156, lng: -6.6345, population: 231, menages: 42 },
  { ordre: 4, douarNom: 'Tizguit', commune: 'Ait Abbas', lat: 32.0234, lng: -6.6289, population: 154, menages: 28 },
  { ordre: 5, douarNom: 'Tighanimin', commune: 'Ait Bou Oulli', lat: 31.9876, lng: -6.7234, population: 302, menages: 55 },
  { ordre: 6, douarNom: 'Ait Said Ichou', commune: 'Foum Oudi', lat: 32.2987, lng: -6.4234, population: 785, menages: 166 },
  { ordre: 7, douarNom: 'Ait Lahcen', commune: 'Foum Oudi', lat: 32.3034, lng: -6.4189, population: 231, menages: 42 },
];

// ============================================================================
// TOURNÉES - Entrepôt A uniquement
// ============================================================================
export const TOURNEES_ENTREPOT_A = [
  {
    id: 'tournee-a-001',
    missionId: 'mission-a-001',
    missionNumero: 'MS-A-2026-001',
    entrepotId: 'entrepot-a',
    entrepot: { id: 'entrepot-a', nom: 'Entrepôt A', province: 'Azilal' },
    vehiculeId: 'veh-a-001',
    distributeur: { id: 'dist-a-001', nom: 'Benali', prenom: 'Ahmed' },
    distanceTotale: 145.5,
    tempsEstimeTotalMin: 240,
    tempsEstime: 240,
    statut: 'en_cours',
    criseId: 'crise-2026-001',
    dateDebut: '2026-04-04T08:00:00Z',
    etapes: ETAPES_TOURNEE_A1.map((e, i) => ({
      id: `etape-a1-${i + 1}`,
      ordre: e.ordre,
      douarId: `douar-a-${i + 1}`,
      douar: { nom: e.douarNom, commune: e.commune, province: 'Azilal' },
      douarNom: e.douarNom,
      lat: e.lat,
      lng: e.lng,
      distanceKm: i === 0 ? 0 : parseFloat((8 + Math.random() * 12).toFixed(1)),
      tempsEstimeMin: i === 0 ? 0 : Math.floor(15 + Math.random() * 20),
      priorite: i < 2 ? 'CRITIQUE' : i < 4 ? 'HAUTE' : i < 6 ? 'MOYENNE' : 'BASSE',
      scoreTopsis: parseFloat((0.95 - i * 0.12).toFixed(3)),
      population: e.population,
      menages: e.menages,
      statut: i === 0 ? 'en_route' : i === 1 ? 'livree' : 'en_attente',
      ressources: {
        tentes: Math.floor(e.menages * 0.6),
        couvertures: e.menages * 4,
        vivres: e.menages * 2,
        kits_med: Math.floor(e.menages * 0.3),
        eau_litres: e.population * 5,
      },
    })),
  },
  {
    id: 'tournee-a-002',
    missionId: 'mission-a-002',
    missionNumero: 'MS-A-2026-002',
    entrepotId: 'entrepot-a',
    entrepot: { id: 'entrepot-a', nom: 'Entrepôt A', province: 'Azilal' },
    vehiculeId: 'veh-a-002',
    distributeur: { id: 'dist-a-002', nom: 'Alaoui', prenom: 'Youssef' },
    distanceTotale: 98.7,
    tempsEstimeTotalMin: 165,
    tempsEstime: 165,
    statut: 'planifiee',
    criseId: 'crise-2026-001',
    datePlanification: '2026-04-05T08:00:00Z',
    etapes: [
      { ordre: 1, douarNom: 'Ait Jilali', commune: 'Ain Kaicher', lat: 32.8678, lng: -6.9123, population: 637, menages: 168 },
      { ordre: 2, douarNom: 'Sidi Moussa', commune: 'Ain Kaicher', lat: 32.8734, lng: -6.9078, population: 209, menages: 38 },
      { ordre: 3, douarNom: 'Ait Mhand', commune: 'Ait Ishaq', lat: 32.9234, lng: -5.6789, population: 396, menages: 72 },
      { ordre: 4, douarNom: 'Tizgui', commune: 'Ait Ishaq', lat: 32.9289, lng: -5.6734, population: 264, menages: 48 },
      { ordre: 5, douarNom: 'Tizi n\'Dra', commune: 'Foum Jemaa', lat: 32.1567, lng: -6.5234, population: 192, menages: 35 },
    ].map((e, i) => ({
      id: `etape-a2-${i + 1}`,
      ordre: e.ordre,
      douarId: `douar-a2-${i + 1}`,
      douar: { nom: e.douarNom, commune: e.commune, province: i < 2 ? 'Khouribga' : 'Khénifra' },
      douarNom: e.douarNom,
      lat: e.lat,
      lng: e.lng,
      distanceKm: i === 0 ? 0 : parseFloat((10 + Math.random() * 15).toFixed(1)),
      tempsEstimeMin: i === 0 ? 0 : Math.floor(20 + Math.random() * 25),
      priorite: i < 2 ? 'HAUTE' : 'MOYENNE',
      scoreTopsis: parseFloat((0.85 - i * 0.15).toFixed(3)),
      population: e.population,
      menages: e.menages,
      statut: 'en_attente',
      ressources: {
        tentes: Math.floor(e.menages * 0.5),
        couvertures: e.menages * 3,
        vivres: e.menages * 2,
        kits_med: Math.floor(e.menages * 0.25),
        eau_litres: e.population * 4,
      },
    })),
  },
  {
    id: 'tournee-a-003',
    missionId: 'mission-a-003',
    missionNumero: 'MS-A-2026-003',
    entrepotId: 'entrepot-a',
    entrepot: { id: 'entrepot-a', nom: 'Entrepôt A', province: 'Azilal' },
    vehiculeId: 'veh-a-003',
    distributeur: { id: 'dist-a-003', nom: 'Tazi', prenom: 'Mohammed' },
    distanceTotale: 134.8,
    tempsEstimeTotalMin: 225,
    tempsEstime: 225,
    statut: 'planifiee',
    criseId: 'crise-2026-001',
    datePlanification: '2026-04-06T08:00:00Z',
    etapes: [
      { ordre: 1, douarNom: 'Takout', commune: 'Akdi n\'Lkhir', lat: 31.9487, lng: -6.5089, population: 198, menages: 36 },
      { ordre: 2, douarNom: 'Ait Berk', commune: 'Akdi n\'Lkhir', lat: 31.9456, lng: -6.5023, population: 245, menages: 44 },
      { ordre: 3, douarNom: 'Taddart', commune: 'Azilal', lat: 31.9623, lng: -6.5845, population: 312, menages: 58 },
      { ordre: 4, douarNom: 'Tamda', commune: 'Azilal', lat: 31.9589, lng: -6.5798, population: 178, menages: 32 },
    ].map((e, i) => ({
      id: `etape-a3-${i + 1}`,
      ordre: e.ordre,
      douarId: `douar-a3-${i + 1}`,
      douar: { nom: e.douarNom, commune: e.commune, province: 'Azilal' },
      douarNom: e.douarNom,
      lat: e.lat,
      lng: e.lng,
      distanceKm: i === 0 ? 0 : parseFloat((6 + Math.random() * 8).toFixed(1)),
      tempsEstimeMin: i === 0 ? 0 : Math.floor(12 + Math.random() * 15),
      priorite: i === 0 ? 'CRITIQUE' : 'HAUTE',
      scoreTopsis: parseFloat((0.92 - i * 0.18).toFixed(3)),
      population: e.population,
      menages: e.menages,
      statut: 'en_attente',
      ressources: {
        tentes: Math.floor(e.menages * 0.7),
        couvertures: e.menages * 5,
        vivres: e.menages * 3,
        kits_med: Math.floor(e.menages * 0.4),
        eau_litres: e.population * 6,
      },
    })),
  },
  {
    id: 'tournee-a-004',
    missionId: 'mission-a-004',
    missionNumero: 'MS-A-2026-004',
    entrepotId: 'entrepot-a',
    entrepot: { id: 'entrepot-a', nom: 'Entrepôt A', province: 'Azilal' },
    vehiculeId: null,
    distributeur: null,
    distanceTotale: 0,
    tempsEstimeTotalMin: 0,
    tempsEstime: 0,
    statut: 'planifiee',
    criseId: 'crise-2026-001',
    datePlanification: null,
    etapes: [],
  },
];

// ============================================================================
// STATS KPI pour Entrepôt A
// ============================================================================
export const STATS_ENTREPOT_A = {
  stockTotal: STOCK_ENTREPOT_A.length,
  stockAlertes: STOCK_ENTREPOT_A.filter(s => s.quantite <= s.seuilAlerte).length,
  vehiculesTotal: VEHICULES_ENTREPOT_A.length,
  vehiculesEnMission: VEHICULES_ENTREPOT_A.filter(v => v.statut === 'en_mission').length,
  vehiculesDisponibles: VEHICULES_ENTREPOT_A.filter(v => v.statut === 'disponible').length,
  vehiculesMaintenance: VEHICULES_ENTREPOT_A.filter(v => v.statut === 'maintenance').length,
  tourneesTotal: TOURNEES_ENTREPOT_A.length,
  tourneesEnCours: TOURNEES_ENTREPOT_A.filter(t => t.statut === 'en_cours').length,
  tourneesPlanifiees: TOURNEES_ENTREPOT_A.filter(t => t.statut === 'planifiee').length,
  tourneesTerminees: TOURNEES_ENTREPOT_A.filter(t => t.statut === 'terminee').length,
  distributeursTotal: DISTRIBUTEURS_ENTREPOT_A.length,
  distributeursEnMission: DISTRIBUTEURS_ENTREPOT_A.filter(d => d.statut === 'en_mission').length,
};
