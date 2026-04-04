/**
 * HOOK useGpsTracking — Tracking GPS WebSocket pour la tournée
 * ==============================================================
 * Envoie la position GPS du distributeur toutes les 30 secondes
 * au backend via WebSocket.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

interface GpsTrackingOptions {
  tourneeId?: string;
  enabled?: boolean;
}

export function useGpsTracking(options?: GpsTrackingOptions) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);

  const startTracking = useCallback(async (manualTourneeId?: string, manualUserId?: string) => {
    const effectiveTourneeId = manualTourneeId || options?.tourneeId;
    const effectiveUserId = manualUserId || user?.userId;
    
    if (!effectiveTourneeId || !effectiveUserId) {
      setError('Tournee ID ou utilisateur manquant');
      return;
    }

    try {
      // Demander la permission de localisation
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission de localisation refusée');
        return;
      }

      setIsTracking(true);
      setError(null);

      // Envoyer la position toutes les 30 secondes
      intervalRef.current = setInterval(async () => {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          const position = {
            distributeurId: effectiveUserId,
            tourneeId: effectiveTourneeId,
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: new Date().toISOString(),
          };
          
          setCurrentPosition({ lat: position.lat, lng: position.lng });

          // TODO: Envoyer via WebSocket ou API REST
          console.log('[GPS] Position envoyée:', position);
        } catch (err) {
          console.error('[GPS] Erreur récupération position:', err);
        }
      }, 30000);
    } catch (err) {
      setError('Erreur lors du démarrage du tracking');
      setIsTracking(false);
    }
  }, [options?.tourneeId, user]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsTracking(false);
  }, []);

  useEffect(() => {
    if (options?.enabled) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [options?.enabled, startTracking, stopTracking]);

  return {
    isTracking,
    error,
    currentPosition,
    startTracking,
    stopTracking,
  };
}

export default useGpsTracking;
