/**
 * MOCK DATA — Véhicules de transport
 * ==================================
 */

export interface Vehicule {
  id: string;
  immatriculation: string;
  type: '4x4' | 'camionette' | 'camion' | 'moto';
  capaciteKg: number;
  statut: 'disponible' | 'en_mission' | 'maintenance' | 'hors_service';
  entrepotId: string;
  localisation?: {
    lat: number;
    lng: number;
  };
}

export const MOCK_VEHICULES: Vehicule[] = [
  {
    id: 'veh-001',
    immatriculation: '54237-A-6',
    type: '4x4',
    capaciteKg: 800,
    statut: 'en_mission',
    entrepotId: 'entrepot-1',
    localisation: { lat: 32.45, lng: -6.62 },
  },
  {
    id: 'veh-002',
    immatriculation: '54321-B-6',
    type: 'camionette',
    capaciteKg: 1500,
    statut: 'disponible',
    entrepotId: 'entrepot-1',
  },
  {
    id: 'veh-003',
    immatriculation: '55123-A-6',
    type: '4x4',
    capaciteKg: 900,
    statut: 'disponible',
    entrepotId: 'entrepot-2',
  },
  {
    id: 'veh-004',
    immatriculation: '55234-B-6',
    type: 'camion',
    capaciteKg: 5000,
    statut: 'en_mission',
    entrepotId: 'entrepot-2',
    localisation: { lat: 32.38, lng: -6.71 },
  },
  {
    id: 'veh-005',
    immatriculation: '56111-C-6',
    type: '4x4',
    capaciteKg: 850,
    statut: 'maintenance',
    entrepotId: 'entrepot-1',
  },
  {
    id: 'veh-006',
    immatriculation: '56222-D-6',
    type: 'camionette',
    capaciteKg: 1200,
    statut: 'disponible',
    entrepotId: 'entrepot-2',
  },
];
