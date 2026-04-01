/**
 * TOUR SYNC ENGINE — Cœur du mode Offline-First
 * ===============================================
 *
 * Responsabilités :
 *  1. Pré-chargement (prefetch) du manifest de tournée depuis le backend
 *     → stocké dans AsyncStorage pour accès hors-ligne
 *  2. Persistance locale des confirmations de livraison
 *  3. Traitement de la file SyncQueue dès que le réseau est disponible
 *  4. Upload des photos vers le backend (multipart)
 *  5. Résolution de conflits (last-write-wins avec vérification par timestamp)
 *
 * STOCKAGE :
 *   AsyncStorage['active_tour']      → Tour JSON complet
 *   AsyncStorage['active_tour_id']   → ID de la tournée active
 *   SyncQueue (QUEUE_KEY)            → File d'opérations en attente
 */

import AsyncStorage   from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import NetInfo         from '@react-native-community/netinfo';
import { syncQueue }   from './syncQueue';
import {
  Tour, EtapeLivraison, TourManifest,
  PayloadConfirmLivraison, PayloadGPSBatch, PayloadAlerte, PointGPS,
} from '../types/tour';

const TOUR_KEY        = 'active_tour';
const TOUR_ID_KEY     = 'active_tour_id';
const TOKEN_KEY       = 'reliefchain_access_token';
const GPS_BUFFER_KEY  = 'gps_buffer';         // Buffer local avant enqueue batch
const API_BASE        = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// ── Utilitaires ────────────────────────────────────────────────────────────────

function uuid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function getToken(): Promise<string> {
  return (await SecureStore.getItemAsync(TOKEN_KEY)) ?? '';
}

