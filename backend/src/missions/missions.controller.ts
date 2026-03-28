import {
  Controller, Get, Post, Patch,
  Body, Param, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { MissionsService }    from './missions.service';
import { CreateMissionDto }   from './dto/create-mission.dto';
import { UpdateStatutDto }    from './dto/update-statut.dto';
import { SyncSubmissionDto }  from './dto/sync-submission.dto';
import { Roles, CurrentUser, AuthUser } from '../auth/decorators/roles.decorator';

@ApiTags('Missions')
@ApiBearerAuth('JWT-Keycloak')
@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  // ── GET /missions ──────────────────────────────────────────────────────────

  /**
   * Comportement selon le rôle :
   * - ADMIN_ENTREPOT  → toutes les missions (vue DataGrid Web)
   * - DISTRIBUTEUR    → ses missions enrichies (vue mobile avec tentes/eau/medicaments)
   */
  @Get()
  @Roles('ADMIN_ENTREPOT', 'DISTRIBUTEUR')
  @ApiOperation({
    summary: 'Liste des missions (comportement selon rôle)',
    description:
      '**ADMIN_ENTREPOT** : toutes les missions avec statut et distributeur assigné.\n\n' +
      '**DISTRIBUTEUR** : uniquement ses missions, enrichies pour l\'app mobile ' +
      '(entrepotNom, items[], tentes/eau/medicaments calculés).',
  })
  @ApiResponse({ status: 200, description: 'Missions retournées.' })
  findAll(@CurrentUser() user: AuthUser) {
    if (user.roles.includes('DISTRIBUTEUR')) {
      return this.missionsService.findForDistributeur(user.userId);
    }
    return this.missionsService.findAll();
  }

  // ── GET /missions/:id ──────────────────────────────────────────────────────

  /**
   * Détail complet d'une mission — consommé par MissionDetailScreen.
   * Un DISTRIBUTEUR ne peut voir que SES missions.
   */
  @Get(':id')
  @Roles('ADMIN_ENTREPOT', 'DISTRIBUTEUR')
  @ApiOperation({ summary: 'Détail d\'une mission avec inventaire complet' })
  @ApiParam({ name: 'id', description: 'UUID de la mission' })
  @ApiResponse({ status: 200, description: 'Mission retournée.' })
  @ApiResponse({ status: 403, description: 'Accès refusé — mission d\'un autre distributeur.' })
  @ApiResponse({ status: 404, description: 'Mission introuvable.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const isDistributeur = user.roles.includes('DISTRIBUTEUR');
    return this.missionsService.findById(id, user.userId, isDistributeur);
  }

  // ── POST /missions ─────────────────────────────────────────────────────────

  /**
   * Créer une mission de livraison.
   * L'AuditLogInterceptor capture automatiquement cette opération dans audit_logs.
   *
   * Effets de bord :
   * 1. Décrémente le stock de l'entrepôt source pour chaque item
   * 2. Passe le distributeur assigné à statut 'en_mission'
   */
  @Post()
  @Roles('ADMIN_ENTREPOT')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une mission de livraison (ADMIN_ENTREPOT)' })
  @ApiResponse({ status: 201, description: 'Mission créée. Stock décrémenté. Audit enregistré.' })
  @ApiResponse({ status: 400, description: 'Stock insuffisant ou données invalides.' })
  create(
    @Body() dto: CreateMissionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.missionsService.create(dto, user.userId);
  }

  // ── PATCH /missions/:id/statut ─────────────────────────────────────────────

  /**
   * Mettre à jour le statut d'une mission (CAS ONLINE).
   * Utilisé par missionService.updateStatut() de l'app mobile quand connecté.
   *
   * Transitions autorisées :
   *   pending → in_progress → completed | annulee
   */
  @Patch(':id/statut')
  @Roles('DISTRIBUTEUR')
  @ApiOperation({ summary: 'Mettre à jour le statut d\'une mission (DISTRIBUTEUR — online)' })
  @ApiParam({ name: 'id', description: 'UUID de la mission' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour. Audit enregistré.' })
  @ApiResponse({ status: 400, description: 'Mission déjà terminée.' })
  @ApiResponse({ status: 403, description: 'Mission non assignée à ce distributeur.' })
  updateStatut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatutDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.missionsService.updateStatut(id, dto, user.userId);
  }
}
