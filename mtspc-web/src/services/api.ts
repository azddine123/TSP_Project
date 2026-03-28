/**
 * CLIENT AXIOS — Injecte automatiquement le JWT dans chaque requête API
 * =====================================================================
 * Toutes les requêtes vers le backend NestJS passent par ce client.
 * Les types sont définis dans src/types/index.ts (source unique de vérité).
 */
import axios, { AxiosError } from 'axios';
import keycloak from '../keycloak';

// ── Ré-export des types pour la rétrocompatibilité des imports existants ───────
export type {
  StockRow,
  Mission,
  CreateMissionDto,
  AuditLog,
  AuditLogsResponse,
  Entrepot,
  Distributeur,
  Materiel,
  MissionStatut,
  MissionPriorite,
  AuditOperation,
  EntrepotStatut,
  UserRole,
} from '../types';

// ── Instance Axios ─────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:9090/api/v1',
});

// ── Intercepteur : inject JWT Bearer, refresh automatique ─────────────────────

api.interceptors.request.use(async (config) => {
  try {
    await keycloak.updateToken(30);
  } catch {
    keycloak.logout();
    return Promise.reject(new Error('Session expirée — veuillez vous reconnecter.'));
  }

  if (keycloak.token) {
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }
  return config;
});

// ── Gestion d'erreurs normalisée ───────────────────────────────────────────────

/**
 * Extrait un message lisible depuis une AxiosError ou une Error générique.
 * À utiliser dans les blocs catch des composants.
 */
export function getApiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
    if (err.response?.status === 401) return 'Session expirée — veuillez vous reconnecter.';
    if (err.response?.status === 403) return 'Vous n\'avez pas les droits pour cette action.';
    if (err.response?.status === 404) return 'Ressource introuvable.';
    if (err.response?.status && err.response.status >= 500)
      return 'Erreur serveur — contactez l\'administrateur.';
  }
  return 'Une erreur inattendue est survenue.';
}

// ── Appels API métier ──────────────────────────────────────────────────────────

import type {
  StockRow, Mission, CreateMissionDto,
  AuditLogsResponse, Entrepot, Distributeur, Materiel,
} from '../types';

export const stockApi = {
  getAll: () => api.get<StockRow[]>('/stocks').then((r) => r.data),
};

export const missionApi = {
  getAll:  ()                     => api.get<Mission[]>('/missions').then((r) => r.data),
  create:  (dto: CreateMissionDto) => api.post<Mission>('/missions', dto).then((r) => r.data),
};

export const auditApi = {
  getLogs: (params?: {
    page?:       number;
    limit?:      number;
    entrepotId?: string;
    operation?:  string;
  }) => api.get<AuditLogsResponse>('/audit', { params }).then((r) => r.data),
};

export const entrepotApi = {
  getAll: () => api.get<Entrepot[]>('/entrepots').then((r) => r.data),
};

export const distributeurApi = {
  getAll: () => api.get<Distributeur[]>('/distributeurs').then((r) => r.data),
};

export const materielApi = {
  getAll: () => api.get<Materiel[]>('/materiels').then((r) => r.data),
};

export default api;
