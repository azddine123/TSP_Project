import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tournee }        from './entities/tournee.entity';
import { TourneeEtape, RessourcesDouar }   from './entities/tournee-etape.entity';
import { EvenementsService } from '../evenements/evenements.service';
import { EvenementType, EvenementSeverite } from '../evenements/dto/create-evenement.dto';
import { AssignerTourneeDto }     from './dto/assigner-tournee.dto';
import { UpdateEtapeStatutDto }   from './dto/update-etape-statut.dto';
import { PipelineResultEntity }   from '../algorithmes/entities/pipeline-result.entity';
import { Entrepot }       from '../entrepots/entities/entrepot.entity';
import { VrpTournee }     from '../algorithmes/vrp.service';

// ── Ratios de ressources humanitaires par ménage / habitant ─────────────────
// Source : standards UNHCR / Sphère
const TENTES_PAR_MENAGE      = 0.6;   // 1 tente pour ~1.7 ménages
const COUVERTURES_PAR_MENAGE = 4;     // 4 couvertures par ménage
const VIVRES_PAR_MENAGE      = 2;     // 2 kits alimentaires par ménage
const KITS_MED_PAR_MENAGE    = 0.3;   // 1 kit médical pour ~3 ménages
const EAU_PAR_HABITANT       = 5;     // 5 litres/jour par habitant
const TAILLE_MENAGE_MOYENNE  = 5.5;   // taille moyenne d'un ménage dans la région

function calculerRessources(population: number): RessourcesDouar {
  const menages = Math.ceil(population / TAILLE_MENAGE_MOYENNE);
  return {
    tentes:      Math.floor(menages * TENTES_PAR_MENAGE),
    couvertures: Math.ceil(menages * COUVERTURES_PAR_MENAGE),
    vivres:      Math.ceil(menages * VIVRES_PAR_MENAGE),
    kits_med:    Math.floor(menages * KITS_MED_PAR_MENAGE),
    eau_litres:  population * EAU_PAR_HABITANT,
  };
}

function addRessources(a: RessourcesDouar, b: RessourcesDouar): RessourcesDouar {
  return {
    tentes:      a.tentes      + b.tentes,
    couvertures: a.couvertures + b.couvertures,
    vivres:      a.vivres      + b.vivres,
    kits_med:    a.kits_med    + b.kits_med,
    eau_litres:  a.eau_litres  + b.eau_litres,
  };
}

@Injectable()
export class TourneesService {
  constructor(
    @InjectRepository(Tournee)
    private readonly tourneeRepo: Repository<Tournee>,
    @InjectRepository(TourneeEtape)
    private readonly etapeRepo: Repository<TourneeEtape>,
    private readonly dataSource: DataSource,
    private readonly evenementsService: EvenementsService,
  ) {}

  // ── Persister les tournées VRP issues du pipeline ─────────────────────────

