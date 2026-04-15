/**
 * SYNC SERVICE — Synchronisation Hors-Ligne → Backend
 * ====================================================
 *
 * FLUX COMPLET :
 * ─────────────────────────────────────
 * [Montagne — Pas de réseau]
 *   Distributeur valide livraison
 *   → savePendingSubmission() → AsyncStorage 'pending_submissions'
 *
 * [Retour en zone réseau]
 *   NetInfo détecte la reconnexion
 *   → bouton "Synchroniser (N)" dans HomeScreen
 *   → forceSync() → POST /sync (BATCH) → backend enregistre + audit_logs
 *   → clearSynced() → supprime les entrées envoyées
 *
 * Amélioration : batch unique + retry exponentiel par soumission
 *   - tentativeSync = 0 → délai 1s
 *   - tentativeSync = 1 → délai 2s
 *   - tentativeSync = n → délai 2^n s (max 3600s)
 *   - tentativeSync > 3 → marqué "failed" pour affichage dans profile.tsx
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import { PendingSubmission } from '../types/app';
import { API_BASE_URL } from '../config/keycloakConfig';

const PENDING_KEY = 'pending_submissions';
const TOKEN_KEY   = 'reliefchain_access_token';

/** Délai avant prochain essai selon le nombre de tentatives (max 3600s) */
export function retryDelayMs(tentativeSync: number): number {
  return Math.min(Math.pow(2, tentativeSync) * 1000, 3_600_000);
}

/** Statut d'une submission pour affichage UI */
export type SubmissionDisplayStatus = 'pending' | 'failed' | 'synced';

export function getDisplayStatus(s: PendingSubmission): SubmissionDisplayStatus {
  if (s.tentativeSync > 3) return 'failed';
  return 'pending';
}

export const syncService = {

  /** Vérifier si le téléphone est connecté à internet */
  async checkConnectivity(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable);
  },

  /**
   * Sauvegarder une livraison validée hors-ligne.
   * Appelée depuis livraison-confirmation.tsx quand NetInfo.isConnected = false.
   */
  async savePendingSubmission(submission: PendingSubmission): Promise<void> {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    const pending: PendingSubmission[] = raw ? JSON.parse(raw) : [];

    // Éviter les doublons (même missionId + douarId)
    const key = `${submission.missionId}-${submission.douarId ?? ''}`;
    const exists = pending.some(p => `${p.missionId}-${p.douarId ?? ''}` === key);
    if (!exists) {
      pending.push({ ...submission, tentativeSync: 0 });
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
      console.log(`[Sync] Livraison sauvegardée hors-ligne : ${submission.missionId}`);
    }
  },

  /** Lire le nombre de soumissions en attente (badge du bouton Sync) */
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
   * Envoie TOUTES les soumissions en UN SEUL appel batch
   * → POST /sync { submissions: PendingSubmission[] }
   *
   * Si le batch échoue, incrémente tentativeSync sur chaque item.
   * Les items avec tentativeSync > 3 sont marqués "failed" dans l'UI.
   */
  async forceSync(): Promise<{ synced: number; failed: number }> {
    const online = await this.checkConnectivity();
    if (!online) throw new Error('Pas de connexion internet.');

    const pending = await this.getPendingSubmissions();
    if (pending.length === 0) return { synced: 0, failed: 0 };

    const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);

    try {
      const res = await fetch(`${API_BASE_URL}/sync`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ submissions: pending }),
      });

      if (res.ok) {
        // Tout synchronisé — vider la file
        await AsyncStorage.removeItem(PENDING_KEY);
        console.log(`[Sync] ✅ ${pending.length} livraison(s) synchronisée(s) en batch`);
        return { synced: pending.length, failed: 0 };
      }

      // Échec batch → incrémenter tentativeSync sur tous les items
      const incremented: PendingSubmission[] = pending.map(p => ({
        ...p,
        tentativeSync: p.tentativeSync + 1,
      }));
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(incremented));
      console.warn(`[Sync] ❌ Batch échoué (${res.status}) — ${pending.length} en attente`);
      return { synced: 0, failed: pending.length };

    } catch (err) {
      // Erreur réseau → incrémenter aussi
      const incremented: PendingSubmission[] = pending.map(p => ({
        ...p,
        tentativeSync: p.tentativeSync + 1,
      }));
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(incremented));
      console.warn('[Sync] ❌ Erreur réseau batch:', err);
      return { synced: 0, failed: pending.length };
    }
  },

  /** Effacer toutes les soumissions (après confirmation utilisateur) */
  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(PENDING_KEY);
  },
};
