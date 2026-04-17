import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entrepot } from './entities/entrepot.entity';

@Injectable()
export class EntrepotsService {
  constructor(
    @InjectRepository(Entrepot)
    private readonly repo: Repository<Entrepot>,
  ) {}

  /** Retourne tous les entrepôts — utilisé par la carte Leaflet du Super-Admin */
  findAll(): Promise<Entrepot[]> {
    return this.repo.find({ order: { nom: 'ASC' } });
  }

  findById(id: string): Promise<Entrepot | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Résout l'entrepôt géré par un Admin Entrepôt à partir de son UUID Keycloak.
   * Utilisé par TOUS les endpoints ADMIN_ENTREPOT pour appliquer le filtrage RBAC.
   *
   * Schéma : entrepots.keycloak_admin_id = user.userId (UUID Keycloak)
   */
  findByAdmin(keycloakUserId: string): Promise<Entrepot | null> {
    return this.repo.findOne({
      where: { keycloakAdminId: keycloakUserId },
    });
  }

  /**
   * Associe un compte Keycloak à un entrepôt.
   * Met à jour keycloak_admin_id pour l'entrepôt ET retire l'ancien admin
   * si un autre entrepôt portait déjà ce keycloakAdminId.
   */
  async assignAdmin(entrepotId: string, keycloakAdminId: string): Promise<Entrepot | null> {
    // Retirer l'association précédente si cet admin était déjà lié à un autre entrepôt
    await this.repo.createQueryBuilder()
      .update(Entrepot)
      .set({ keycloakAdminId: () => 'NULL' })
      .where('keycloak_admin_id = :adminId', { adminId: keycloakAdminId })
      .execute();
    // Associer l'entrepôt cible à cet admin
    await this.repo.createQueryBuilder()
      .update(Entrepot)
      .set({ keycloakAdminId })
      .where('id = :id', { id: entrepotId })
      .execute();
    return this.repo.findOne({ where: { id: entrepotId } });
  }
}
