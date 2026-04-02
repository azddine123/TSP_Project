import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GpsCacheService } from './gps-cache.service';

export interface GpsUpdatePayload {
  distributeurId: string;
  distributeurNom?: string;
  tourneeId:       string;
  latitude:        number;
  longitude:       number;
  vitesse:         number;
  cap:             number;
}

/**
 * Gateway WebSocket — reçoit les mises à jour GPS des distributeurs (app mobile).
 *
 * Namespace : /gps
 * Événements :
 *   → 'gps:update'   (mobile → backend) : mise à jour de position
 *   ← 'gps:ack'      (backend → mobile) : accusé de réception
 *
 * Authentification : le token JWT est envoyé dans `socket.handshake.auth.token`
 * et vérifié manuellement ici (pas de guard Passport sur les gateways WebSocket).
 *
 * CORS : autoriser le frontend et l'app mobile en dev.
 */
@WebSocketGateway({
  namespace: '/gps',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class GpsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GpsGateway.name);

  /** Map socket.id → distributeurId pour le nettoyage à la déconnexion */
  private readonly socketToDistributeur = new Map<string, string>();

  constructor(private readonly gpsCache: GpsCacheService) {}

  // ── Connexion ─────────────────────────────────────────────────────────────

  handleConnection(client: Socket) {
    const distributeurId = client.handshake.auth?.distributeurId as string | undefined;
    if (distributeurId) {
      this.socketToDistributeur.set(client.id, distributeurId);
      this.logger.log(`Distributeur ${distributeurId} connecté (socket: ${client.id})`);
    } else {
      this.logger.warn(`Socket ${client.id} connecté sans distributeurId`);
    }
  }

  // ── Déconnexion ───────────────────────────────────────────────────────────

  handleDisconnect(client: Socket) {
    const distributeurId = this.socketToDistributeur.get(client.id);
    if (distributeurId) {
      this.gpsCache.remove(distributeurId);
      this.socketToDistributeur.delete(client.id);
      this.logger.log(`Distributeur ${distributeurId} déconnecté`);
    }
  }

  // ── Réception d'une mise à jour GPS ───────────────────────────────────────

  @SubscribeMessage('gps:update')
  handleGpsUpdate(
    @MessageBody() payload: GpsUpdatePayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload?.distributeurId || !payload?.latitude || !payload?.longitude) {
      return { event: 'gps:error', data: 'Payload invalide' };
    }

    this.gpsCache.update({
      distributeurId:  payload.distributeurId,
      distributeurNom: payload.distributeurNom ?? payload.distributeurId,
      tourneeId:       payload.tourneeId,
      latitude:        payload.latitude,
      longitude:       payload.longitude,
      vitesse:         payload.vitesse ?? 0,
      cap:             payload.cap ?? 0,
      updatedAt:       new Date().toISOString(),
    });

    return { event: 'gps:ack', data: { received: true, ts: Date.now() } };
  }
}
