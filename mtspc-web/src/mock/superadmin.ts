/**
 * MOCK DATA — SuperAdmin
 * ======================
 * Vue régionale avec entrepôts et audit logs
 */

import type { Entrepot, AuditLog } from '../types';

// Coordonnées des provinces de Béni Mellal-Khénifra
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
    code: 'ENT-FBS-001',
    nom: 'Entrepôt Fquih Ben Salah',
    province: 'Fquih Ben Salah',
    wilaya: 'Béni Mellal-Khénifra',
    statut: 'actif',
    latitude: 32.5015,
    longitude: -6.6915,
  },
  {
    id: 'entrepot-3',
    code: 'ENT-BML-001',
    nom: 'Entrepôt Béni Mellal',
    province: 'Béni Mellal',
    wilaya: 'Béni Mellal-Khénifra',
    statut: 'surcharge',
    latitude: 32.3361,
    longitude: -6.3498,
  },
  {
    id: 'entrepot-4',
    code: 'ENT-KHB-001',
    nom: 'Entrepôt Khouribga',
    province: 'Khouribga',
    wilaya: 'Béni Mellal-Khénifra',
    statut: 'actif',
    latitude: 32.8815,
    longitude: -6.9063,
  },
  {
    id: 'entrepot-5',
    code: 'ENT-KHF-001',
    nom: 'Entrepôt Khénifra',
    province: 'Khénifra',
    wilaya: 'Béni Mellal-Khénifra',
    statut: 'actif',
    latitude: 32.9369,
    longitude: -5.6685,
  },
  {
    id: 'entrepot-6',
    code: 'ENT-MDK-001',
    nom: 'Entrepôt Midelt',
    province: 'Midelt',
    wilaya: 'Béni Mellal-Khénifra',
    statut: 'inactif',
    latitude: 32.6854,
    longitude: -4.7500,
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
