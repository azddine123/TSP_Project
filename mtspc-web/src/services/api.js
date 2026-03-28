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
    }
    catch {
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
    getAll: () => api.get('/stocks').then((r) => r.data),
};
export const missionApi = {
    getAll: () => api.get('/missions').then((r) => r.data),
    create: (dto) => api.post('/missions', dto).then((r) => r.data),
};
export const auditApi = {
    getLogs: (params) => api.get('/audit', { params }).then((r) => r.data),
};
export const entrepotApi = {
    getAll: () => api.get('/entrepots').then((r) => r.data),
};
export const distributeurApi = {
    getAll: () => api.get('/distributeurs').then((r) => r.data),
};
export const materielApi = {
    getAll: () => api.get('/materiels').then((r) => r.data),
};
export default api;
