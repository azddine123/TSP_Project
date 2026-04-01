import {
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evenement }               from './entities/evenement.entity';
import { CreateEvenementDto }      from './dto/create-evenement.dto';
import { UpdateEvenementStatutDto } from './dto/update-evenement-statut.dto';
import { SendAlertDto }            from './dto/send-alert.dto';

export interface EvenementsPage {
  data:  Evenement[];
  meta:  { total: number; page: number; totalPages: number };
}

@Injectable()
export class EvenementsService {
  constructor(
    @InjectRepository(Evenement)
    private readonly repo: Repository<Evenement>,
  ) {}

  // ── Lister les événements d'une crise (paginé) ────────────────────────────

  async findByCrise(
    criseId: string,
    page = 1,
    limit = 20,
  ): Promise<EvenementsPage> {
    const [data, total] = await this.repo.findAndCount({
      where:  { criseId },
      order:  { createdAt: 'DESC' },
      skip:   (page - 1) * limit,
      take:   limit,
    });

    return { data, meta: { total, page, totalPages: Math.ceil(total / limit) } };
  }

  // ── Créer un événement ────────────────────────────────────────────────────

  async create(
    dto: CreateEvenementDto,
    acteurId: string | null,
    acteurNom: string | null,
  ): Promise<Evenement> {
    const e = this.repo.create({
      criseId:       dto.criseId,
      type:          dto.type,
      severite:      dto.severite,
      titre:         dto.titre,
      description:   dto.description,
      tourneeId:     dto.tourneeId ?? null,
      douarId:       dto.douarId  ?? null,
      signaleParId:  acteurId,
      signaleParNom: acteurNom,
      statut:        'ouvert',
    });
    return this.repo.save(e);
  }

  // ── Créer une alerte PUSH vers des distributeurs ──────────────────────────
  // (Enregistre l'événement ; la notification Push est gérée par le module Supervision)

  async sendAlert(
    dto: SendAlertDto,
    acteurId: string,
    acteurNom: string,
  ): Promise<Evenement> {
    return this.create(
      {
        criseId:     dto.criseId,
        type:        'ALERTE_PUSH' as any,
        severite:    dto.severite,
        titre:       dto.titre,
        description: `${dto.message} [destinataires: ${dto.distributeurIds.join(', ')}]`,
      },
      acteurId,
      acteurNom,
    );
  }

  // ── Changer le statut d'un événement ──────────────────────────────────────

  async updateStatut(id: string, dto: UpdateEvenementStatutDto): Promise<Evenement> {
    const e = await this.repo.findOneBy({ id });
    if (!e) throw new NotFoundException(`Événement ${id} introuvable`);

    e.statut     = dto.statut;
    e.resolvedAt = dto.statut === 'resolu' ? new Date() : e.resolvedAt;

    return this.repo.save(e);
  }
}
