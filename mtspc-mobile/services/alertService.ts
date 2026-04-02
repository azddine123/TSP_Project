/**
 * ALERT SERVICE — Écoute des alertes terrain via WebSocket + Signalement obstacles
 * =================================================================================
 *
 * Deux responsabilités :
 *  1. RÉCEPTION : s'abonner aux alertes pushées par le Super Admin via le backend WS
 *  2. ÉMISSION  : permettre au distributeur de signaler un obstacle
 *                 → peut déclencher un recalcul dynamique de tournée côté backend
 */
import * as SecureStore from 'expo-secure-store';
import { AlerteTerrain } from '../types/app';
import { API_BASE_URL } from '../config/keycloakConfig';

const TOKEN_KEY = 'reliefchain_access_token';
const WS_BASE_URL = API_BASE_URL
    .replace(/^http/, 'ws')
    .replace(/\/api\/v1.*/, '');

type AlerteCallback = (alerte: AlerteTerrain) => void;

class AlertWebSocketService {
    private ws: WebSocket | null = null;
    private callback: AlerteCallback | null = null;
    private tourneeId: string | null = null;

    // ── Réception : S'abonner aux alertes ──────────────────────────────────────

    async subscribe(callback: AlerteCallback): Promise<void> {
        this.callback = callback;
        await this._connect();
    }

    unsubscribe(): void {
        this.callback = null;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // ── Émission : Signaler un obstacle ────────────────────────────────────────

    /**
     * Permet au distributeur de signaler un obstacle sur la route.
     * Si le type est 'route_bloquee', le backend peut déclencher un recalcul VRP.
     */
    async signalerObstacle(params: {
        tourneeId: string;
        type: 'route_bloquee' | 'autre';
        message: string;
        lat?: number;
        lng?: number;
    }): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            // Envoi temps réel via WebSocket si connecté
            this.ws.send(JSON.stringify({
                event: 'signaler_obstacle',
                data: params,
            }));
            console.log('[Alert] Obstacle signalé via WS :', params.type);
        } else {
            // Fallback : envoi HTTP si WebSocket non disponible
            await this._signalerObstacleHTTP(params);
        }
    }

    // ── Connexion WebSocket ─────────────────────────────────────────────────────

    private async _connect(): Promise<void> {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) return;

        this.ws = new WebSocket(
            `${WS_BASE_URL}/alertes?token=${encodeURIComponent(token)}`
        );

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                // Structure NestJS WebSocket : { event: 'alerte', data: AlerteTerrain }
                if (msg.event === 'alerte' && this.callback) {
                    this.callback(msg.data as AlerteTerrain);
                }
            } catch (err) {
                console.warn('[Alert] Message WS non parsable :', event.data);
            }
        };

        this.ws.onopen = () => console.log('[Alert] WebSocket alertes connecté');
        this.ws.onclose = () => {
            // Reconnexion automatique si le callback est encore actif
            if (this.callback) {
                setTimeout(() => this._connect(), 8_000);
            }
        };
        this.ws.onerror = (e) => console.error('[Alert] Erreur WS :', e);
    }

    // ── Fallback HTTP ───────────────────────────────────────────────────────────

    private async _signalerObstacleHTTP(params: object): Promise<void> {
        try {
            const token = await SecureStore.getItemAsync(TOKEN_KEY);
            await fetch(`${API_BASE_URL}/evenements`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({
                    type: 'incident',
                    message: (params as any).message,
                    data: params,
                }),
            });
            console.log('[Alert] Obstacle signalé via HTTP (fallback)');
        } catch (err) {
            console.error('[Alert] Échec signalement HTTP :', err);
        }
    }
}

// Singleton
export const alertService = new AlertWebSocketService();
