/**
 * GPS SERVICE — Envoi de la position GPS vers le backend via WebSocket
 * =====================================================================
 *
 * FLUX :
 * ──────
 * expo-location (background)
 *   → watchPositionAsync() → latitude, longitude, accuracy
 *   → envoi toutes les GPS_INTERVAL_MS au backend via WebSocket
 *   → le backend broadcast vers le dashboard Super Admin (supervision globale)
 *
 * En mode hors-ligne (pas de réseau) :
 *   → la position est stockée localement (lastKnownPosition)
 *   → le WebSocket se reconnecte automatiquement au retour du réseau
 */
import * as SecureStore from 'expo-secure-store';
import { GpsPosition } from '../types/app';
import { API_BASE_URL } from '../config/keycloakConfig';

// Intervalle d'envoi GPS (30 secondes — équilibre batterie / précision)
const GPS_INTERVAL_MS = 30_000;
const TOKEN_KEY = 'reliefchain_access_token';

// Dériver l'URL WebSocket depuis l'URL API REST
// Ex: http://192.168.1.1:9090/api/v1 → ws://192.168.1.1:9090
const WS_BASE_URL = API_BASE_URL
    .replace(/^http/, 'ws')
    .replace(/\/api\/v1.*/, '');

class GpsWebSocketService {
    private ws: WebSocket | null = null;
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private tourneeId: string | null = null;
    private distributeurId: string | null = null;
    private lastPosition: { lat: number; lng: number; accuracy?: number } | null = null;
    private connected: boolean = false;

    /**
     * Démarrer l'envoi GPS.
     * Appelé depuis useGpsTracking quand une tournée commence.
     */
    async start(tourneeId: string, distributeurId: string): Promise<void> {
        this.tourneeId = tourneeId;
        this.distributeurId = distributeurId;

        await this._connect();

        // Envoyer la position toutes les GPS_INTERVAL_MS
        this.intervalId = setInterval(() => {
            if (this.lastPosition && this.connected) {
                this._sendPosition(this.lastPosition);
            }
        }, GPS_INTERVAL_MS);
    }

    /** Mettre à jour la position courante (appelé par useGpsTracking) */
    updatePosition(lat: number, lng: number, accuracy?: number): void {
        this.lastPosition = { lat, lng, accuracy };
        // Envoi immédiat si connecté (en plus du timer régulier)
        if (this.connected) {
            this._sendPosition({ lat, lng, accuracy });
        }
    }

    /** Arrêter le tracking GPS */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.tourneeId = null;
        this.distributeurId = null;
        this.lastPosition = null;
    }

    // ── Connexion WebSocket ─────────────────────────────────────────────────────

    private async _connect(): Promise<void> {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) {
            console.warn('[GPS] Pas de token — WebSocket non ouvert');
            return;
        }

        try {
            // Le token est passé en query param car les headers WS ne sont pas
            // supportés nativement par le WebSocket API React Native.
            this.ws = new WebSocket(
                `${WS_BASE_URL}/gps?token=${encodeURIComponent(token)}`
            );

            this.ws.onopen = () => {
                this.connected = true;
                console.log('[GPS] WebSocket connecté');
            };

            this.ws.onclose = (e) => {
                this.connected = false;
                console.warn('[GPS] WebSocket fermé :', e.code, e.reason);
                // Reconnexion automatique après 10 s si le tracking est encore actif
                if (this.tourneeId) {
                    setTimeout(() => this._connect(), 10_000);
                }
            };

            this.ws.onerror = (e) => {
                console.error('[GPS] Erreur WebSocket :', e);
            };

        } catch (err) {
            console.error('[GPS] Impossible d\'ouvrir le WebSocket :', err);
        }
    }

    // ── Envoi d'un message GPS ──────────────────────────────────────────────────

    private _sendPosition(pos: { lat: number; lng: number; accuracy?: number }): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const payload: GpsPosition = {
            distributeurId: this.distributeurId!,
            tourneeId: this.tourneeId!,
            lat: pos.lat,
            lng: pos.lng,
            accuracy: pos.accuracy,
            timestamp: new Date().toISOString(),
        };

        try {
            this.ws.send(JSON.stringify({ event: 'gps_update', data: payload }));
        } catch (err) {
            console.warn('[GPS] Échec envoi position :', err);
        }
    }
}

// Singleton — une seuleinstance pour toute l'app
export const gpsService = new GpsWebSocketService();
