/**
 * JWT AUTH GUARD — Gardien d'Authentification
 * ============================================
 *
 * Ce guard est appliqué GLOBALEMENT sur toutes les routes.
 * Il délègue la vérification du JWT à JwtStrategy (passport-jwt + jwks-rsa).
 *
 * LOGIQUE :
 * ─────────
 * 1. Si la route est marquée @Public() → laisser passer sans vérification.
 * 2. Sinon → vérifier le JWT. Si invalide → retourner 401 Unauthorized.
 *
 * Pour le jury : c'est la "première ligne de défense" de l'API.
 * Aucune requête sans JWT valide signé par Keycloak ne passe cette porte.
 */
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/roles.decorator';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Vérifier si la route est marquée @Public()
    // Reflector permet de lire les métadonnées définies par SetMetadata
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),   // Métadonnée sur la méthode
      context.getClass(),     // Métadonnée sur le contrôleur
    ]);

    // Route publique → pas de vérification JWT
    if (isPublic) {
      return true;
    }

    // Route protégée → déléguer à AuthGuard('jwt') qui appelle JwtStrategy
    return super.canActivate(context);
  }

  /**
   * Personnaliser le message d'erreur en cas d'échec Passport.
   * Par défaut, Passport retourne une erreur générique.
   */
  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
  ): TUser {
    if (err || !user) {
      // Analyser le type d'erreur pour un message clair
      let message = 'Token JWT manquant ou invalide.';

      if (info?.name === 'TokenExpiredError') {
        message = 'Token JWT expiré. Veuillez vous reconnecter via Keycloak.';
      } else if (info?.name === 'JsonWebTokenError') {
        message = 'Token JWT malformé ou signature invalide.';
      } else if (info?.name === 'NotBeforeError') {
        message = 'Token JWT pas encore valide.';
      }

      throw new UnauthorizedException(message);
    }
    return user;
  }
}
