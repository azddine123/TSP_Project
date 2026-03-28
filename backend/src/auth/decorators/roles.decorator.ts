/**
 * DÉCORATEURS PERSONNALISÉS
 * ========================
 * Ces décorateurs sont utilisés sur les routes pour déclarer :
 * 1. @Roles('SUPER_ADMIN') → quels rôles ont accès à cette route
 * 2. @CurrentUser()        → pour injecter l'utilisateur décodé du JWT
 * 3. @Public()             → pour marquer une route comme publique (ex: /health)
 */
import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

// ── Clé utilisée pour stocker les métadonnées de rôles ────────────────────────
export const ROLES_KEY = 'roles';
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Roles('SUPER_ADMIN', 'ADMIN_ENTREPOT')
 *
 * Usage sur un contrôleur ou une route :
 *   @Get('audit-logs')
 *   @Roles('SUPER_ADMIN')
 *   getAuditLogs() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * @Public()
 *
 * Marque une route comme accessible sans authentification JWT.
 * Le JwtAuthGuard vérifie cette métadonnée avant de valider le token.
 *
 * Usage :
 *   @Get('health')
 *   @Public()
 *   healthCheck() { return { status: 'ok' }; }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * @CurrentUser()
 *
 * Injecte l'objet utilisateur décodé par JwtStrategy.validate()
 * directement dans le paramètre d'une méthode de contrôleur.
 *
 * Usage :
 *   @Post('missions')
 *   createMission(@CurrentUser() user: AuthUser, @Body() dto: CreateMissionDto) {
 *     console.log(user.userId);    // UUID Keycloak
 *     console.log(user.roles);     // ['ADMIN_ENTREPOT']
 *   }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

/**
 * Type TypeScript de l'utilisateur injecté par @CurrentUser()
 * (correspond à ce que retourne JwtStrategy.validate())
 */
export interface AuthUser {
  userId: string;
  username: string;
  email?: string;
  roles: string[];
  primaryRole: string;
}
