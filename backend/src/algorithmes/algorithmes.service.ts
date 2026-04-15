import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineResultEntity } from './entities/pipeline-result.entity';
import { AhpService }    from './ahp.service';
import { TopsisService } from './topsis.service';
import { VrpService }    from './vrp.service';
import { RunPipelineDto } from './dto/run-pipeline.dto';
import { CrisesService }  from '../crises/crises.service';
import { EntrepotsService } from '../entrepots/entrepots.service';
import { TourneesService } from '../tournees/tournees.service';

@Injectable()
export class AlgorithmesService {
  private readonly logger = new Logger(AlgorithmesService.name);

  constructor(
    @InjectRepository(PipelineResultEntity)
    private readonly pipelineRepo: Repository<PipelineResultEntity>,
    private readonly ahpService:      AhpService,
    private readonly topsisService:   TopsisService,
    private readonly vrpService:      VrpService,
    private readonly crisesService:   CrisesService,
    private readonly entrepotsService: EntrepotsService,
    private readonly tourneesService:  TourneesService,
  ) {}

  // ── Lancer le pipeline AHP → TOPSIS → VRP ────────────────────────────────

  async runPipeline(dto: RunPipelineDto): Promise<PipelineResultEntity> {
    const start = Date.now();

    // ── Créer l'entrée de résultat en état "running" ──────────────────────
    const record = this.pipelineRepo.create({
      criseId:     dto.criseId,
      statut:      'running',
      inputParams: dto as unknown as Record<string, unknown>,
    });
    await this.pipelineRepo.save(record);

    try {
      // ── Récupérer la crise et ses sévérités ───────────────────────────────
      const crise = await this.crisesService.findOne(dto.criseId);

      if (crise.statut !== 'active') {
        throw new BadRequestException('Le pipeline ne peut être lancé que sur une crise active');
      }

      if (!crise.severitesParDouar?.length) {
        throw new BadRequestException('La crise n\'a aucun douar associé avec des scores de sévérité');
      }

      // ── Étape 1 : AHP ────────────────────────────────────────────────────
      this.logger.log(`[Pipeline ${record.id}] AHP...`);
      const ahpResult = this.ahpService.compute(dto.ahpMatrice);

      if (!ahpResult.coherent) {
        this.logger.warn(
          `[Pipeline ${record.id}] Matrice AHP incohérente (RC=${ahpResult.rc.toFixed(3)}). Poursuite quand même.`,
        );
      }

      // ── Étape 2 : TOPSIS ─────────────────────────────────────────────────
      this.logger.log(`[Pipeline ${record.id}] TOPSIS...`);
      const topsisResult = this.topsisService.compute(crise.severitesParDouar, ahpResult);

      // ── Étape 3 : VRP ────────────────────────────────────────────────────
      this.logger.log(`[Pipeline ${record.id}] VRP OR-Tools...`);

      // Récupérer les entrepôts concernés par les contraintes
      const entrepotIds = dto.contraintesVehicules.map((c) => c.entrepotId);
      const allEntrepots = await this.entrepotsService.findAll();
      const entrepots    = allEntrepots.filter((e) => entrepotIds.includes(e.id));

      if (entrepots.length === 0) {
        throw new BadRequestException('Aucun entrepôt valide trouvé pour les contraintes VRP');
      }

      // Construire la map douarId → coordonnées
      const douarsMap = new Map<string, { latitude: number; longitude: number; population: number }>();
      crise.severitesParDouar.forEach((ds) => {
        douarsMap.set(ds.douar.id, {
          latitude:   ds.douar.latitude,
          longitude:  ds.douar.longitude,
          population: ds.douar.population,
        });
      });

      const vrpTournees = await this.vrpService.solve(
        topsisResult.classement,
        entrepots,
        dto.contraintesVehicules,
        dto.lambdas,
        dto.douarsExclus  ?? [],
        dto.routesBloquees ?? [],
        douarsMap,
      );

      // ── Persister les résultats du pipeline ──────────────────────────────
      const executionMs = Date.now() - start;
      record.statut      = 'completed';
      record.ahpResult   = ahpResult   as unknown as Record<string, unknown>;
      record.topsisResult = topsisResult as unknown as Record<string, unknown>;
      record.vrpTournees = vrpTournees  as unknown as Record<string, unknown>[];
      record.executionMs = executionMs;
      record.completedAt = new Date();
      await this.pipelineRepo.save(record);

      // ── Créer les tournées + étapes avec ressources calculées ────────────
      const entrepotsMap = new Map(entrepots.map((e) => [e.id, e]));
      const topsisScores = new Map(
        topsisResult.classement.map((r) => [r.douarId, r.score]),
      );
      await this.tourneesService.persistFromPipeline(
        record,
        vrpTournees,
        entrepotsMap,
        topsisScores,
      );

      this.logger.log(`[Pipeline ${record.id}] Terminé en ${executionMs}ms — tournées créées`);
      return record;

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      record.statut  = 'failed';
      record.erreur  = message;
      record.completedAt = new Date();
      await this.pipelineRepo.save(record);
      throw err;
    }
  }

  // ── Récupérer les résultats d'une crise ──────────────────────────────────

  findByCrise(criseId: string): Promise<PipelineResultEntity[]> {
    return this.pipelineRepo.find({
      where:  { criseId },
      order:  { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PipelineResultEntity> {
    const r = await this.pipelineRepo.findOneBy({ id });
    if (!r) throw new NotFoundException(`PipelineResult ${id} introuvable`);
    return r;
  }
}
