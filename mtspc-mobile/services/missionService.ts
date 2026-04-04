/**
 * MISSION SERVICE — Appels API vers le Backend NestJS
 * Injecte automatiquement le JWT depuis expo-secure-store.
 * 
 * MODE MOCK: Définir USE_MOCK_DATA = true pour utiliser les données de test
 * sans avoir besoin d'un backend ou d'authentification.
 */
import * as SecureStore from 'expo-secure-store';
import { Mission } from '../types/app';
import { API_BASE_URL } from '../config/keycloakConfig';
import { getMockMissions, getMockMissionById } from '../mock/missions';
import { getMockTourneeByMissionId } from '../mock/tournees';

const TOKEN_KEY = 'reliefchain_access_token';

/**
 * MODE DÉVELOPPEMENT: Mettre à true pour utiliser les données mockées
 * au lieu de faire des appels API réels.
 */
export const USE_MOCK_DATA = true; // ← Modifier à false pour utiliser l'API réelle

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  
  if (!token) {
    console.warn('[Auth] No token found, user needs to login');
    throw new Error('AUTH_REQUIRED');
  }
  
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

export const missionService = {
  /** 
   * Récupère toutes les missions assignées au distributeur connecté
   * En mode MOCK: retourne les missions de test
   */
  async getAllMissions(): Promise<Mission[]> {
    if (USE_MOCK_DATA) {
      console.log('[MOCK] Chargement des missions de test...');
      return getMockMissions();
    }
    
    const res = await authFetch('/missions');
    if (!res.ok) {
      if (res.status === 401) throw new Error('AUTH_REQUIRED');
      throw new Error(`Erreur API ${res.status}`);
    }
    return res.json();
  },

  /** 
   * Récupère le détail d'une mission par son ID
   * En mode MOCK: retourne une mission de test
   */
  async getMissionById(id: string): Promise<Mission> {
    if (USE_MOCK_DATA) {
      console.log(`[MOCK] Chargement de la mission ${id}...`);
      const mission = await getMockMissionById(id);
      if (!mission) throw new Error('Mission introuvable');
      return mission;
    }
    
    const res = await authFetch(`/missions/${id}`);
    if (!res.ok) throw new Error(`Mission introuvable : ${res.status}`);
    return res.json();
  },

  /** 
   * Met à jour le statut d'une mission (online uniquement)
   * En mode MOCK: simule la mise à jour
   */
  async updateStatut(id: string, statut: string): Promise<void> {
    if (USE_MOCK_DATA) {
      console.log(`[MOCK] Mise à jour du statut de la mission ${id} vers ${statut}`);
      return Promise.resolve();
    }
    
    const res = await authFetch(`/missions/${id}/statut`, {
      method: 'PATCH',
      body: JSON.stringify({ statut }),
    });
    if (!res.ok) throw new Error(`Erreur mise à jour statut : ${res.status}`);
  },

  /** 
   * Récupère la tournée VRP calculée pour cette mission
   * En mode MOCK: retourne une tournée avec 7 douars
   */
  async getTourneeByMissionId(missionId: string): Promise<any> {
    if (USE_MOCK_DATA) {
      console.log(`[MOCK] Chargement de la tournée pour la mission ${missionId}...`);
      return getMockTourneeByMissionId(missionId);
    }
    
    const res = await authFetch(`/tournees/mission/${missionId}`);
    if (!res.ok) {
      if (res.status === 404) return null; // Pas de tournée (ex: mission classique hors crise)
      throw new Error(`Erreur lors de la récupération de la tournée : ${res.status}`);
    }
    return res.json();
  },
};
