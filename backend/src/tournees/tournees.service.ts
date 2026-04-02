import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tournee }        from './entities/tournee.entity';
import { TourneeEtape }   from './entities/tournee-etape.entity';
import { AssignerTourneeDto }     from './dto/assigner-tournee.dto';
import { UpdateEtapeStatutDto }   from './dto/update-etape-statut.dto';
import { PipelineResultEntity }   from '../algorithmes/entities/pipeline-result.entity';
import { Entrepot }       from '../entrepots/entities/entrepot.entity';
import { VrpTournee }     from '../algorithmes/vrp.service';

@Injectable()
export class TourneesService {
  constructor(
    @InjectRepository(Tournee)
    private readonly tourneeRepo: Repository<Tournee>,
    @InjectRepository(TourneeEtape)
    private readonly etapeRepo: Repository<TourneeEtape>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Persister les tournées VRP issues du pipeline ─────────────────────────

  async persistFromPipeline(
    pipeline: PipelineResultEntity,
    vrpTournees: VrpTournee[],
    entrepotsMap: Map<string, Entrepot>,
  ): Promise<Tournee[]> {
    return this.dataSource.transaction(async (em) => {
      const saved: Tournee[] = [];

      for (const vt of vrpTournees) {
        const entrepot = entrepotsMap.get(vt.entrepotId);
        if (!entrepot) continue;

        const tournee = em.create(Tournee, {
          criseId:       pipeline.criseId,
          pipelineId:    pipeline.id,
          entrepotId:    vt.entrepotId,
          distributeurId: null,
          statut:        'planifiee',
          distanceTotale: vt.distanceTotale,
          tempsEstime:   vt.tempsEstime,
        });
        const savedTournee = await em.save(tournee);

        const etapes = vt.etapes.map((e) =>
          em.create(TourneeEtape, {
            tourneeId: savedTournee.id,
            douarId:   e.douarId,
            ordre:     e.ordre,
            statut:    'en_attente',
          }),
        );
        await em.save(etapes);

        saved.push(savedTournee);
      }

      return saved;
    });
  }

  // ── Lister les tournées d'une crise ───────────────────────────────────────

  findByCrise(criseId: string): Promise<Tournee[]> {
    return this.tourneeRepo.find({
      where:     { criseId },
      relations: { etapes: { douar: true }, entrepot: true, distributeur: true },
      order:     { createdAt: 'ASC' },
    });
  }

  // ── Lister les tournées de l'entrepôt (Admin Entrepôt) ───────────────────

  findByEntrepot(entrepotId: string): Promise<Tournee[]> {
    return this.tourneeRepo.find({
      where:     { entrepotId },
      relations: { etapes: { douar: true }, entrepot: true, distributeur: true },
      order:     { createdAt: 'DESC' },
    });
  }

  // ── Récupérer une tournée ─────────────────────────────────────────────────

  async findOne(id: string): Promise<Tournee> {
    const t = await this.tourneeRepo.findOne({
      where:     { id },
      relations: { etapes: { douar: true }, entrepot: true, distributeur: true },
    });
    if (!t) throw new NotFoundException(`Tournée ${id} introuvable`);
    return t;
  }

  // ── Assigner un distributeur ──────────────────────────────────────────────

  async assigner(id: string, dto: AssignerTourneeDto): Promise<Tournee> {
    const tournee = await this.findOne(id);
    if (tournee.statut !== 'planifiee') {
      throw new BadRequestException('Seules les tournées planifiées peuvent être assignées');
    }
    tournee.distributeurId = dto.distributeurId;
    await this.tourneeRepo.save(tournee);
    return this.findOne(id);
  }

  // ── Réassigner un distributeur (tournée en cours) ────────────────────────

  async reassigner(id: string, dto: AssignerTourneeDto): Promise<Tournee> {
    const tournee = await this.findOne(id);
    if (tournee.statut === 'terminee' || tournee.statut === 'annulee') {
      throw new BadRequestException('Impossible de réassigner une tournée terminée ou annulée');
    }
    tournee.distributeurId = dto.distributeurId;
    await this.tourneeRepo.save(tournee);
    return this.findOne(id);
  }

  // ── Annuler une tournée ───────────────────────────────────────────────────

  async annuler(id: string): Promise<Tournee> {
    const tournee = await this.findOne(id);
    if (tournee.statut === 'terminee') {
      throw new BadRequestException('Impossible d\'annuler une tournée déjà terminée');
    }
    tournee.statut = 'annulee';
    await this.tourneeRepo.save(tournee);
    return this.findOne(id);
  }

  // ── Démarrer une tournée ──────────────────────────────────────────────────

  async demarrer(id: string): Promise<Tournee> {
    const tournee = await this.findOne(id);
    if (tournee.statut !== 'planifiee') {
      throw new BadRequestException('La tournée doit être planifiée pour être démarrée');
    }
    tournee.statut     = 'en_cours';
    tournee.demarreeAt = new Date();
    await this.tourneeRepo.save(tournee);
    return this.findOne(id);
  }

  // ── Mettre à jour le statut d'une étape ───────────────────────────────────

  async updateEtapeStatut(
    tourneeId: string,
    etapeId: string,
    dto: UpdateEtapeStatutDto,
  ): Promise<TourneeEtape> {
    const etape = await this.etapeRepo.findOne({
      where: { id: etapeId, tourneeId },
    });
    if (!etape) throw new NotFoundException(`Étape ${etapeId} introuvable`);

    etape.statut    = dto.statut;
    etape.arriveeAt = dto.statut === 'livree' ? new Date() : etape.arriveeAt;

    await this.etapeRepo.save(etape);

    // Vérifier si toutes les étapes sont terminées → clôturer la tournée
    const tournee = await this.findOne(tourneeId);
    const allDone = tournee.etapes.every((e) =>
      e.statut === 'livree' || e.statut === 'echec',
    );
    if (allDone && tournee.statut === 'en_cours') {
      tournee.statut     = 'terminee';
      tournee.termineeAt = new Date();
      await this.tourneeRepo.save(tournee);
    }

    return etape;
  }
}
