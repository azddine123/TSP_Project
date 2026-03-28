import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Distributeur } from './entities/distributeur.entity';

@Injectable()
export class DistributeursService {
  constructor(
    @InjectRepository(Distributeur)
    private readonly repo: Repository<Distributeur>,
  ) {}

  /** Liste des distributeurs — pour la liste déroulante du formulaire Web */
  findAll(): Promise<Distributeur[]> {
    return this.repo.find({ order: { nom: 'ASC' } });
  }

  /**
   * Recherche un distributeur par son UUID Keycloak.
   * Utilisé par MissionsService pour identifier le distributeur connecté (mobile).
   */
  findByKeycloakId(keycloakUserId: string): Promise<Distributeur | null> {
    return this.repo.findOne({ where: { keycloakUserId } });
  }

  /**
   * Met à jour le statut opérationnel d'un distributeur.
   * - 'en_mission'  → appelé à la création d'une mission
   * - 'disponible'  → appelé à la complétion d'une mission
   */
  async updateStatut(id: string, statut: string): Promise<void> {
    const dist = await this.repo.findOne({ where: { id } });
    if (!dist) throw new NotFoundException(`Distributeur ${id} introuvable.`);
    dist.statut = statut;
    await this.repo.save(dist);
  }

  /**
   * Même logique que updateStatut() mais via l'UUID Keycloak.
   * Utilisé par POST /sync (le distributeur s'identifie via son token, pas son ID interne).
   */
  async updateStatutByKeycloakId(keycloakUserId: string, statut: string): Promise<void> {
    const dist = await this.repo.findOne({ where: { keycloakUserId } });
    if (!dist) return;  // Ne pas bloquer le sync si le profil n'est pas trouvé
    dist.statut = statut;
    await this.repo.save(dist);
  }
}
