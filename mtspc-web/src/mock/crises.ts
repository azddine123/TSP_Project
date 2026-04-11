/**
 * MOCK DATA — Crises / Situations d'urgence
 * =========================================
 */

import type { Crise, DouarSeverite } from '../types';
import { MOCK_DOUBLES } from './douars';

const d = (id: string) => MOCK_DOUBLES.find(x => x.id === id)!;

const sev = (id: string, criseId: string, severite: number, vulnerabilite: number, accessibilite: number, accesSoins: number): DouarSeverite => ({
  id: `sev-${criseId}-${id}`,
  criseId,
  douar: d(id),
  severite,
  vulnerabilite,
  accessibilite,
  accesSoins,
});

export const MOCK_CRISES: Crise[] = [
  {
    id: 'crise-001',
    reference: 'CRISE-2026-001',
    type: 'SEISME',
    zone: 'Province Azilal',
    description: 'Tremblement de terre de magnitude 5.2, dommages structurels dans plusieurs douars',
    statut: 'active',
    declencheParId: 'superadmin-1',
    declencheParUsername: 'superadmin',
    createdAt: '2026-03-15T08:30:00Z',
    clotureeAt: null,
    severitesParDouar: [
      sev('douar-810301201001', 'crise-001', 8, 0.9, 0.3, 0.2),
      sev('douar-810301202002', 'crise-001', 7, 0.8, 0.4, 0.3),
      sev('douar-810302102004', 'crise-001', 6, 0.7, 0.2, 0.2),
    ],
  },
  {
    id: 'crise-002',
    reference: 'CRISE-2026-002',
    type: 'INONDATION',
    zone: 'Province Fquih Ben Salah',
    description: 'Crues soudaines suite aux fortes pluies, accès coupés à plusieurs villages',
    statut: 'active',
    declencheParId: 'superadmin-1',
    declencheParUsername: 'superadmin',
    createdAt: '2026-03-28T14:00:00Z',
    clotureeAt: null,
    severitesParDouar: [
      sev('douar-810502301006', 'crise-002', 7, 0.8, 0.4, 0.3),
      sev('douar-810503102009', 'crise-002', 5, 0.6, 0.5, 0.4),
    ],
  },
  {
    id: 'crise-003',
    reference: 'CRISE-2026-003',
    type: 'GLISSEMENT',
    zone: 'Province Khénifra',
    description: 'Glissement de terrain mineur, 3 maisons endommagées',
    statut: 'cloturee',
    declencheParId: 'superadmin-1',
    declencheParUsername: 'superadmin',
    createdAt: '2026-03-10T09:00:00Z',
    clotureeAt: '2026-03-20T16:00:00Z',
    severitesParDouar: [
      sev('douar-810901102016', 'crise-003', 4, 0.7, 0.3, 0.2),
    ],
  },
];