async function authHeaders(): Promise<Record<string, string>> {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${await getToken()}`,
  };
}

// ── Engine ─────────────────────────────────────────────────────────────────────

export const tourSyncEngine = {

  // ── 1. Pré-chargement du manifest ──────────────────────────────────────────

  /**
   * À appeler depuis l'entrepôt (Wi-Fi disponible) avant le départ.
   * Télécharge le manifest complet de la tournée et l'hydrate en local.
   */
  async prefetchTour(tourId: string): Promise<Tour> {
    const res = await fetch(`${API_BASE}/tours/${tourId}/full-manifest`, {
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} — impossible de charger la tournée`);

    const manifest: TourManifest = await res.json();

    const tour: Tour = {
      id:          uuid(),
      tourId:      manifest.tour_id,
      chauffeurId: manifest.driver_id,
      dateDebut:   new Date(manifest.date).getTime(),
      statut:      'pending',
      rawManifest: JSON.stringify(manifest),
      etapes: manifest.stops.map((s) => ({
        id:                uuid(),
        tourId:            manifest.tour_id,
        douarId:           s.douar_id,
        douarNom:          s.douar_name,
        ordreSequence:     s.sequence_order,
        distanceKm:        s.distance_km,
        etaMinutes:        s.eta_minutes,
        latitude:          s.latitude,
        longitude:         s.longitude,
        priorite:          s.priority,
        topsisScore:       s.topsis_score,
        articlesPlanifies: s.planned_items,
        statut:            'pending',
        isSynced:          false,
      })),
    };

    await AsyncStorage.setItem(TOUR_KEY, JSON.stringify(tour));
    await AsyncStorage.setItem(TOUR_ID_KEY, manifest.tour_id);
    return tour;
  },

  // ── 2. Lecture de la tournée locale ────────────────────────────────────────

  async getTourLocal(): Promise<Tour | null> {
    const raw = await AsyncStorage.getItem(TOUR_KEY);
    return raw ? (JSON.parse(raw) as Tour) : null;
  },

  async getActiveTourId(): Promise<string | null> {
    return AsyncStorage.getItem(TOUR_ID_KEY);
  },

  // ── 3. Confirmation de livraison (terrain) ─────────────────────────────────

  /**
   * Met à jour l'étape localement (optimistic) puis l'enqueue pour sync.
   * Retourne la tournée mise à jour.
   */
  async confirmDelivery(params: {
    etapeId:        string;
    statut:         EtapeLivraison['statut'];
    articlesLivres: EtapeLivraison['articlesPlanifies'];
    photoUri?:      string;
    signatureB64?:  string;
    noteChaufeur?:  string;
    gpsLat?:        number;
    gpsLng?:        number;
  }): Promise<Tour> {
    const tour = await this.getTourLocal();
    if (!tour) throw new Error('Aucune tournée active en local');

    const etapeIdx = tour.etapes.findIndex((e) => e.id === params.etapeId);
    if (etapeIdx === -1) throw new Error(`Étape ${params.etapeId} introuvable`);

    // Mise à jour locale immédiate
    const confirmeAt = Date.now();
    tour.etapes[etapeIdx] = {
      ...tour.etapes[etapeIdx],
      statut:         params.statut,
      articlesLivres: params.articlesLivres,
      photoUri:       params.photoUri,
      signatureB64:   params.signatureB64,
      noteChaufeur:   params.noteChaufeur,
      gpsLat:         params.gpsLat,
      gpsLng:         params.gpsLng,
      confirmeAt,
      isSynced:       false,
    };

    // Marquer la tournée active dès la première confirmation
    if (tour.statut === 'pending') tour.statut = 'active';

    await AsyncStorage.setItem(TOUR_KEY, JSON.stringify(tour));

    // Enqueue vers la file pour sync ultérieure
    const payload: PayloadConfirmLivraison = {
      tour_id:         tour.tourId,
      douar_id:        tour.etapes[etapeIdx].douarId,
      statut:          params.statut,
      articles_livres: params.articlesLivres,
      confirmed_at:    confirmeAt,
      gps:             params.gpsLat != null
        ? { lat: params.gpsLat, lng: params.gpsLng! }
        : undefined,
      note_chauffeur:  params.noteChaufeur,
      // photo_url sera renseigné après upload par le SyncEngine
      signature_b64:   params.signatureB64,
    };

    // Stocker le photoUri local dans le payload pour l'upload ultérieur
    const payloadAvecPhoto = {
      ...payload,
      _local_photo_uri: params.photoUri,
    };

    await syncQueue.enqueue('DELIVERY_CONFIRM', payloadAvecPhoto);

    // Tentative de sync immédiate si réseau disponible
    const net = await NetInfo.fetch();
    if (net.isConnected && net.isInternetReachable) {
      this.processPendingSync().catch(() => {/* ignore, sera réessayé */});
    }

    return tour;
  },

  // ── 4. Buffer GPS local + enqueue batch ────────────────────────────────────

  /** Appelé par useGPSTracking toutes les 15 secondes */
  async bufferGPSPoint(tourId: string, point: PointGPS): Promise<void> {
    const raw    = await AsyncStorage.getItem(GPS_BUFFER_KEY);
    const buffer: PointGPS[] = raw ? JSON.parse(raw) : [];
    buffer.push(point);
    await AsyncStorage.setItem(GPS_BUFFER_KEY, JSON.stringify(buffer));

    // Flush automatique tous les 10 points (~2 min 30 en mode 15s)
    if (buffer.length >= 10) {
      await this.flushGPSBuffer(tourId);
    }
  },

  async flushGPSBuffer(tourId: string): Promise<void> {
    const raw = await AsyncStorage.getItem(GPS_BUFFER_KEY);
    if (!raw) return;
    const buffer: PointGPS[] = JSON.parse(raw);
    if (buffer.length === 0) return;

    const payload: PayloadGPSBatch = { tour_id: tourId, points: buffer };
    await syncQueue.enqueue('GPS_BATCH', payload);
    await AsyncStorage.removeItem(GPS_BUFFER_KEY);
  },

  // ── 5. Alerte terrain ───────────────────────────────────────────────────────

  async reportRoadAlert(payload: PayloadAlerte): Promise<void> {
    await syncQueue.enqueue('ROAD_ALERT', payload);

    const net = await NetInfo.fetch();
    if (net.isConnected && net.isInternetReachable) {
      this.processPendingSync().catch(() => {});
    }
  },

  // ── 6. Traitement de la file (appelé à chaque reconnexion réseau) ───────────

  private _isSyncing: boolean = false,

  async processPendingSync(): Promise<{ synced: number; failed: number }> {
    if (this._isSyncing) return { synced: 0, failed: 0 };
    this._isSyncing = true;

    let synced = 0;
    let failed = 0;

    try {
      const pending = await syncQueue.getPending();

      for (const op of pending) {
        try {
          await syncQueue.markProcessing(op.id);
          const payload = JSON.parse(op.payload);

          switch (op.type) {
            case 'DELIVERY_CONFIRM':
              await this._syncDeliveryConfirm(op.id, payload);
              break;
            case 'GPS_BATCH':
              await this._syncGPSBatch(payload);
              break;
            case 'ROAD_ALERT':
              await this._syncRoadAlert(payload);
              break;
          }

          await syncQueue.markDone(op.id);
          synced++;

        } catch (err: any) {
          const next = op.retryCount + 1;
          if (next >= 5) {
            await syncQueue.markFailed(op.id, err?.message ?? 'Erreur inconnue');
          } else {
            await syncQueue.scheduleRetry(op.id, next, err?.message);
          }
          failed++;
        }
      }
    } finally {
      this._isSyncing = false;
    }

    return { synced, failed };
  },

  // ── 7. Envoi individuel vers le backend ─────────────────────────────────────

  async _syncDeliveryConfirm(opId: string, payload: any): Promise<void> {
    // 7a. Upload photo si présente
    let photoUrl: string | undefined;
    if (payload._local_photo_uri) {
      photoUrl = await this._uploadPhoto(
        payload._local_photo_uri,
        payload.tour_id,
        payload.douar_id,
      );
    }

    // Supprimer le champ interne avant envoi
    const { _local_photo_uri, ...cleanPayload } = payload;
    if (photoUrl) cleanPayload.photo_url = photoUrl;

    // 7b. POST vers le backend
    const res = await fetch(`${API_BASE}/sync/delivery-confirm`, {
      method:  'POST',
      headers: await authHeaders(),
      body:    JSON.stringify(cleanPayload),
    });

    if (res.status === 409) {
      // Conflit : le serveur a une version plus récente → on accepte silencieusement
      console.warn(`[Sync] Conflit résolu (409) pour douar ${payload.douar_id}`);
      return;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // 7c. Marquer l'étape comme synced dans le stockage local
    await this._markEtapeSynced(payload.tour_id, payload.douar_id);
  },

  async _syncGPSBatch(payload: PayloadGPSBatch): Promise<void> {
    const res = await fetch(`${API_BASE}/sync/gps-track`, {
      method:  'POST',
      headers: await authHeaders(),
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`GPS batch HTTP ${res.status}`);
  },

  async _syncRoadAlert(payload: PayloadAlerte): Promise<void> {
    const res = await fetch(`${API_BASE}/alerts`, {
      method:  'POST',
      headers: await authHeaders(),
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Alert HTTP ${res.status}`);
  },

  // ── 8. Upload photo multipart ───────────────────────────────────────────────

  async _uploadPhoto(
    localUri: string,
    tourId: string,
    douarId: string,
  ): Promise<string> {
    const token    = await getToken();
    const formData = new FormData();
    formData.append('photo',    { uri: localUri, type: 'image/jpeg', name: 'proof.jpg' } as any);
    formData.append('tour_id',  tourId);
    formData.append('douar_id', douarId);

    const res = await fetch(`${API_BASE}/sync/photo-upload`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
      body:    formData,
    });
    if (!res.ok) throw new Error(`Photo upload HTTP ${res.status}`);

    const data = await res.json();
    return data.url as string;
  },

  // ── 9. Marquer une étape comme synced dans le stockage local ───────────────

  async _markEtapeSynced(tourId: string, douarId: string): Promise<void> {
    const tour = await this.getTourLocal();
    if (!tour) return;
    const etape = tour.etapes.find((e) => e.tourId === tourId && e.douarId === douarId);
    if (etape) {
      etape.isSynced = true;
      await AsyncStorage.setItem(TOUR_KEY, JSON.stringify(tour));
    }
  },
};
