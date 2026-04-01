/**
 * useGPSTracking — Suivi GPS en arrière-plan
 * ===========================================
 *
 * Démarré dès que la tournée est active.
 * Envoie la position toutes les 15 secondes au buffer local,
 * puis flush vers la SyncQueue toutes les 10 positions (~2,5 min).
 *
 * La tâche background (BACKGROUND_GPS_TASK) continue même
 * lorsque l'app est en arrière-plan grâce à expo-task-manager.
 *
 * PERMISSIONS REQUISES :
 *   iOS    → NSLocationAlwaysAndWhenInUseUsageDescription (app.json)
 *   Android → ACCESS_BACKGROUND_LOCATION (app.json)
 */

import { useEffect, useRef } from 'react';
import * as Location    from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage     from '@react-native-async-storage/async-storage';
import { tourSyncEngine } from '../services/tourSyncEngine';

const BACKGROUND_GPS_TASK = 'MTSPC_GPS_TRACKING';
const ACTIVE_TOUR_ID_KEY  = 'active_tour_id';

// ── Définition de la tâche background (hors composant React) ──────────────────
// Cette définition doit être au niveau racine du module pour que
// expo-task-manager l'enregistre au démarrage de l'app.

TaskManager.defineTask(BACKGROUND_GPS_TASK, async ({ data, error }: any) => {
  if (error) {
    console.warn('[GPS Task] Erreur :', error.message);
    return;
  }
  if (!data?.locations?.length) return;

  const tourId = await AsyncStorage.getItem(ACTIVE_TOUR_ID_KEY);
  if (!tourId) return;

  for (const loc of data.locations as Location.LocationObject[]) {
    await tourSyncEngine.bufferGPSPoint(tourId, {
      lat:         loc.coords.latitude,
      lng:         loc.coords.longitude,
      accuracy:    loc.coords.accuracy ?? 0,
      recorded_at: loc.timestamp,
    });
  }
});

// ── Hook React ─────────────────────────────────────────────────────────────────

export function useGPSTracking(tourId: string | null) {
  const flushTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!tourId) return;

    let started = false;

    (async () => {
      // 1. Demander la permission background
      const { status: fg } = await Location.requestForegroundPermissionsAsync();
      if (fg !== 'granted') {
        console.warn('[GPS] Permission foreground refusée');
        return;
      }

      const { status: bg } = await Location.requestBackgroundPermissionsAsync();
      if (bg !== 'granted') {
        console.warn('[GPS] Permission background refusée — suivi foreground seulement');
      }

      // 2. Démarrer la tâche background
      await Location.startLocationUpdatesAsync(BACKGROUND_GPS_TASK, {
        accuracy:          Location.Accuracy.Balanced,
        timeInterval:      15_000,    // toutes les 15 secondes
        distanceInterval:  50,        // ou tous les 50 mètres
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle:   'MTSPC-2026 — Tournée active',
          notificationBody:    'Suivi GPS en cours pour la tournée en cours.',
          notificationColor:   '#1565C0',
        },
      });
      started = true;

      // 3. Timer de flush forcé toutes les 3 minutes (filet de sécurité)
      flushTimer.current = setInterval(async () => {
        await tourSyncEngine.flushGPSBuffer(tourId);
      }, 3 * 60 * 1000);
    })();

    return () => {
      // Nettoyage : arrêt du tracking background
      (async () => {
        try {
          const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_GPS_TASK);
          if (isRegistered) {
            await Location.stopLocationUpdatesAsync(BACKGROUND_GPS_TASK);
          }
        } catch {/* ignore */}
      })();

      if (flushTimer.current) {
        clearInterval(flushTimer.current);
        flushTimer.current = null;
      }
    };
  }, [tourId]);
}
