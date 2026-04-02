import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Crise }            from './entities/crise.entity';
import { DouarSeverite }    from './entities/douar-severite.entity';
import { CreateCriseDto }   from './dto/create-crise.dto';
import { UpdateCriseStatutDto } from './dto/update-crise-statut.dto';

@Injectable()
export class CrisesService {
  constructor(
    @InjectRepository(Crise)
    private readonly criseRepo: Repository<Crise>,
    @InjectRepository(DouarSeverite)
    private readonly severiteRepo: Repository<DouarSeverite>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Lister toutes les crises ──────────────────────────────────────────────

  findAll(): Promise<Crise[]> {
    return this.criseRepo.find({
      relations: { severitesParDouar: { douar: true } },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Crise active (la plus récente non clôturée) ───────────────────────────

  async findActive(): Promise<Crise | null> {
    return this.criseRepo.findOne({
      where: { statut: 'active' },
      relations: { severitesParDouar: { douar: true } },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Mettre à jour les sévérités d'une crise ───────────────────────────────

  async updateSeverites(
    id: string,
    severites: Array<{
      douarId: string;
      severite: number;
      vulnerabilite: number;
      accessibilite: number;
      accesSoins: number;
    }>,
  ): Promise<Crise> {
    const crise = await this.findOne(id);
    if (crise.statut === 'cloturee') {
      throw new BadRequestException('Une crise clôturée ne peut plus être modifiée');
    }

    await this.dataSource.transaction(async (em) => {
      await em.delete(DouarSeverite, { criseId: id });
      const rows = severites.map((s) =>
        em.create(DouarSeverite, {
          criseId:       id,
          douarId:       s.douarId,
          severite:      s.severite,
          vulnerabilite: s.vulnerabilite,
          accessibilite: s.accessibilite,
          accesSoins:    s.accesSoins,
        }),
      );
      await em.save(rows);
    });

    return this.findOne(id);
  }

  // ── Récupérer une crise avec ses sévérités ────────────────────────────────

  async findOne(id: string): Promise<Crise> {
    const crise = await this.criseRepo.findOne({
      where: { id },
      relations: { severitesParDouar: { douar: true } },
    });
    if (!crise) throw new NotFoundException(`Crise ${id} introuvable`);
    return crise;
  }

  // ── Créer une nouvelle crise (génère la référence CRISE-YYYY-NNN) ─────────

  async create(
    dto: CreateCriseDto,
    acteurId: string,
    acteurUsername: string,
  ): Promise<Crise> {
    const reference = await this.genererReference();

    return this.dataSource.transaction(async (em) => {
      const crise = em.create(Crise, {
        reference,
        type:                  dto.type,
        zone:                  dto.zone,
        description:           dto.description ?? null,
        statut:                'active',
        declencheParId:        acteurId,
        declencheParUsername:  acteurUsername,
      });
      const savedCrise = await em.save(crise);

      const severites = dto.severitesParDouar.map((s) =>
        em.create(DouarSeverite, {
          criseId:       savedCrise.id,
          douarId:       s.douarId,
          severite:      s.severite,
          vulnerabilite: s.vulnerabilite,
          accessibilite: s.accessibilite,
          accesSoins:    s.accesSoins,
        }),
      );
      await em.save(severites);

      return this.findOne(savedCrise.id);
    });
  }

  // ── Changer le statut (suspendue / cloturee) ──────────────────────────────

  async updateStatut(id: string, dto: UpdateCriseStatutDto): Promise<Crise> {
    const crise = await this.findOne(id);

    if (crise.statut === 'cloturee') {
      throw new BadRequestException('Une crise clôturée ne peut plus être modifiée');
    }

    crise.statut     = dto.statut;
    crise.clotureeAt = dto.statut === 'cloturee' ? new Date() : crise.clotureeAt;

    await this.criseRepo.save(crise);
    return this.findOne(id);
  }

  // ── Génération de la référence CRISE-YYYY-NNN ─────────────────────────────

  private async genererReference(): Promise<string> {
    const year  = new Date().getFullYear();
    const count = await this.criseRepo
      .createQueryBuilder('c')
      .where('EXTRACT(YEAR FROM c.created_at) = :year', { year })
      .getCount();
    const seq   = String(count + 1).padStart(3, '0');
    return `CRISE-${year}-${seq}`;
  }
}
