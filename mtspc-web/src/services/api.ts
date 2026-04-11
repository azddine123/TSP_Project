/**
 * CLIENT AXIOS — Injecte automatiquement le JWT dans chaque requête API.
 * Couvre l'ensemble des modules : existants + nouveaux (Crises, Algo, Supervision…)
 */
import axios, { AxiosError } from 'axios';

// ── Instance Axios ─────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:9090/api/v1',
});

// ── Intercepteur : inject JWT depuis localStorage ──────────────────────────────
// (AuthContext stocke le token dans localStorage['reliefchain_token'])

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('reliefchain_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Intercepteur réponse : déconnexion sur 401 ────────────────────────────────

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('reliefchain_token');
      localStorage.removeItem('reliefchain_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  },
);

// ── Gestion d'erreurs normalisée ───────────────────────────────────────────────

export function getApiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message;
    if (Array.isArray(msg))         return msg.join(', ');
    if (typeof msg === 'string')    return msg;
    if (err.response?.status === 401) return 'Session expirée — veuillez vous reconnecter.';
    if (err.response?.status === 403) return "Vous n'avez pas les droits pour cette action.";
    if (err.response?.status === 404) return 'Ressource introuvable.';
    if (err.response?.status && err.response.status >= 500)
      return "Erreur serveur — contactez l'administrateur.";
  }
  return 'Une erreur inattendue est survenue.';
}

// ── Import des types ───────────────────────────────────────────────────────────

