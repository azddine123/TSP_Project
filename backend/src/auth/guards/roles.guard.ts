/**
 * ROLES GUARD — Gardien d'Autorisation (RBAC)
 * ============================================
 *
 * Ce guard s'exécute APRÈS JwtAuthGuard (l'utilisateur est déjà authentifié).
 * Il vérifie que l'utilisateur possède le(s) rôle(s) requis pour accéder
 * à la ressource demandée.
 *
 * PRINCIPE DE SÉPARATION DES POUVOIRS (expliqué au jury) :
 * ─────────────────────────────────────────────────────────
 * - SUPER_ADMIN peut voir les Audit Logs     → mais PAS créer de missions
 * - ADMIN_ENTREPOT peut créer des missions   → mais PAS lire les Audit Logs
 * - DISTRIBUTEUR peut valider des livraisons → mais PAS accéder au stock
 *
 * Exemple de protection d'une route :
 *   @Get('audit-logs')
 *   @Roles('SUPER_ADMIN')           ← Seul le Super-Admin peut accéder
 *   getAuditLogs() { ... }
 *
 *   @Post('materiels')
 *   @Roles('ADMIN_ENTREPOT')        ← Seul l'Admin Entrepôt peut créer
 *   createMateriel() { ... }
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lire les rôles requis définis par @Roles() sur la route
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [
        context.getHandler(), // Priorité : métadonnée sur la méthode
        context.getClass(),   // Fallback : métadonnée sur le contrôleur
      ],
    );

    // Si aucun @Roles() n'est défini sur la route → accès libre pour tout utilisateur authentifié
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Récupérer l'utilisateur injecté par JwtAuthGuard (via JwtStrategy.validate)
    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.roles) {
      throw new ForbiddenException(
        'Impossible de déterminer vos droits d\'accès.',
      );
    }

    // Vérifier si l'utilisateur possède AU MOINS UN des rôles requis
    const hasRole = requiredRoles.some((requiredRole) =>
      user.roles.includes(requiredRole),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Accès refusé. Rôle(s) requis : [${requiredRoles.join(', ')}]. ` +
        `Vos rôles : [${user.roles.join(', ')}].`,
      );
    }

    return true;
  }
}
