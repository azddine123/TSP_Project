/**
 * SYNC QUEUE — File d'attente persistante avec retry exponentiel
 * ==============================================================
 *
 * Toutes les opérations terrain (confirmations, GPS, alertes) sont
 * d'abord stockées ici dans AsyncStorage, puis consommées dès que
 * le réseau est disponible.
 *
 * STRATÉGIE DE RETRY :
 *   retry 0 → immédiat
 *   retry 1 → 30s
 *   retry 2 → 60s
 *   retry 3 → 120s
 *   retry 4 → 240s
 *   retry 5+ → abandon (marqué 'failed')
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OperationSync, TypeOperation, StatutOperation } from '../types/tour';

const QUEUE_KEY      = 'sync_queue_v2';
const MAX_RETRIES    = 5;
const BACKOFF_BASE_S = 30; // secondes

// ── Utilitaires ────────────────────────────────────────────────────────────────

function genId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function backoffMs(retryCount: number): number {
  return Math.pow(2, retryCount) * BACKOFF_BASE_S * 1000;
}

// ── Lecture / Écriture brutes ──────────────────────────────────────────────────

async function readQueue(): Promise<OperationSync[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OperationSync[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: OperationSync[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// ── API publique ───────────────────────────────────────────────────────────────

export const syncQueue = {

  /**
   * Ajouter une nouvelle opération à la file.
   * Appelé depuis le terrain quand le chauffeur confirme une livraison,
   * signale un obstacle, ou quand le GPS batch timer se déclenche.
   */
  async enqueue(type: TypeOperation, payload: object): Promise<OperationSync> {
    const queue = await readQueue();
    const op: OperationSync = {
      id:         genId(),
      type,
      payload:    JSON.stringify(payload),
      createdAt:  Date.now(),
      retryCount: 0,
      statut:     'pending',
    };
    queue.push(op);
    await writeQueue(queue);
    return op;
  },

  /**
   * Récupérer toutes les opérations prêtes à être envoyées :
   * - statut 'pending'
   * - OU statut 'processing' bloqué (app redémarrée mid-sync)
   * - nextRetryAt dans le passé ou absent
   */
  async getPending(): Promise<OperationSync[]> {
    const queue = await readQueue();
    const now   = Date.now();
    return queue.filter(
      (op) =>
        op.retryCount < MAX_RETRIES &&
        (op.statut === 'pending' || op.statut === 'processing') &&
        (!op.nextRetryAt || op.nextRetryAt <= now),
    );
  },

  /** Nombre d'opérations en attente (pour le badge UI) */
  async getPendingCount(): Promise<number> {
    return (await this.getPending()).length;
  },

  /** Lire toutes les opérations (pour debug / écran de statut) */
  async getAll(): Promise<OperationSync[]> {
    return readQueue();
  },

  /** Marquer une opération comme en cours de traitement */
  async markProcessing(id: string): Promise<void> {
    const queue = await readQueue();
    const op    = queue.find((o) => o.id === id);
    if (op) {
      op.statut = 'processing';
      await writeQueue(queue);
    }
  },

  /** Supprimer une opération après succès */
  async markDone(id: string): Promise<void> {
    const queue   = await readQueue();
    const updated = queue.filter((o) => o.id !== id);
    await writeQueue(updated);
  },

  /** Planifier un retry avec backoff exponentiel */
  async scheduleRetry(id: string, newRetryCount: number, erreur?: string): Promise<void> {
    const queue = await readQueue();
    const op    = queue.find((o) => o.id === id);
    if (op) {
      op.retryCount  = newRetryCount;
      op.statut      = 'pending';
      op.nextRetryAt = Date.now() + backoffMs(newRetryCount);
      if (erreur) op.erreur = erreur;
      await writeQueue(queue);
    }
  },

  /** Marquer définitivement comme échoué (retries épuisés) */
  async markFailed(id: string, erreur: string): Promise<void> {
    const queue = await readQueue();
    const op    = queue.find((o) => o.id === id);
    if (op) {
      op.statut = 'failed';
      op.erreur = erreur;
      await writeQueue(queue);
    }
  },

  /** Supprimer toutes les opérations échouées */
  async clearFailed(): Promise<void> {
    const queue   = await readQueue();
    const updated = queue.filter((o) => o.statut !== 'failed');
    await writeQueue(updated);
  },

  /** Réinitialiser complètement la file (utile en dev) */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },
};