import type {
  // Existants
  StockRow, Mission, CreateMissionDto,
  AuditLog, AuditLogsResponse,
  Entrepot, Distributeur, Materiel,
  // Nouveaux
  Douar,
  Crise, CreateCriseDto,
  PipelineResult, RunPipelineDto,
  Tournee, AssignerTourneeDto,
  SupervisionSnapshot,
  Evenement, EvenementsResponse, CreateEvenementDto, SendAlertDto,
  AdminEntrepot, CreateAdminEntrepotDto, UpdateAdminStatutDto,
  // Admin Entrepôt
  StockMouvement, CreateMouvementDto, MouvementsResponse,
  Vehicule, CreateVehiculeDto, UpdateVehiculeStatutDto,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// APIS EXISTANTES
// ═══════════════════════════════════════════════════════════════════════════════

export const stockApi = {
  /** Super Admin — tous les entrepôts */
  getAll: () => api.get<StockRow[]>('/stocks').then((r) => r.data),

  /** Admin Entrepôt — stocks de son entrepôt uniquement */
  getMine: () =>
    api.get<StockRow[]>('/stocks/entrepot/mine').then((r) => r.data),

  /** Enregistre une entrée ou sortie de stock */
  createMouvement: (dto: CreateMouvementDto) =>
    api.post<StockMouvement>('/stocks/entrepot/mine/mouvement', dto).then((r) => r.data),

  /** Historique paginé des mouvements */
  getMouvements: (params?: { page?: number; limit?: number; type?: 'ENTREE' | 'SORTIE'; materielId?: string }) =>
    api.get<MouvementsResponse>('/stocks/entrepot/mine/mouvements', { params }).then((r) => r.data),
};

export const missionApi = {
  getAll:  ()                      => api.get<Mission[]>('/missions').then((r) => r.data),
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
  getAll:  () => api.get<Entrepot[]>('/entrepots').then((r) => r.data),
  /** Entrepôt de l'Admin Entrepôt connecté */
  getMine: () => api.get<Entrepot>('/entrepots/mine').then((r) => r.data),
};

export const distributeurApi = {
  getAll: () => api.get<Distributeur[]>('/distributeurs').then((r) => r.data),
};

export const materielApi = {
  getAll: () => api.get<Materiel[]>('/materiels').then((r) => r.data),
};

// ═══════════════════════════════════════════════════════════════════════════════
// DOUARS
// ═══════════════════════════════════════════════════════════════════════════════

export const douarApi = {
  /** Tous les douars de la région (filtrable par province) */
  getAll: (params?: { province?: string; wilaya?: string }) =>
    api.get<Douar[]>('/douars', { params }).then((r) => r.data),

  search: (q: string) =>
    api.get<Douar[]>('/douars/search', { params: { q } }).then((r) => r.data),
};

// ═══════════════════════════════════════════════════════════════════════════════
// CRISES
// ═══════════════════════════════════════════════════════════════════════════════

export const criseApi = {
  /** Retourne toutes les crises (historique) */
  getAll: () =>
    api.get<Crise[]>('/crises').then((r) => r.data),

  /** Crise actuellement active (null si aucune) */
  getActive: () =>
    api.get<Crise | null>('/crises/active').then((r) => r.data),

  getById: (id: string) =>
    api.get<Crise>(`/crises/${id}`).then((r) => r.data),

  /** Déclenche une nouvelle crise avec sévérités initiales par douar */
  create: (dto: CreateCriseDto) =>
    api.post<Crise>('/crises', dto).then((r) => r.data),

  /** Suspend ou clôture une crise */
  updateStatut: (id: string, statut: 'suspendue' | 'cloturee') =>
    api.patch<Crise>(`/crises/${id}/statut`, { statut }).then((r) => r.data),

  /** Mise à jour des sévérités (recalcul partiel) */
  updateSeverites: (id: string, severites: CreateCriseDto['severitesParDouar']) =>
    api.patch<Crise>(`/crises/${id}/severites`, { severites }).then((r) => r.data),
};

// ═══════════════════════════════════════════════════════════════════════════════
// ALGORITHMES (AHP → TOPSIS → VRP)
// ═══════════════════════════════════════════════════════════════════════════════

export const algoApi = {
  /**
   * Lance la chaîne complète AHP → TOPSIS → VRP.
   * Retourne immédiatement un PipelineResult avec statut 'pending'.
   * Le frontend poll getStatus() ou écoute le SSE de supervision.
   */
  runPipeline: (dto: RunPipelineDto) =>
    api.post<PipelineResult>('/algorithmes/pipeline', dto).then((r) => r.data),

  getStatus: (pipelineId: string) =>
    api.get<PipelineResult>(`/algorithmes/pipeline/${pipelineId}`).then((r) => r.data),

  getHistory: (criseId: string) =>
    api.get<PipelineResult[]>(`/algorithmes/pipeline/crise/${criseId}`).then((r) => r.data),

  recalcul: (dto: RunPipelineDto) =>
    api.post<PipelineResult>('/algorithmes/pipeline', dto).then((r) => r.data),
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOURNÉES
// ═══════════════════════════════════════════════════════════════════════════════

export const vehiculeApi = {
  /** Véhicules de l'entrepôt de l'admin connecté */
  getMine: () =>
    api.get<Vehicule[]>('/vehicules/entrepot/mine').then((r) => r.data),

  create: (dto: CreateVehiculeDto) =>
    api.post<Vehicule>('/vehicules', dto).then((r) => r.data),

  updateStatut: (id: string, dto: UpdateVehiculeStatutDto) =>
    api.patch<Vehicule>(`/vehicules/${id}/statut`, dto).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/vehicules/${id}`).then((r) => r.data),
};

export const tourneeApi = {
  /** Toutes les tournées d'une crise (Super Admin) */
  getByCrise: (criseId: string) =>
    api.get<Tournee[]>(`/tournees/crise/${criseId}`).then((r) => r.data),

  /** Tournées de l'entrepôt de l'Admin Entrepôt connecté */
  getMine: () =>
    api.get<Tournee[]>('/tournees/entrepot/mine').then((r) => r.data),

  getById: (id: string) =>
    api.get<Tournee>(`/tournees/${id}`).then((r) => r.data),

  /** Affecter un distributeur à une tournée */
  assigner: (id: string, dto: AssignerTourneeDto) =>
    api.patch<Tournee>(`/tournees/${id}/assigner`, dto).then((r) => r.data),

  /** Réassignation manuelle (ex: panne véhicule) */
  reassigner: (id: string, dto: AssignerTourneeDto) =>
    api.patch<Tournee>(`/tournees/${id}/reassigner`, dto).then((r) => r.data),

  /** Annuler une tournée planifiée */
  annuler: (id: string) =>
    api.patch<Tournee>(`/tournees/${id}/annuler`).then((r) => r.data),
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUPERVISION (SSE — lecture seule, temps réel)
// ═══════════════════════════════════════════════════════════════════════════════

export const supervisionApi = {
  /** Snapshot instantané (pour le chargement initial de la page) */
  getSnapshot: () =>
    api.get<SupervisionSnapshot>('/supervision/snapshot').then((r) => r.data),

  /**
   * Crée un EventSource SSE vers /supervision/stream.
   * Le serveur push un SupervisionSnapshot toutes les 5 secondes.
   * À utiliser dans le hook useSSE (voir hooks/useSSE.ts).
   */
  getStreamUrl: (): string => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:9090/api/v1';
    const token = localStorage.getItem('reliefchain_token') ?? '';
    return `${base}/supervision/stream?token=${encodeURIComponent(token)}`;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ÉVÉNEMENTS / INCIDENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const evenementApi = {
  getByCrise: (criseId: string, page = 1, limit = 20) =>
    api.get<EvenementsResponse>(`/evenements/crise/${criseId}`, { params: { page, limit } }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Evenement>(`/evenements/${id}`).then((r) => r.data),

  /** Signaler un incident terrain */
  create: (dto: CreateEvenementDto) =>
    api.post<Evenement>('/evenements', dto).then((r) => r.data),

  /** Envoyer une alerte push aux distributeurs sélectionnés */
  sendAlert: (dto: SendAlertDto) =>
    api.post<Evenement>('/evenements/alert', dto).then((r) => r.data),

  updateStatut: (id: string, statut: 'ouvert' | 'en_traitement' | 'resolu') =>
    api.patch<Evenement>(`/evenements/${id}/statut`, { statut }).then((r) => r.data),
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILISATEURS — Admin Entrepôt (via Keycloak Admin API)
// ═══════════════════════════════════════════════════════════════════════════════

export const usersApi = {
  /** Liste tous les comptes Admin Entrepôt */
  getAdmins: () =>
    api.get<AdminEntrepot[]>('/users/admins').then((r) => r.data),

  getById: (id: string) =>
    api.get<AdminEntrepot>(`/users/${id}`).then((r) => r.data),

  /** Crée un compte Keycloak avec le rôle ADMIN_ENTREPOT */
  create: (dto: CreateAdminEntrepotDto) =>
    api.post<AdminEntrepot>('/users', dto).then((r) => r.data),

  /** Active ou suspend le compte (enabled: true/false) */
  updateStatut: (id: string, dto: UpdateAdminStatutDto) =>
    api.patch<AdminEntrepot>(`/users/${id}/statut`, dto).then((r) => r.data),

  /** Suppression définitive du compte Keycloak */
  delete: (id: string) =>
    api.delete(`/users/${id}`).then((r) => r.data),

  /** Réinitialiser le mot de passe (envoie un email Keycloak) */
  resetPassword: (id: string) =>
    api.post(`/users/${id}/reset-password`).then((r) => r.data),
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK API CONDITIONNEL
// =====================
// Active les mocks quand USE_MOCK_DATA = true
// ═══════════════════════════════════════════════════════════════════════════════

import { USE_MOCK_DATA as MOCK_ENABLED } from './mockApi';
import * as mockApi from './mockApi';

/**
 * Proxy API conditionnel : utilise les mocks si MOCK_ENABLED = true
 * Sinon utilise l'API réelle (axios)
 */
export const conditionalStockApi = {
  getAll: () => MOCK_ENABLED ? mockApi.stockApi.getAll() : stockApi.getAll(),
  getMine: () => MOCK_ENABLED ? mockApi.stockApi.getAll() : stockApi.getMine(),
  createMouvement: (dto: unknown) => stockApi.createMouvement(dto as CreateMouvementDto),
  getMouvements: (params?: unknown) => stockApi.getMouvements(params as { page?: number; limit?: number; type?: 'ENTREE' | 'SORTIE'; materielId?: string }),
};

export const conditionalMissionApi = {
  getAll: () => MOCK_ENABLED ? mockApi.adminMissionApi.getAll() : missionApi.getAll(),
  create: (dto: CreateMissionDto) => MOCK_ENABLED ? mockApi.missionApi.create(dto) : missionApi.create(dto),
};

export const conditionalAuditApi = {
  getLogs: (params?: { page?: number; limit?: number; operation?: string }) => 
    MOCK_ENABLED ? mockApi.auditApi.getLogs(params) : auditApi.getLogs(params),
};

export const conditionalEntrepotApi = {
  getAll: () => MOCK_ENABLED ? mockApi.entrepotApi.getAll() : entrepotApi.getAll(),
  getMine: () => entrepotApi.getMine(),
};

export const conditionalDistributeurApi = {
  getAll: () => MOCK_ENABLED ? mockApi.distributeurApi.getAll() : distributeurApi.getAll(),
};

export const conditionalDouarApi = {
  getAll: (params?: { province?: string }) =>
    MOCK_ENABLED
      ? (params?.province ? mockApi.douarApi.getByProvince(params.province) : mockApi.douarApi.getAll())
      : douarApi.getAll(params),
  search: (q: string) => douarApi.search(q),
};

export const conditionalCriseApi = {
  getAll: () => MOCK_ENABLED ? mockApi.criseApi.getAll() : criseApi.getAll(),
  getActive: () => MOCK_ENABLED ? mockApi.criseApi.getActives() : criseApi.getActive(),
  getById: (id: string) => criseApi.getById(id),
  create: (dto: CreateCriseDto) => MOCK_ENABLED ? mockApi.criseApi.create(dto) : criseApi.create(dto),
  updateStatut: (id: string, statut: 'suspendue' | 'cloturee') => MOCK_ENABLED ? mockApi.criseApi.updateStatut(id, statut) : criseApi.updateStatut(id, statut),
  updateSeverites: (id: string, severites: CreateCriseDto['severitesParDouar']) => criseApi.updateSeverites(id, severites),
};

export const conditionalVehiculeApi = {
  getMine: () => MOCK_ENABLED 
    ? Promise.resolve(mockApi.vehiculeApi.getAll().then(v => v.filter(vh => vh.entrepotId === 'entrepot-1'))) 
    : vehiculeApi.getMine(),
  create: (dto: CreateVehiculeDto) => vehiculeApi.create(dto),
  updateStatut: (id: string, dto: UpdateVehiculeStatutDto) => vehiculeApi.updateStatut(id, dto),
  remove: (id: string) => vehiculeApi.remove(id),
};

export const conditionalTourneeApi = {
  getByCrise: (criseId: string) => tourneeApi.getByCrise(criseId),
  getMine: () => tourneeApi.getMine(),
  getById: (id: string) => tourneeApi.getById(id),
  assigner: (id: string, dto: AssignerTourneeDto) => tourneeApi.assigner(id, dto),
  reassigner: (id: string, dto: AssignerTourneeDto) => tourneeApi.reassigner(id, dto),
  annuler: (id: string) => tourneeApi.annuler(id),
};

export const conditionalAlgoApi = {
  runPipeline: (dto: RunPipelineDto) => MOCK_ENABLED ? mockApi.mockAlgoApi.runPipeline(dto) : algoApi.runPipeline(dto),
  getStatus: (pipelineId: string) => MOCK_ENABLED ? mockApi.mockAlgoApi.getStatus(pipelineId) : algoApi.getStatus(pipelineId),
  getHistory: (criseId: string) => MOCK_ENABLED ? mockApi.mockAlgoApi.getHistory(criseId) : algoApi.getHistory(criseId),
  recalcul: (dto: RunPipelineDto) => MOCK_ENABLED ? mockApi.mockAlgoApi.runPipeline(dto) : algoApi.recalcul(dto),
};

export const conditionalSupervisionApi = {
  getSnapshot: () => supervisionApi.getSnapshot(),
  getStreamUrl: () => supervisionApi.getStreamUrl(),
};

export const conditionalEvenementApi = {
  getByCrise: (criseId: string, page = 1, limit = 20) => MOCK_ENABLED ? mockApi.mockEvenementApi.getByCrise(criseId, page, limit) : evenementApi.getByCrise(criseId, page, limit),
  getById: (id: string) => MOCK_ENABLED ? mockApi.mockEvenementApi.getById(id) : evenementApi.getById(id),
  create: (dto: CreateEvenementDto) => MOCK_ENABLED ? mockApi.mockEvenementApi.create(dto) : evenementApi.create(dto),
  sendAlert: (dto: SendAlertDto) => MOCK_ENABLED ? mockApi.mockEvenementApi.sendAlert() : evenementApi.sendAlert(dto),
  updateStatut: (id: string, statut: 'ouvert' | 'en_traitement' | 'resolu') => MOCK_ENABLED ? mockApi.mockEvenementApi.updateStatut(id, statut) : evenementApi.updateStatut(id, statut),
};

export const conditionalUsersApi = {
  getAdmins: () => MOCK_ENABLED ? mockApi.mockUsersApi.getAdmins() : usersApi.getAdmins(),
  getById: (id: string) => usersApi.getById(id),
  create: (dto: CreateAdminEntrepotDto) => MOCK_ENABLED ? mockApi.mockUsersApi.create(dto) : usersApi.create(dto),
  updateStatut: (id: string, dto: UpdateAdminStatutDto) => MOCK_ENABLED ? mockApi.mockUsersApi.updateStatut(id, dto) : usersApi.updateStatut(id, dto),
  delete: (id: string) => MOCK_ENABLED ? mockApi.mockUsersApi.delete(id) : usersApi.delete(id),
  resetPassword: (id: string) => MOCK_ENABLED ? mockApi.mockUsersApi.resetPassword(id) : usersApi.resetPassword(id),
};

// Ré-export des mocks pour utilisation directe
export { mockApi };

export default api;

// ── Ré-export des types pour la rétrocompatibilité ────────────────────────────
export type {
  StockRow, Mission, CreateMissionDto,
  AuditLog, AuditLogsResponse,
  Entrepot, Distributeur, Materiel,
  MissionStatut, MissionPriorite, AuditOperation, EntrepotStatut, UserRole,
} from '../types';
