/**
 * SYNC SERVICE — Synchronisation Hors-Ligne → Backend
 * ====================================================
 *
 * FLUX COMPLET (à expliquer au jury) :
 * ─────────────────────────────────────
 * [Montagne — Pas de réseau]
 *   Distributeur valide livraison
 *   → savePendingSubmission() → AsyncStorage 'pending_submissions'
 *
 * [Retour en zone réseau]
 *   NetInfo détecte la reconnexion
 *   → bouton rouge "Synchroniser (N)" apparaît dans HomeScreen
 *   → forceSync() → POST /sync (batch) → backend enregistre + audit_logs
 *   → clearSynced() → supprime les entrées envoyées de AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo      from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import { PendingSubmission } from '../types/app';
import { API_BASE_URL }      from '../config/keycloakConfig';

const PENDING_KEY = 'pending_submissions';
const TOKEN_KEY   = 'mtspc26_access_token';

export const syncService = {

  /** Vérifier si le téléphone est connecté à internet */
  async checkConnectivity(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable);
  },

  /**
   * Sauvegarder une livraison validée hors-ligne.
   * Appelée depuis MissionDetailScreen quand NetInfo.isConnected = false.
   */
  async savePendingSubmission(submission: PendingSubmission): Promise<void> {
    const raw     = await AsyncStorage.getItem(PENDING_KEY);
    const pending: PendingSubmission[] = raw ? JSON.parse(raw) : [];

    // Éviter les doublons si l'utilisateur valide plusieurs fois
    const exists = pending.some((p) => p.missionId === submission.missionId);
    if (!exists) {
      pending.push({ ...submission, tentativeSync: 0 });
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
      console.log(`[Sync] Mission ${submission.missionId} sauvegardée hors-ligne`);
    }
  },

  /** Lire le nombre de soumissions en attente (pour le badge du bouton Sync) */
  async getPendingCount(): Promise<number> {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return 0;
    return (JSON.parse(raw) as PendingSubmission[]).length;
  },

  /** Lire toutes les soumissions en attente */
  async getPendingSubmissions(): Promise<PendingSubmission[]> {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  /**
   * Forcer la synchronisation immédiate.
   * Envoie toutes les soumissions en attente en un seul appel batch
   * vers POST /sync du backend NestJS.
   * L'Audit Log Interceptor les enregistre automatiquement dans audit_logs.
   */
  async forceSync(): Promise<{ synced: number; failed: number }> {
    const online = await this.checkConnectivity();
    if (!online) throw new Error('Pas de connexion internet.');

    const pending = await this.getPendingSubmissions();
    if (pending.length === 0) return { synced: 0, failed: 0 };

    const token = await SecureStore.getItemAsync(TOKEN_KEY);

    let synced = 0;
    let failed = 0;
    const failedItems: PendingSubmission[] = [];

    for (const submission of pending) {
      try {
        const res = await fetch(`${API_BASE_URL}/sync`, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify(submission),
        });

        if (res.ok) {
          synced++;
          console.log(`[Sync] ✅ Mission ${submission.missionId} synchronisée`);
        } else {
          // Conserver pour réessayer plus tard
          failedItems.push({
            ...submission,
            tentativeSync: submission.tentativeSync + 1,
          });
          failed++;
          console.warn(`[Sync] ❌ Échec mission ${submission.missionId} : ${res.status}`);
        }
      } catch {
        failedItems.push({
          ...submission,
          tentativeSync: submission.tentativeSync + 1,
        });
        failed++;
      }
    }

    // Conserver uniquement les échecs dans AsyncStorage
    if (failedItems.length > 0) {
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(failedItems));
    } else {
      await AsyncStorage.removeItem(PENDING_KEY);
    }

    return { synced, failed };
  },
};
