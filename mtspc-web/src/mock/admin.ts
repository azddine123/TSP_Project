/**
 * MOCK DATA — Admin Entrepôt
 * ===========================
 */

import type { StockRow, Mission } from '../types';

export const MOCK_STOCK: StockRow[] = [
  {
    id: 'stock-1',
    entrepot: { id: 'entrepot-1', nom: 'Entrepôt A', province: 'Azilal' },
    materiel: { id: 'mat-1', nom: 'Tentes familiales', categorie: 'TENTE', unite: 'unité' },
    quantite: 500,
    seuilAlerte: 100,
    updatedAt: '2026-04-04T10:30:00Z',
  },
  {
    id: 'stock-2',
    entrepot: { id: 'entrepot-1', nom: 'Entrepôt A', province: 'Azilal' },
    materiel: { id: 'mat-2', nom: 'Couvertures thermiques', categorie: 'EQUIPEMENT', unite: 'unité' },
    quantite: 2000,
    seuilAlerte: 500,
    updatedAt: '2026-04-04T09:15:00Z',
  },
  {
    id: 'stock-3',
    entrepot: { id: 'entrepot-1', nom: 'Entrepôt A', province: 'Azilal' },
    materiel: { id: 'mat-3', nom: 'Kits alimentaires', categorie: 'NOURRITURE', unite: 'kit' },
    quantite: 85,
    seuilAlerte: 100,
    updatedAt: '2026-04-03T16:45:00Z',
  },
  {
    id: 'stock-4',
    entrepot: { id: 'entrepot-1', nom: 'Entrepôt A', province: 'Azilal' },
    materiel: { id: 'mat-4', nom: 'Eau potable', categorie: 'EAU', unite: 'litre' },
    quantite: 1200,
    seuilAlerte: 300,
    updatedAt: '2026-04-04T11:00:00Z',
  },
  {
    id: 'stock-5',
    entrepot: { id: 'entrepot-1', nom: 'Entrepôt A', province: 'Azilal' },
    materiel: { id: 'mat-5', nom: 'Kits médicaux', categorie: 'MEDICAMENT', unite: 'kit' },
    quantite: 350,
    seuilAlerte: 50,
    updatedAt: '2026-04-04T08:20:00Z',
  },
  {
    id: 'stock-6',
    entrepot: { id: 'entrepot-2', nom: 'Entrepôt B', province: 'Fquih Ben Salah' },
    materiel: { id: 'mat-1', nom: 'Tentes familiales', categorie: 'TENTE', unite: 'unité' },
    quantite: 45,
    seuilAlerte: 80,
    updatedAt: '2026-04-03T14:30:00Z',
  },
  {
    id: 'stock-7',
    entrepot: { id: 'entrepot-2', nom: 'Entrepôt B', province: 'Fquih Ben Salah' },
    materiel: { id: 'mat-2', nom: 'Couvertures thermiques', categorie: 'EQUIPEMENT', unite: 'unité' },
    quantite: 800,
    seuilAlerte: 200,
    updatedAt: '2026-04-04T10:00:00Z',
  },
  {
    id: 'stock-8',
    entrepot: { id: 'entrepot-2', nom: 'Entrepôt B', province: 'Fquih Ben Salah' },
    materiel: { id: 'mat-6', nom: 'Kits d\'hygiène', categorie: 'MEDICAMENT', unite: 'kit' },
    quantite: 1500,
    seuilAlerte: 400,
    updatedAt: '2026-04-04T09:45:00Z',
  },
];

// Missions enrichies avec distributeurs
export const MOCK_ADMIN_MISSIONS: Mission[] = [
  {
    id: 'mission-001',
    numeroMission: 'MS-2026-001',
    statut: 'pending',
    priorite: 'high',
    dateEcheance: '2026-04-10T18:00:00Z',
    destinationNom: 'Aska, Akdi n\'Lkhir',
    distributeur: { id: 'dist-001', prenom: 'Ahmed', nom: 'Benali' },
    createdAt: '2026-04-01T08:00:00Z',
  },
  {
    id: 'mission-002',
    numeroMission: 'MS-2026-002',
    statut: 'in_progress',
    priorite: 'critique',
    dateEcheance: '2026-04-05T12:00:00Z',
    destinationNom: 'Ouled Bouazza, Ouled Bourhmoun',
    distributeur: { id: 'dist-002', prenom: 'Karim', nom: 'Idrissi' },
    createdAt: '2026-04-02T10:30:00Z',
  },
  {
    id: 'mission-003',
    numeroMission: 'MS-2026-003',
    statut: 'completed',
    priorite: 'medium',
    dateEcheance: '2026-04-01T17:00:00Z',
    destinationNom: 'Ait Said Ichou, Foum Oudi',
    distributeur: { id: 'dist-003', prenom: 'Youssef', nom: 'Alaoui' },
    createdAt: '2026-03-28T09:00:00Z',
  },
  {
    id: 'mission-004',
    numeroMission: 'MS-2026-004',
    statut: 'pending',
    priorite: 'low',
    dateEcheance: '2026-04-15T16:00:00Z',
    destinationNom: 'Ait Jilali, Ain Kaicher',
    createdAt: '2026-04-03T14:00:00Z',
  },
  {
    id: 'mission-005',
    numeroMission: 'MS-2026-005',
    statut: 'pending',
    priorite: 'high',
    dateEcheance: '2026-04-08T14:00:00Z',
    destinationNom: 'Ait Mhand, Ait Ishaq',
    createdAt: '2026-04-04T07:45:00Z',
  },
  {
    id: 'mission-006',
    numeroMission: 'MS-2026-006',
    statut: 'annulee',
    priorite: 'medium',
    dateEcheance: '2026-04-06T10:00:00Z',
    destinationNom: 'Takout, Akdi n\'Lkhir',
    createdAt: '2026-04-01T11:00:00Z',
  },
];

export const mockAdminApi = {
  getStock: () => Promise.resolve([...MOCK_STOCK]),
  getMissions: () => Promise.resolve([...MOCK_ADMIN_MISSIONS]),
};
