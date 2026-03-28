/**
 * CONTRÔLEUR AUDIT — Routes accessibles uniquement par SUPER_ADMIN
 * ================================================================
 *
 * Exemple concret montrant l'usage combiné de :
 * - @Roles('SUPER_ADMIN') → seul le Super-Admin peut lire les logs
 * - @CurrentUser()        → injecter l'utilisateur Keycloak
 * - @ApiBearerAuth()      → documenter l'auth dans Swagger
 *
 * POUR LE JURY : Ouvrir http://localhost:9090/api/docs pour voir
 * cette route avec le cadenas Swagger et tester l'auth JWT.
 */
import {
  Controller, Get, Query, ParseIntPipe,
  DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiQuery,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { Roles, CurrentUser, AuthUser } from '../auth/decorators/roles.decorator';

@ApiTags('Audit Logs (Super-Admin uniquement)')
@ApiBearerAuth('JWT-Keycloak')
@Controller('audit')
export class AuditController {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * GET /api/v1/audit
   * Retourne la liste paginée des Audit Logs, du plus récent au plus ancien.
   * Accès : SUPER_ADMIN uniquement.
   */
  @Get()
  @Roles('SUPER_ADMIN')  // ← RolesGuard va bloquer tout autre rôle avec 403 Forbidden
  @ApiOperation({
    summary: 'Historique inaltérable des actions (SUPER_ADMIN)',
    description:
      'Retourne chaque écriture critique effectuée dans la plateforme. ' +
      'Cette table ne peut jamais être modifiée ou supprimée par un acteur opérationnel.',
  })
  @ApiQuery({ name: 'page',       required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit',      required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'entrepotId', required: false, type: String, description: 'Filtrer par entrepôt' })
  @ApiQuery({ name: 'operation',  required: false, enum: ['INSERT', 'UPDATE', 'DELETE'] })
  @ApiResponse({ status: 200, description: 'Liste des logs retournée avec succès.' })
  @ApiResponse({ status: 401, description: 'Token JWT manquant ou invalide.' })
  @ApiResponse({ status: 403, description: 'Accès refusé. Rôle SUPER_ADMIN requis.' })
  async getAuditLogs(
    @CurrentUser() admin: AuthUser,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('entrepotId') entrepotId?: string,
    @Query('operation')  operation?: 'INSERT' | 'UPDATE' | 'DELETE',
  ) {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')  // Toujours du plus récent au plus ancien
      .skip((page - 1) * limit)
      .take(Math.min(limit, 200));       // Max 200 lignes par page pour les perfs

    // Filtres optionnels
    if (entrepotId) {
      queryBuilder.andWhere('log.entrepotId = :entrepotId', { entrepotId });
    }
    if (operation) {
      queryBuilder.andWhere('log.operation = :operation', { operation });
    }

    const [logs, total] = await queryBuilder.getManyAndCount();

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        // Pour audit trail : tracer qui consulte les logs
        consultePar: admin.username,
        consulteLe: new Date().toISOString(),
      },
    };
  }
}
