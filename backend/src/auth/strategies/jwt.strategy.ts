/**
 * JWT STRATEGY — Vérification cryptographique du Token Keycloak
 * ============================================================
 *
 * COMMENT ÇA MARCHE (à expliquer au jury) :
 * ─────────────────────────────────────────
 * 1. Le mobile/web envoie un JWT dans le header : "Authorization: Bearer <token>"
 * 2. Cette stratégie intercepte le token AVANT que la requête atteigne le contrôleur.
 * 3. Elle contacte l'endpoint JWKS de Keycloak (/.well-known/openid-configuration)
 *    pour récupérer la CLÉ PUBLIQUE du serveur Keycloak.
 * 4. Elle vérifie cryptographiquement la SIGNATURE du JWT avec cette clé publique.
 *    → Si la signature est invalide (token falsifié) : rejet 401 automatique.
 *    → Si le token est expiré : rejet 401 automatique.
 * 5. Si tout est valide, le payload JWT décodé est injecté dans request.user.
 *
 * On n'a JAMAIS besoin de contacter Keycloak à chaque requête pour valider
 * le token — la cryptographie asymétrique (RS256) suffit. C'est la beauté
 * d'OAuth2/OpenID Connect.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

/**
 * Structure du payload décodé d'un JWT Keycloak.
 * Keycloak injecte les rôles dans `realm_access.roles`
 * (et dans `roles` si on a configuré le mapper — voir KEYCLOAK_SETUP.md)
 */
export interface KeycloakJwtPayload {
  // Identité de l'utilisateur
  sub: string;            // ID unique Keycloak (UUID) — c'est notre keycloak_user_id
  preferred_username: string;
  email?: string;
  name?: string;

  // Rôles du Realm (chemin standard Keycloak)
  realm_access?: {
    roles: string[];
  };

  // Rôles mis à plat par notre mapper (voir KEYCLOAK_SETUP.md Étape 7)
  roles?: string[];

  // Métadonnées OAuth2
  iss: string;            // Issuer (doit correspondre à KEYCLOAK_ISSUER)
  aud: string | string[]; // Audience
  exp: number;            // Date d'expiration (timestamp UNIX)
  iat: number;            // Date d'émission (issued at)
  jti: string;            // JWT ID (unique par token)
  azp?: string;           // Authorized party (client_id)
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: ConfigService) {
    super({
      /**
       * jwks-rsa va automatiquement :
       * - Appeler l'URL JWKS de Keycloak au premier démarrage
       * - Mettre en cache les clés publiques (jwksRequestsPerMinute : rate limiting)
       * - Faire pivoter les clés si Keycloak les renouvelle
       */
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: config.getOrThrow<string>('KEYCLOAK_JWKS_URI'),
      }),

      // Extraire le JWT depuis le header "Authorization: Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Vérifier que l'issuer correspond bien à notre realm Keycloak
      issuer: config.getOrThrow<string>('KEYCLOAK_ISSUER'),

      // Algorithme utilisé par Keycloak pour signer les tokens (RS256 = asymétrique)
      algorithms: ['RS256'],

      // Ne pas ignorer l'expiration !
      ignoreExpiration: false,
    });
  }

  /**
   * validate() est appelée par Passport APRÈS la vérification de la signature.
   * Ce qu'on retourne ici sera disponible via @CurrentUser() dans les contrôleurs.
   *
   * On normalise ici les rôles : Keycloak peut les mettre dans
   * `realm_access.roles` ou dans `roles` (si le mapper est configuré).
   */
  async validate(payload: KeycloakJwtPayload) {
    // Normaliser les rôles depuis les deux emplacements possibles
    const roles: string[] = [
      ...(payload.roles || []),
      ...(payload.realm_access?.roles || []),
    ];

    // Filtrer les rôles internes de Keycloak (ex: "offline_access", "uma_authorization")
    const appRoles = roles.filter((r) =>
      ['SUPER_ADMIN', 'ADMIN_ENTREPOT', 'DISTRIBUTEUR'].includes(r),
    );

    if (appRoles.length === 0) {
      throw new UnauthorizedException(
        'Aucun rôle applicatif valide trouvé dans le token.',
      );
    }

    // L'objet retourné est injecté dans request.user
    return {
      userId: payload.sub,                    // UUID Keycloak
      username: payload.preferred_username,
      email: payload.email,
      roles: appRoles,                        // ['ADMIN_ENTREPOT']
      // Rôle principal (le premier rôle applicatif)
      primaryRole: appRoles[0],
    };
  }
}
