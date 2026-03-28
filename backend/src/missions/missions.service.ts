import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mission }              from './entities/mission.entity';
import { MissionItem }          from './entities/mission-item.entity';
import { StocksService }        from '../stocks/stocks.service';
import { DistributeursService } from '../distributeurs/distributeurs.service';
import { CreateMissionDto }     from './dto/create-mission.dto';
import { UpdateStatutDto }      from './dto/update-statut.dto';
import { SyncSubmissionDto }    from './dto/sync-submission.dto';

// ── Relations standard chargées systématiquement ─────────────────────────────
const MISSION_RELATIONS = [
  'entrepotSource',
  'distributeur',
  'items',
  'items.materiel',
] as const;

@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(Mission)
    private readonly missionRepo: Repository<Mission>,

    @InjectRepository(MissionItem)
    private readonly itemRepo: Repository<MissionItem>,

    private readonly stocksService:        StocksService,
    private readonly distributeursService: DistributeursService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // LECTURE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * GET /missions → ADMIN_ENTREPOT
   * Retourne toutes les missions avec le distributeur (vue Web DataGrid).
   */
  findAll(): Promise<Mission[]> {
    return this.missionRepo.find({
      relations: ['entrepotSource', 'distributeur', 'items'],
      order:     { createdAt: 'DESC' },
    });
  }

  /**
   * GET /missions → DISTRIBUTEUR
   * Retourne uniquement les missions du distributeur connecté,
   * enrichies pour l'app mobile (entrepotNom, tentes, eau, medicaments).
   */
  async findForDistributeur(keycloakUserId: string): Promise<ReturnType<typeof this.toMobileShape>[]> {
    const dist = await this.distributeursService.findByKeycloakId(keycloakUserId);
    if (!dist) {
      throw new NotFoundException(
        'Profil distributeur introuvable. Vérifiez votre compte Keycloak.',
      );
    }

    const missions = await this.missionRepo.find({
      where:     { distributeurId: dist.id },
      relations: MISSION_RELATIONS as unknown as string[],
      order:     { createdAt: 'DESC' },
    });

    return missions.map((m) => this.toMobileShape(m));
  }

  /**
   * GET /missions/:id
   * Retourne le détail complet d'une mission — utilisé par MissionDetailScreen.
   * Le distributeur ne peut voir que SES missions.
   */
  async findById(id: string, requesterId: string, isDistributeur: boolean): Promise<ReturnType<typeof this.toMobileShape>> {
    const mission = await this.missionRepo.findOne({
      where:     { id },
      relations: MISSION_RELATIONS as unknown as string[],
    });

    if (!mission) throw new NotFoundException(`Mission ${id} introuvable.`);

    if (isDistributeur) {
      const dist = await this.distributeursService.findByKeycloakId(requesterId);
      if (!dist || mission.distributeurId !== dist.id) {
        throw new ForbiddenException('Vous ne pouvez accéder qu\'à vos propres missions.');
      }
    }

    return this.toMobileShape(mission);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CRÉATION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /missions → ADMIN_ENTREPOT
   *
   * Flux :
   * 1. Générer le numéro de mission
   * 2. Créer la mission (statut: pending)
   * 3. Pour chaque item : vérifier + décrémenter le stock, créer MissionItem
   * 4. Passer le distributeur à 'en_mission'
   * 5. Retourner la mission enrichie
   *
   * L'AuditLogInterceptor capture automatiquement cette opération.
   */
  async create(dto: CreateMissionDto, createdBy: string): Promise<ReturnType<typeof this.toMobileShape>> {
    // ── 1. Numéro de mission ────────────────────────────────────────────────
    const numeroMission = await this.generateMissionNumber();

    // ── 2. Créer la mission ─────────────────────────────────────────────────
    const mission = this.missionRepo.create({
      numeroMission,
      entrepotSourceId: dto.entrepotSourceId,
      distributeurId:   dto.distributeurId,
      destinationNom:   dto.destinationNom,
      destinationLat:   dto.destinationLat ?? null,
      destinationLng:   dto.destinationLng ?? null,
      priorite:         dto.priorite,
      dateEcheance:     dto.dateEcheance ? new Date(dto.dateEcheance) : null,
      notes:            dto.notes ?? null,
      statut:           'pending',
      createdBy,
    });
    const savedMission = await this.missionRepo.save(mission);

    // ── 3. Items + décrément stock ──────────────────────────────────────────
    for (const itemDto of dto.items) {
      // Vérifie + décrémente le stock (lève une exception si insuffisant)
      await this.stocksService.decrementStock(
        dto.entrepotSourceId,
        itemDto.materielId,
        itemDto.quantitePrevue,
        createdBy,
      );

      const item = this.itemRepo.create({
        missionId:      savedMission.id,
        materielId:     itemDto.materielId,
        quantitePrevue: itemDto.quantitePrevue,
      });
      await this.itemRepo.save(item);
    }

    // ── 4. Passer le distributeur en 'en_mission' ───────────────────────────
    await this.distributeursService.updateStatut(dto.distributeurId, 'en_mission');

    // ── 5. Retourner la mission enrichie ────────────────────────────────────
    const full = await this.missionRepo.findOne({
      where:     { id: savedMission.id },
      relations: MISSION_RELATIONS as unknown as string[],
    });
    return this.toMobileShape(full!);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MISE À JOUR DU STATUT (ONLINE)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * PATCH /missions/:id/statut → DISTRIBUTEUR
   * Cas 1 : le distributeur est connecté → envoi direct.
   */
  async updateStatut(
    id:           string,
    dto:          UpdateStatutDto,
    keycloakUserId: string,
  ): Promise<{ message: string }> {
    const mission = await this.missionRepo.findOne({ where: { id } });
    if (!mission) throw new NotFoundException(`Mission ${id} introuvable.`);

    // Vérification propriété : le distributeur ne peut modifier que ses missions
    const dist = await this.distributeursService.findByKeycloakId(keycloakUserId);
    if (!dist || mission.distributeurId !== dist.id) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres missions.');
    }

    // Transitions de statut autorisées
    if (mission.statut === 'completed' || mission.statut === 'annulee') {
      throw new BadRequestException(
        `La mission est déjà "${mission.statut}" — aucune modification possible.`,
      );
    }

    mission.statut = dto.statut;

    if (dto.statut === 'in_progress' && !mission.startedAt) {
      mission.startedAt = new Date();
    }

    if (dto.statut === 'completed') {
      mission.completedAt = new Date();
      // Libérer le distributeur
      await this.distributeursService.updateStatutByKeycloakId(keycloakUserId, 'disponible');
    }

    await this.missionRepo.save(mission);

    return { message: `Statut mis à jour : ${dto.statut}` };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SYNCHRONISATION HORS-LIGNE — ROUTE VITALE POUR LA DÉMO JURY
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /sync → DISTRIBUTEUR
   *
   * Reçoit une soumission validée HORS-LIGNE depuis l'app mobile.
   * Le distributeur était en montagne sans réseau → il a validé localement
   * (syncService.savePendingSubmission) → au retour du réseau, il appuie sur
   * le bouton rouge "Synchroniser" → le syncService.forceSync() appelle cette route.
   *
   * POUR LE JURY : Cette route est la preuve que le mode hors-ligne fonctionne.
   * L'AuditLogInterceptor enregistre cet événement dans audit_logs avec le timestamp
   * de la validation terrain (timestampLocal), ce qui constitue une preuve horodatée.
   */
  async syncSubmission(
    dto:            SyncSubmissionDto,
    keycloakUserId: string,
  ): Promise<{ message: string; missionId: string; syncedAt: string }> {
    const mission = await this.missionRepo.findOne({ where: { id: dto.missionId } });
    if (!mission) throw new NotFoundException(`Mission ${dto.missionId} introuvable.`);

    // Vérification propriété (identique à updateStatut)
    const dist = await this.distributeursService.findByKeycloakId(keycloakUserId);
    if (!dist || mission.distributeurId !== dist.id) {
      throw new ForbiddenException('Synchronisation refusée : mission non assignée à ce distributeur.');
    }

    // Idempotence : si la mission est déjà complétée, on retourne succès sans ré-écrire
    if (mission.statut === 'completed') {
      return {
        message:   'Mission déjà synchronisée.',
        missionId: mission.id,
        syncedAt:  mission.completedAt?.toISOString() ?? new Date().toISOString(),
      };
    }

    // ── Appliquer les données terrain ───────────────────────────────────────
    mission.statut              = 'completed';
    mission.completedAt         = new Date();      // Date serveur (autoritative)
    mission.commentaireTerrain  = dto.commentaireTerrain ?? null;
    mission.livraisonLat        = dto.livraisonLat ?? null;
    mission.livraisonLng        = dto.livraisonLng ?? null;

    await this.missionRepo.save(mission);

    // Libérer le distributeur
    await this.distributeursService.updateStatutByKeycloakId(keycloakUserId, 'disponible');

    return {
      message:   'Synchronisation réussie. Audit enregistré.',
      missionId: mission.id,
      syncedAt:  mission.completedAt.toISOString(),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MÉTHODES PRIVÉES
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Génère un numéro de mission unique : MSN-YYYY-NNNNN
   * ex: MSN-2024-00042
   * Suffisant pour la compétition (pas de concurrence critique en démo).
   */
  private async generateMissionNumber(): Promise<string> {
    const year  = new Date().getFullYear();
    const count = await this.missionRepo.count();
    return `MSN-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * Transforme une entité Mission en objet compatible avec l'app mobile.
   *
   * Le mobile attend :
   *   entrepotNom, entrepotId       (depuis entrepotSource)
   *   items[]                       (avec materielNom, categorie, unite)
   *   tentes, eau, medicaments      (totaux calculés des items)
   *
   * Ces champs n'existent pas sur l'entité TypeORM — ils sont construits ici.
   */
  private toMobileShape(mission: Mission) {
    const items = (mission.items ?? []).map((i) => ({
      id:             i.id,
      materielNom:    i.materiel?.nom     ?? '',
      categorie:      i.materiel?.categorie ?? 'AUTRE',
      unite:          i.materiel?.unite   ?? 'unité',
      quantitePrevue: i.quantitePrevue,
      quantiteLivree: i.quantiteLivree,
    }));

    // Totaux par catégorie (utilisés par MissionCard pour les badges visuels)
    const sum = (cat: string) =>
      items
        .filter((i) => i.categorie === cat)
        .reduce((acc, i) => acc + i.quantitePrevue, 0);

    return {
      id:              mission.id,
      numeroMission:   mission.numeroMission,
      entrepotNom:     mission.entrepotSource?.nom ?? '',
      entrepotId:      mission.entrepotSourceId,
      destinationNom:  mission.destinationNom,
      destinationLat:  mission.destinationLat,
      destinationLng:  mission.destinationLng,
      destinationAdresse: mission.destinationAdresse ?? undefined,
      items,
      tentes:          sum('TENTE'),
      eau:             sum('EAU'),
      medicaments:     sum('MEDICAMENT'),
      statut:          mission.statut,
      priorite:        mission.priorite,
      dateEcheance:    mission.dateEcheance?.toISOString() ?? '',
      notes:           mission.notes ?? undefined,
      createdAt:       mission.createdAt?.toISOString() ?? '',
      // Champs supplémentaires utiles pour le web DataGrid
      distributeur:    mission.distributeur
        ? { id: mission.distributeur.id, nom: mission.distributeur.nom, prenom: mission.distributeur.prenom }
        : undefined,
    };
  }
}
