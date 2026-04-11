/**
 * MOCK DATA — Entrepôts A et B pour Admin
 * =======================================
 */

import type { Entrepot } from '../types';

export const MOCK_ENTREPOT_A: Entrepot = {
  id: 'entrepot-a',
  code: 'ENT-A-001',
  nom: 'Entrepôt A',
  province: 'Azilal',
  wilaya: 'Béni Mellal-Khénifra',
  statut: 'actif',
  latitude: 31.9615,
  longitude: -6.5717,
};

export const MOCK_ENTREPOT_B: Entrepot = {
  id: 'entrepot-b',
  code: 'ENT-B-001',
  nom: 'Entrepôt B',
  province: 'Fquih Ben Salah',
  wilaya: 'Béni Mellal-Khénifra',
  statut: 'actif',
  latitude: 32.5015,
  longitude: -6.6915,
};

export const MOCK_ENTREPOTS_ADMIN: Entrepot[] = [MOCK_ENTREPOT_A, MOCK_ENTREPOT_B];
