/**
 * HOOK useGpsTracking — Tracking GPS WebSocket pour la tournée
 * ==============================================================
 * Envoie la position GPS du distributeur toutes les 30 secondes
 * au backend via WebSocket avec :
 *   - Reconnexion automatique exponential backoff (1s → 2s → 4s … max 30s)
 *   - Fallback offline : stockage AsyncStorage 'gps_pending' si WebSocket fail
 *   - Replay des positions stockées à la reconnexion
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/keycloakConfig';

const TOKEN_KEY      = 'reliefchain_access_token';
const GPS_QUEUE_KEY  = 'gps_pending';
const SEND_INTERVAL  = 30_000;   // 30 secondes
const MAX_BACKOFF    = 30_000;   // max 30s entre tentatives WS

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildWsUrl(): string {
  return API_BASE_URL.replace(/^http/, 'ws').replace('/api/v1', '') + '/gps';
}

interface GpsPayload {
  distributeurId: string;
  tourneeId:      string;
  lat:            number;
  lng:            number;
  accuracy:       number | null;
  timestamp:      string;
}

// ── Options du hook ──────────────────────────────────────────────────────────

interface GpsTrackingOptions {
  tourneeId?: string;
  enabled?:   boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGpsTracking(options?: GpsTrackingOptions) {
  const { user } = useAuth();
  const wsRef          = useRef<WebSocket | null>(null);
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef     = useRef<number>(1000);
  const mountedRef     = useRef<boolean>(true);
  const activeIdsRef   = useRef<{ tourneeId: string; userId: string } | null>(null);

  const [isTracking,       setIsTracking]       = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [currentPosition,  setCurrentPosition]  = useState<{ lat: number; lng: number } | null>(null);
  const [wsConnected,      setWsConnected]       = useState(false);

  // ── Sauvegarder une position en file offline ──────────────────────────────
  const enqueueOffline = useCallback(async (payload: GpsPayload) => {
    try {
      const raw   = await AsyncStorage.getItem(GPS_QUEUE_KEY);
      const queue: GpsPayload[] = raw ? JSON.parse(raw) : [];
      queue.push(payload);
      // Garder max 100 positions offline
      const trimmed = queue.slice(-100);
      await AsyncStorage.setItem(GPS_QUEUE_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore — non bloquant
    }
  }, []);

  // ── Rejouer les positions offline via WS ─────────────────────────────────
  const replayOfflineQueue = useCallback(async (ws: WebSocket) => {
    try {
      const raw = await AsyncStorage.getItem(GPS_QUEUE_KEY);
      if (!raw) return;
      const queue: GpsPayload[] = JSON.parse(raw);
      if (queue.length === 0) return;
      queue.forEach(p => ws.send(JSON.stringify(p)));
      await AsyncStorage.removeItem(GPS_QUEUE_KEY);
      console.log(`[GPS] ${queue.length} positions offline rejoué(es)`);
    } catch {
      // Ignore
    }
  }, []);

  // ── Ouvrir une connexion WebSocket ────────────────────────────────────────
  const connectWs = useCallback(async (tourneeId: string, userId: string) => {
    if (!mountedRef.current) return;
    // Fermer l'ancienne connexion si elle existe
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close(1000);
    }

    const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
    const wsUrl = token
      ? `${buildWsUrl()}?token=${encodeURIComponent(token)}`
      : buildWsUrl();

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.warn('[GPS] Impossible d\'ouvrir WebSocket', err);
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(1000); return; }
      console.log('[GPS] WebSocket connecté');
      setWsConnected(true);
      setError(null);
      backoffRef.current = 1000; // reset backoff
      replayOfflineQueue(ws);
    };

    ws.onmessage = (event) => {
      // Le backend peut envoyer un ACK — on l'ignore
      console.log('[GPS] WS message:', event.data);
    };

    ws.onerror = (e) => {
      console.warn('[GPS] WebSocket erreur:', e);
    };

    ws.onclose = (e) => {
      if (!mountedRef.current) return;
      setWsConnected(false);
      if (e.code !== 1000) {
        // Reconnexion avec backoff exponentiel
        const delay = Math.min(backoffRef.current, MAX_BACKOFF);
        console.log(`[GPS] WS fermé (${e.code}). Reconnexion dans ${delay}ms…`);
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
        reconnTimerRef.current = setTimeout(() => {
          if (mountedRef.current && activeIdsRef.current) {
            connectWs(activeIdsRef.current.tourneeId, activeIdsRef.current.userId);
          }
        }, delay);
      }
    };
  }, [replayOfflineQueue]);

  // ── Envoyer une position ──────────────────────────────────────────────────
  const sendPosition = useCallback(async (payload: GpsPayload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else {
      // Fallback offline
      await enqueueOffline(payload);
      console.log('[GPS] Position mise en file offline (WS indisponible)');
    }
  }, [enqueueOffline]);

  // ── Démarrer le tracking ──────────────────────────────────────────────────
  const startTracking = useCallback(async (manualTourneeId?: string, manualUserId?: string) => {
    const effectiveTourneeId = manualTourneeId || options?.tourneeId;
    const effectiveUserId    = manualUserId    || user?.userId;

    if (!effectiveTourneeId || !effectiveUserId) {
      setError('Tournée ID ou utilisateur manquant');
      return;
    }

    // Demander la permission GPS
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission de localisation refusée');
      return;
    }

    activeIdsRef.current = { tourneeId: effectiveTourneeId, userId: effectiveUserId };
    setIsTracking(true);
    setError(null);

    // Connexion WebSocket
    await connectWs(effectiveTourneeId, effectiveUserId);

    // Envoi périodique toutes les 30s
    intervalRef.current = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const payload: GpsPayload = {
          distributeurId: effectiveUserId,
          tourneeId:      effectiveTourneeId,
          lat:            loc.coords.latitude,
          lng:            loc.coords.longitude,
          accuracy:       loc.coords.accuracy ?? null,
          timestamp:      new Date().toISOString(),
        };
        setCurrentPosition({ lat: payload.lat, lng: payload.lng });
        await sendPosition(payload);
      } catch (err) {
        console.error('[GPS] Erreur récupération position:', err);
      }
    }, SEND_INTERVAL);
  }, [options?.tourneeId, user, connectWs, sendPosition]);

  // ── Arrêter le tracking ───────────────────────────────────────────────────
  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (reconnTimerRef.current) {
      clearTimeout(reconnTimerRef.current);
      reconnTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    activeIdsRef.current = null;
    setIsTracking(false);
    setWsConnected(false);
  }, []);

  // ── Auto-start/stop selon options.enabled ────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    if (options?.enabled) {
      startTracking();
    } else {
      stopTracking();
    }
    return () => {
      mountedRef.current = false;
      stopTracking();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.enabled]);

  return {
    isTracking,
    wsConnected,
    error,
    currentPosition,
    startTracking,
    stopTracking,
  };
}

export default useGpsTracking;
