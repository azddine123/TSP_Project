import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { Vehicule }                  from './entities/vehicule.entity';
import { CreateVehiculeDto }         from './dto/create-vehicule.dto';
import { UpdateVehiculeStatutDto }   from './dto/update-vehicule-statut.dto';
import { EntrepotsService }          from '../entrepots/entrepots.service';
import type { AuthUser }             from '../auth/decorators/roles.decorator';

@Injectable()
export class VehiculesService {
  constructor(
    @InjectRepository(Vehicule)
    private readonly repo: Repository<Vehicule>,
    private readonly entrepotsService: EntrepotsService,
  ) {}

  // ── Résolution de l'entrepotId depuis le userId Keycloak ─────────────────
  private async resolveEntrepotId(userId: string): Promise<string> {
    const entrepot = await this.entrepotsService.findByAdmin(userId);
    if (!entrepot) {
      throw new ForbiddenException('Aucun entrepôt associé à votre compte.');
    }
    return entrepot.id;
  }

  // ── Liste des véhicules de l'entrepôt ────────────────────────────────────
  async findByEntrepot(user: AuthUser): Promise<Vehicule[]> {
    const entrepotId = await this.resolveEntrepotId(user.userId);
    return this.repo.find({
      where:     { entrepotId },
      relations: ['distributeur'],
      order:     { immatriculation: 'ASC' },
    });
  }

  // ── Créer un véhicule ────────────────────────────────────────────────────
  async create(dto: CreateVehiculeDto, user: AuthUser): Promise<Vehicule> {
    const entrepotId = await this.resolveEntrepotId(user.userId);
    const vehicule = this.repo.create({
      entrepotId,
      immatriculation: dto.immatriculation,
      type:            dto.type,
      marque:          dto.marque    ?? null,
      capacite:        dto.capacite  ?? null,
      notes:           dto.notes     ?? null,
      statut:          'disponible',
      distributeurId:  null,
    });
    return this.repo.save(vehicule);
  }

  // ── Mettre à jour le statut ──────────────────────────────────────────────
  async updateStatut(
    id: string,
    dto: UpdateVehiculeStatutDto,
    user: AuthUser,
  ): Promise<Vehicule> {
    const entrepotId = await this.resolveEntrepotId(user.userId);
    const vehicule = await this.repo.findOne({ where: { id } });

    if (!vehicule) throw new NotFoundException(`Véhicule ${id} introuvable.`);
    if (vehicule.entrepotId !== entrepotId) {
      throw new ForbiddenException('Ce véhicule n\'appartient pas à votre entrepôt.');
    }

    vehicule.statut        = dto.statut;
    vehicule.distributeurId = dto.distributeurId ?? (dto.statut === 'disponible' ? null : vehicule.distributeurId);

    return this.repo.save(vehicule);
  }

  // ── Supprimer un véhicule ────────────────────────────────────────────────
  async remove(id: string, user: AuthUser): Promise<void> {
    const entrepotId = await this.resolveEntrepotId(user.userId);
    const vehicule = await this.repo.findOne({ where: { id } });

    if (!vehicule) throw new NotFoundException(`Véhicule ${id} introuvable.`);
    if (vehicule.entrepotId !== entrepotId) {
      throw new ForbiddenException('Ce véhicule n\'appartient pas à votre entrepôt.');
    }

    await this.repo.remove(vehicule);
  }
}
