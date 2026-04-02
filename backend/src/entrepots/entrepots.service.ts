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
}
