import { Injectable } from '@nestjs/common';

export interface VehiculePosition {
  distributeurId:  string;
  distributeurNom: string;
  tourneeId:       string;
  latitude:        number;
  longitude:       number;
  vitesse:         number;
  cap:             number;
  updatedAt:       string;
}

/**
 * Cache en mémoire des positions GPS des distributeurs.
 * Mis à jour via WebSocket (GpsGateway), consommé par SupervisionService (SSE).
 *
 * En production, ce cache peut être remplacé par Redis.
 */
@Injectable()
export class GpsCacheService {
  private readonly positions = new Map<string, VehiculePosition>();

  /** Mettre à jour ou créer la position d'un distributeur */
  update(pos: VehiculePosition): void {
    this.positions.set(pos.distributeurId, {
      ...pos,
      updatedAt: new Date().toISOString(),
    });
  }

  /** Récupérer toutes les positions actives */
  getAll(): VehiculePosition[] {
    return Array.from(this.positions.values());
  }

  /** Supprimer la position d'un distributeur (déconnexion) */
  remove(distributeurId: string): void {
    this.positions.delete(distributeurId);
  }
}
