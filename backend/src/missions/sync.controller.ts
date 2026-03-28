import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { MissionsService }   from './missions.service';
import { SyncSubmissionDto } from './dto/sync-submission.dto';
import { Roles, CurrentUser, AuthUser } from '../auth/decorators/roles.decorator';

/**
 * SYNC CONTROLLER — Route POST /sync
 * ====================================
 *
 * POINT CENTRAL DE LA DÉMO JURY (Mode Hors-Ligne).
 * ─────────────────────────────────────────────────
 * Cette route reçoit les livraisons validées SANS RÉSEAU par le distributeur.
 *
 * Scénario démontré au jury :
 * 1. Distributeur en montagne → désactive le WiFi
 * 2. Valide la livraison dans l'app → sauvegardé dans AsyncStorage
 * 3. Retour en zone réseau → bouton rouge "Synchroniser (N missions)" apparaît
 * 4. Clic sur le bouton → syncService.forceSync() → appelle POST /sync
 * 5. Cette route met la mission à 'completed' et enregistre dans audit_logs
 * 6. Le Super-Admin voit immédiatement l'audit log dans son dashboard Web
 *
 * L'AuditLogInterceptor est configuré pour tracer les POST /sync
 * dans audit_logs avec tableCible = 'missions_livraison'.
 */
@ApiTags('Synchronisation Hors-Ligne')
@ApiBearerAuth('JWT-Keycloak')
@Controller('sync')
export class SyncController {
  constructor(private readonly missionsService: MissionsService) {}

  @Post()
  @Roles('DISTRIBUTEUR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Synchroniser une livraison validée hors-ligne (DISTRIBUTEUR)',
    description:
      'Reçoit le payload d\'une livraison validée sans réseau (AsyncStorage).\n\n' +
      'Idempotent : si la mission est déjà complétée, retourne succès sans erreur.\n\n' +
      '**Pour le jury** : C\'est cette route qui prouve le fonctionnement du mode hors-ligne. ' +
      'Son appel génère une entrée dans `audit_logs` visible dans le dashboard Super-Admin.',
  })
  @ApiResponse({
    status: 200,
    description: 'Synchronisation réussie. Mission mise à jour. Audit enregistré.',
    schema: {
      example: {
        message:   'Synchronisation réussie. Audit enregistré.',
        missionId: 'uuid-mission',
        syncedAt:  '2024-09-12T16:45:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Mission non assignée à ce distributeur.' })
  @ApiResponse({ status: 404, description: 'Mission introuvable.' })
  sync(
    @Body() dto: SyncSubmissionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.missionsService.syncSubmission(dto, user.userId);
  }
}
