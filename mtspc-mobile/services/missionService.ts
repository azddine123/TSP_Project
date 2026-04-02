/**
 * MISSION SERVICE — Appels API vers le Backend NestJS
 * Injecte automatiquement le JWT depuis expo-secure-store.
 */
import * as SecureStore from 'expo-secure-store';
import { Mission } from '../types/app';
import { API_BASE_URL } from '../config/keycloakConfig';

const TOKEN_KEY = 'reliefchain_access_token';

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...(options.headers || {}),
    },
  });
}

export const missionService = {
  /** Récupère toutes les missions assignées au distributeur connecté */
  async getAllMissions(): Promise<Mission[]> {
    const res = await authFetch('/missions');
    if (!res.ok) throw new Error(`Erreur API ${res.status}`);
    return res.json();
  },

  /** Récupère le détail d'une mission par son ID */
  async getMissionById(id: string): Promise<Mission> {
    const res = await authFetch(`/missions/${id}`);
    if (!res.ok) throw new Error(`Mission introuvable : ${res.status}`);
    return res.json();
  },

  /** Met à jour le statut d'une mission (online uniquement) */
  async updateStatut(id: string, statut: string): Promise<void> {
    const res = await authFetch(`/missions/${id}/statut`, {
      method: 'PATCH',
      body: JSON.stringify({ statut }),
    });
    if (!res.ok) throw new Error(`Erreur mise à jour statut : ${res.status}`);
  },

  /** Récupère la tournée VRP calculée pour cette mission */
  async getTourneeByMissionId(missionId: string): Promise<any> {
    const res = await authFetch(`/tournees/mission/${missionId}`);
    if (!res.ok) {
      if (res.status === 404) return null; // Pas de tournée (ex: mission classique hors crise)
      throw new Error(`Erreur lors de la récupération de la tournée : ${res.status}`);
    }
    return res.json();
  },
};
