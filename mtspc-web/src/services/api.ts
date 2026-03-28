/**
 * CLIENT AXIOS — Injecte automatiquement le JWT dans chaque requête API
 * =====================================================================
 *
 * Toutes les requêtes vers le backend NestJS passent par ce client.
 * Il récupère le token frais depuis Keycloak avant chaque appel.
 */
import axios from 'axios';
import keycloak from '../keycloak';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:9090/api/v1',
});

// Injecter le JWT Bearer dans chaque requête sortante
api.interceptors.request.use(async (config) => {
  // Renouveler le token s'il expire dans moins de 30 secondes
  try {
    await keycloak.updateToken(30);
  } catch {
    keycloak.logout();
    return Promise.reject(new Error('Session expirée'));
  }

  if (keycloak.token) {
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }
  return config;
});

// ── Appels API métier ────────────────────────────────────────────────────────

export const stockApi = {
  getAll: () =>
    api.get<StockRow[]>('/stocks').then((r) => r.data),
};

export const missionApi = {
  getAll:  () =>
    api.get<Mission[]>('/missions').then((r) => r.data),
  create: (dto: CreateMissionDto) =>
    api.post<Mission>('/missions', dto).then((r) => r.data),
};

export const auditApi = {
  getLogs: (params?: { page?: number; limit?: number; entrepotId?: string; operation?: string }) =>
    api.get<AuditLogsResponse>('/audit', { params }).then((r) => r.data),
};

export const entrepotApi = {
  getAll: () =>
    api.get<Entrepot[]>('/entrepots').then((r) => r.data),
};

export const distributeurApi = {
  getAll: () =>
    api.get<Distributeur[]>('/distributeurs').then((r) => r.data),
};

export const materielApi = {
  getAll: () =>
    api.get<Materiel[]>('/materiels').then((r) => r.data),
};

// ── Types partagés ────────────────────────────────────────────────────────────

export interface StockRow {
  id:           string;
  entrepot:     { id: string; nom: string; province: string };
  materiel:     { id: string; nom: string; categorie: string; unite: string };
  quantite:     number;
  seuilAlerte:  number;
  updatedAt:    string;
}

export interface Mission {
  id:              string;
  numeroMission:   string;
  destinationNom:  string;
  statut:          'draft' | 'pending' | 'in_progress' | 'completed' | 'annulee';
  priorite:        'low' | 'medium' | 'high' | 'critique';
  dateEcheance:    string;
  distributeur?:   { id: string; nom: string; prenom: string };
  createdAt:       string;
}

export interface CreateMissionDto {
  entrepotSourceId: string;
  distributeurId:   string;
  destinationNom:   string;
  destinationLat?:  number;
  destinationLng?:  number;
  priorite:         string;
  dateEcheance:     string;
  notes?:           string;
  items: { materielId: string; quantitePrevue: number }[];
}

export interface AuditLog {
  id:           number;
  tableCible:   string;
  operation:    'INSERT' | 'UPDATE' | 'DELETE';
  recordId:     string;
  valeursApres: Record<string, any> | null;
  acteurUserId: string;
  acteurRole:   string;
  acteurEmail:  string | null;
  ipAddress:    string | null;
  createdAt:    string;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  meta: { total: number; page: number; totalPages: number };
}

export interface Entrepot {
  id:        string;
  code:      string;
  nom:       string;
  wilaya:    string;
  province:  string;
  latitude:  number;
  longitude: number;
  statut:    string;
}

export interface Distributeur {
  id:       string;
  nom:      string;
  prenom:   string;
  statut:   string;
}

export interface Materiel {
  id:        string;
  nom:       string;
  categorie: string;
  unite:     string;
}

export default api;
