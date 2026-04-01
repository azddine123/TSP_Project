/**
 * useNetworkSync — Déclenchement automatique de la sync au retour du réseau
 * ==========================================================================
 *
 * S'abonne aux changements de connectivité via NetInfo.
 * Dès que isConnected + isInternetReachable passent à true,
 * appelle tourSyncEngine.processPendingSync() pour vider la file.
 *
 * Retourne l'état de connectivité courant et un trigger manuel.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { tourSyncEngine } from '../services/tourSyncEngine';
import { syncQueue }      from '../services/syncQueue';

interface NetworkSyncState {
  isOnline:     boolean;
  isSyncing:    boolean;
  pendingCount: number;
  lastSyncedAt: number | null;
  forceSync:    () => Promise<void>;
}

export function useNetworkSync(): NetworkSyncState {
  const [isOnline,     setIsOnline]     = useState(true);
  const [isSyncing,    setIsSyncing]    = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  // Évite les sync en doublon si le réseau clignote
  const syncLock = useRef(false);

  const runSync = useCallback(async () => {
    if (syncLock.current) return;
    syncLock.current = true;
    setIsSyncing(true);

    try {
      await tourSyncEngine.processPendingSync();
      setLastSyncedAt(Date.now());
    } finally {
      const count = await syncQueue.getPendingCount();
      setPendingCount(count);
      setIsSyncing(false);
      syncLock.current = false;
    }
  }, []);

  // ── Abonnement NetInfo ──────────────────────────────────────────────────────

  useEffect(() => {
    // Lecture initiale de la connectivité
    NetInfo.fetch().then(async (state) => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(online);
      const count = await syncQueue.getPendingCount();
      setPendingCount(count);

      if (online && count > 0) runSync();
    });

    // Abonnement aux changements
    const unsub = NetInfo.addEventListener(async (state: NetInfoState) => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(online);

      if (online) {
        const count = await syncQueue.getPendingCount();
        setPendingCount(count);
        if (count > 0) runSync();
      }
    });

    return unsub;
  }, [runSync]);

  // ── Rafraîchissement du compteur ──────────────────────────────────────────

  useEffect(() => {
    const timer = setInterval(async () => {
      const count = await syncQueue.getPendingCount();
      setPendingCount(count);
    }, 10_000); // toutes les 10 secondes

    return () => clearInterval(timer);
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncedAt,
    forceSync: runSync,
  };
}