  async persistFromPipeline(
    pipeline: PipelineResultEntity,
    vrpTournees: VrpTournee[],
    entrepotsMap: Map<string, Entrepot>,
    /** Carte douarId → scoreTopsis pour enrichir les étapes */
    topsisScores: Map<string, number>,
  ): Promise<Tournee[]> {
    return this.dataSource.transaction(async (em) => {
      const saved: Tournee[] = [];

      for (const vt of vrpTournees) {
        const entrepot = entrepotsMap.get(vt.entrepotId);
        if (!entrepot) continue;

        // ── Calculer les ressources totales de la tournée ────────────────
        const ressourcesZero: RessourcesDouar = { tentes: 0, couvertures: 0, vivres: 0, kits_med: 0, eau_litres: 0 };
        const ressourcesTotales = vt.etapes.reduce((acc, e) => {
          const res = calculerRessources(e.population ?? 0);
          return addRessources(acc, res);
        }, ressourcesZero);

        const tournee = em.create(Tournee, {
          criseId:          pipeline.criseId,
          pipelineId:       pipeline.id,
          entrepotId:       vt.entrepotId,
          distributeurId:   null,
          statut:           'planifiee',
          distanceTotale:   vt.distanceTotale,
          tempsEstime:      vt.tempsEstime,
          ressourcesTotales,
        });
        const savedTournee = await em.save(tournee);

        // ── Créer les étapes avec ressources + coordonnées ────────────────
        const etapes = vt.etapes.map((e) => {
          const pop      = e.population ?? 0;
          const menages  = Math.ceil(pop / TAILLE_MENAGE_MOYENNE);
          const ressources = calculerRessources(pop);
          const scoreTopsis = topsisScores.get(e.douarId) ?? null;

          return em.create(TourneeEtape, {
            tourneeId:    savedTournee.id,
            douarId:      e.douarId,
            ordre:        e.ordre,
            statut:       'en_attente',
            latitude:     e.latitude  ?? null,
            longitude:    e.longitude ?? null,
            population:   pop > 0 ? pop : null,
            menages:      pop > 0 ? menages : null,
            scoreTopsis,
            ressources:   pop > 0 ? ressources : null,
          });
        });
        await em.save(etapes);

        saved.push(savedTournee);
      }

      return saved;
    });
  }

  // ── Lister toutes les tournées (Super Admin) ─────────────────────────────

  findAll(): Promise<Tournee[]> {
    return this.tourneeRepo.find({
      relations: { etapes: { douar: true }, entrepot: true, distributeur: true },
      order:     { createdAt: 'DESC' },
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

  // ── Lister les tournées d'un distributeur (Distributeur connecté) ────────────
  // Filtre par keycloakUserId via la relation distributeur.keycloakUserId.
  // Exclut les tournées annulées.

  findForDistributeur(keycloakUserId: string): Promise<Tournee[]> {
    return this.tourneeRepo
      .createQueryBuilder('t')
      .innerJoin('t.distributeur', 'd', 'd.keycloak_user_id = :uid', { uid: keycloakUserId })
      .leftJoinAndSelect('t.etapes', 'etape')
      .leftJoinAndSelect('etape.douar', 'douar')
      .leftJoinAndSelect('t.entrepot', 'entrepot')
      .leftJoinAndSelect('t.distributeur', 'distributeur')
      .where("t.statut NOT IN (:...excluded)", { excluded: ['annulee'] })
      .orderBy('t.created_at', 'DESC')
      .addOrderBy('etape.ordre', 'ASC')
      .getMany();
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

  // ── Signaler une route bloquée ─────────────────────────────────────────────
  // Le distributeur indique qu'une route vers un douar est bloquée.
  // → Marque l'étape comme 'echec'
  // → Crée un événement ROUTE_BLOQUEE visible par le Super Admin

  async signalerRouteBloquee(
    tourneeId:   string,
    etapeId:     string,
    commentaire: string,
    acteurId:    string | null,
    acteurNom:   string | null,
  ): Promise<TourneeEtape> {
    const tournee = await this.findOne(tourneeId);
    const etape   = tournee.etapes.find((e) => e.id === etapeId);
    if (!etape) throw new NotFoundException(`Étape ${etapeId} introuvable`);

    if (etape.statut === 'livree') {
      throw new BadRequestException('Impossible de signaler une étape déjà livrée comme bloquée');
    }

    // Marquer l'étape comme échec
    etape.statut = 'echec';
    await this.etapeRepo.save(etape);

    // Créer l'événement ROUTE_BLOQUEE
    await this.evenementsService.create(
      {
        criseId:    tournee.criseId,
        type:       EvenementType.ROUTE_BLOQUEE,
        severite:   EvenementSeverite.CRITICAL,
        titre:      `Route bloquée — ${etape.douar?.nom ?? etapeId}`,
        description: commentaire || `La route vers le douar ${etape.douar?.nom ?? etapeId} est bloquée. Recalcul VRP nécessaire.`,
        tourneeId,
        douarId:    etape.douarId,
      },
      acteurId,
      acteurNom,
    );

    return etape;
  }
}
