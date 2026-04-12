/**
 * MOCK DATA — SuperAdmin
 * ======================
 * Vue régionale avec entrepôts et audit logs
 */

import type { Entrepot, AuditLog, AdminEntrepot } from '../types';

// Deux entrepôts dans la région Béni Mellal-Khénifra
export const MOCK_ENTREPOTS: Entrepot[] = [
  {
    id: 'entrepot-1',
    code: 'ENT-AZL-001',
    nom: 'Entrepôt Régional Azilal',
    province: 'Azilal',
    wilaya: 'Béni Mellal-Khénifra',
    statut: 'actif',
    latitude: 31.9615,
    longitude: -6.5717,
  },
  {
    id: 'entrepot-2',
    code: 'ENT-KTD-001',
    nom: 'Entrepôt Ouled Saïd El Oued',
    province: 'Kasbat Tadla',
    wilaya: 'Béni Mellal-Khénifra',
    commune: 'Ouled Saïd El Oued',
    cercle: 'Kasbat Tadla',
    routeProximite: 'RR-309 (Fquih Ben Saleh – Oued Zem)',
    extensionLancee: 'juillet 2025',
    budgetExtension: '13,4 MDH',
    statut: 'actif',
    latitude: 32.6100,
    longitude: -6.2700,
  },
];

// Audit logs simulés
export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 1,
    operation: 'INSERT',
    tableCible: 'missions',
    recordId: 'mission-002',
    acteurUserId: 'admin-1',
    acteurEmail: 'admin@najda.ma',
    acteurRole: 'ADMIN_ENTREPOT',
    ipAddress: '192.168.1.10',
    valeursApres: { numeroMission: 'MS-2026-002', statut: 'pending', priorite: 'critique' },
    createdAt: '2026-04-04T09:30:15Z',
  },
  {
    id: 2,
    operation: 'UPDATE',
    tableCible: 'missions',
    recordId: 'mission-002',
    acteurUserId: 'distributeur-2',
    acteurEmail: 'karim.idrissi@najda.ma',
    acteurRole: 'DISTRIBUTEUR',
    ipAddress: '192.168.1.25',
    valeursApres: { statut: 'in_progress', dateDebut: '2026-04-04T10:00:00Z' },
    createdAt: '2026-04-04T10:05:42Z',
  },
  {
    id: 3,
    operation: 'INSERT',
    tableCible: 'stock',
    recordId: 'stock-5',
    acteurUserId: 'admin-1',
    acteurEmail: 'admin@najda.ma',
    acteurRole: 'ADMIN_ENTREPOT',
    ipAddress: '192.168.1.10',
    valeursApres: { materiel: 'Kits médicaux', quantite: 350, entrepot: 'Entrepôt A' },
    createdAt: '2026-04-04T08:20:33Z',
  },
  {
    id: 4,
    operation: 'UPDATE',
    tableCible: 'missions',
    recordId: 'mission-006',
    acteurUserId: 'superadmin-1',
    acteurEmail: 'superadmin@najda.ma',
    acteurRole: 'SUPER_ADMIN',
    ipAddress: '10.0.0.15',
    valeursApres: { statut: 'annulee', raison: 'Conditions météo défavorables' },
    createdAt: '2026-04-03T16:45:10Z',
  },
  {
    id: 5,
    operation: 'DELETE',
    tableCible: 'utilisateurs',
    recordId: 'user-123',
    acteurUserId: 'superadmin-1',
    acteurEmail: 'superadmin@najda.ma',
    acteurRole: 'SUPER_ADMIN',
    ipAddress: '10.0.0.15',
    valeursApres: null,
    createdAt: '2026-04-03T14:22:08Z',
  },
  {
    id: 6,
    operation: 'UPDATE',
    tableCible: 'stock',
    recordId: 'stock-3',
    acteurUserId: 'admin-1',
    acteurEmail: 'admin@najda.ma',
    acteurRole: 'ADMIN_ENTREPOT',
    ipAddress: '192.168.1.10',
    valeursApres: { quantite: 85 },
    createdAt: '2026-04-03T12:10:55Z',
  },
  {
    id: 7,
    operation: 'INSERT',
    tableCible: 'missions',
    recordId: 'mission-001',
    acteurUserId: 'admin-1',
    acteurEmail: 'admin@najda.ma',
    acteurRole: 'ADMIN_ENTREPOT',
    ipAddress: '192.168.1.10',
    valeursApres: { numeroMission: 'MS-2026-001', statut: 'pending', priorite: 'high' },
    createdAt: '2026-04-03T09:15:20Z',
  },
  {
    id: 8,
    operation: 'UPDATE',
    tableCible: 'missions',
    recordId: 'mission-003',
    acteurUserId: 'distributeur-3',
    acteurEmail: 'youssef.alaoui@najda.ma',
    acteurRole: 'DISTRIBUTEUR',
    ipAddress: '192.168.1.30',
    valeursApres: { statut: 'completed', etapeActuelle: 7, dateFin: '2026-04-01T17:30:00Z' },
    createdAt: '2026-04-01T17:35:00Z',
  },
  {
    id: 9,
    operation: 'INSERT',
    tableCible: 'tournees',
    recordId: 'tournee-002',
    acteurUserId: 'admin-1',
    acteurEmail: 'admin@najda.ma',
    acteurRole: 'ADMIN_ENTREPOT',
    ipAddress: '192.168.1.10',
    valeursApres: { missionId: 'mission-002', etapes: 7, statut: 'planifiee' },
    createdAt: '2026-04-04T09:45:00Z',
  },
  {
    id: 10,
    operation: 'UPDATE',
    tableCible: 'tournees',
    recordId: 'tournee-002',
    acteurUserId: 'distributeur-2',
    acteurEmail: 'karim.idrissi@najda.ma',
    acteurRole: 'DISTRIBUTEUR',
    ipAddress: '192.168.1.25',
    valeursApres: { statut: 'en_cours', etapeActuelle: 1, dateDebut: '2026-04-04T10:15:00Z' },
    createdAt: '2026-04-04T10:20:18Z',
  },
];

export const MOCK_USERS: AdminEntrepot[] = [
  {
    id: 'user-ae-001',
    username: 'admin.azilal',
    email: 'admin.azilal@najda.ma',
    firstName: 'Hassan',
    lastName: 'Bouyahya',
    enabled: true,
    entrepotId: 'entrepot-1',
    createdAt: 1709200000000,
  },
  {
    id: 'user-ae-002',
    username: 'admin.benimellal',
    email: 'admin.benimellal@najda.ma',
    firstName: 'Rachid',
    lastName: 'Moussaoui',
    enabled: true,
    entrepotId: 'entrepot-2',
    createdAt: 1709300000000,
  },
  {
    id: 'user-ae-006',
    username: 'admin.nouveau',
    email: 'nouveau@najda.ma',
    firstName: 'Khalid',
    lastName: 'Bensouda',
    enabled: true,
    entrepotId: null,
    createdAt: 1712000000000,
  },
];

export const mockSuperAdminApi = {
  getEntrepots: () => Promise.resolve([...MOCK_ENTREPOTS]),
  getAuditLogs: (params?: { page?: number; limit?: number; operation?: string }) => {
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
      meta: { total: logs.length },
    });
  },
};
