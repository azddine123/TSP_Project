/**
 * useGpsTracking — Hook React pour le tracking GPS en background
 * ==============================================================
 *
 * Utilise expo-location en mode HIGH_ACCURACY pour obtenir la position
 * du distributeur et la transmettre au gpsService (WebSocket).
 *
 * Usage :
 *   const { startTracking, stopTracking, currentPosition, isTracking } =
 *     useGpsTracking();
 *
 *   // Au départ de l'entrepôt :
 *   await startTracking(tournee.id, user.userId);
 *
 *   // À l'arrivée au dernier douar :
 *   stopTracking();
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { gpsService } from '../services/gpsService';

export interface GpsCoords {
    lat: number;
    lng: number;
    accuracy: number | null;
}

interface UseGpsTrackingReturn {
    isTracking: boolean;
    currentPosition: GpsCoords | null;
    permissionGranted: boolean;
    startTracking: (tourneeId: string, distributeurId: string) => Promise<void>;
    stopTracking: () => void;
}

export function useGpsTracking(): UseGpsTrackingReturn {
    const [isTracking, setIsTracking] = useState(false);
    const [currentPosition, setCurrentPosition] = useState<GpsCoords | null>(null);
    const [permissionGranted, setPermissionGranted] = useState(false);

    // Référence vers le subscriber expo-location (pour l'arrêter proprement)
    const locationSubscriber = useRef<Location.LocationSubscription | null>(null);

    // ── Demande de permissions au montage ──────────────────────────────────────

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission GPS refusée',
                    'L\'application a besoin de votre position pour envoyer votre itinéraire en temps réel.',
                );
                return;
            }
            setPermissionGranted(true);
        })();

        // Nettoyage : arrêter le tracking si le composant est démonté
        return () => { stopTracking(); };
    }, []);

    // ── Démarrage du tracking ───────────────────────────────────────────────────

    const startTracking = useCallback(
        async (tourneeId: string, distributeurId: string): Promise<void> => {
            if (!permissionGranted) {
                Alert.alert('GPS non disponible', 'Accordez la permission de localisation pour commencer.');
                return;
            }
            if (isTracking) return; // Déjà en cours

            try {
                // Démarrer le WebSocket GPS
                await gpsService.start(tourneeId, distributeurId);

                // Souscrire aux mises à jour de position expo-location
                locationSubscriber.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 15_000,  // Mise à jour toutes les 15 s
                        distanceInterval: 50,      // Ou si déplacement > 50 m
                    },
                    (location) => {
                        const coords: GpsCoords = {
                            lat: location.coords.latitude,
                            lng: location.coords.longitude,
                            accuracy: location.coords.accuracy,
                        };
                        setCurrentPosition(coords);
                        // Transmettre au service WebSocket
                        gpsService.updatePosition(coords.lat, coords.lng, coords.accuracy ?? undefined);
                    },
                );

                setIsTracking(true);
                console.log('[GPS Hook] Tracking démarré pour tournée', tourneeId);

            } catch (err) {
                console.error('[GPS Hook] Erreur démarrage tracking :', err);
                Alert.alert('Erreur GPS', 'Impossible de démarrer le tracking de position.');
            }
        },
        [permissionGranted, isTracking],
    );

    // ── Arrêt du tracking ───────────────────────────────────────────────────────

    const stopTracking = useCallback((): void => {
        if (locationSubscriber.current) {
            locationSubscriber.current.remove();
            locationSubscriber.current = null;
        }
        gpsService.stop();
        setIsTracking(false);
        console.log('[GPS Hook] Tracking arrêté');
    }, []);

    return {
        isTracking,
        currentPosition,
        permissionGranted,
        startTracking,
        stopTracking,
    };
}
