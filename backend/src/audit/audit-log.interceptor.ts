/**
 * AUDIT LOG INTERCEPTOR — Traçabilité Silencieuse des Écritures
 * =============================================================
 *
 * C'EST LE CŒUR TECHNIQUE DU SUJET MTSPC26.
 * ══════════════════════════════════════════
 *
 * PRINCIPE (à présenter au jury) :
 * ─────────────────────────────────
 * Un Interceptor NestJS "entoure" l'exécution d'une route comme un sandwich :
 *
 *   [Requête entrante]
 *         ↓
 *   ┌─────────────────────────────────┐
 *   │     AUDIT LOG INTERCEPTOR       │ ← Point d'entrée (avant le contrôleur)
 *   │  • Capture : méthode HTTP       │
 *   │  • Capture : corps de requête   │
 *   │  • Capture : user Keycloak      │
 *   │  • Capture : IP adresse         │
 *   └────────────┬────────────────────┘
 *                ↓
 *   [Exécution du Contrôleur NestJS]
 *   (ex: MissionsController.create())
 *                ↓
 *   ┌─────────────────────────────────┐
 *   │     AUDIT LOG INTERCEPTOR       │ ← Point de sortie (après le contrôleur)
 *   │  • Si succès (2xx) → INSERT     │
 *   │    dans audit_logs              │
 *   │  • Si erreur (4xx/5xx) → LOG    │
 *   │    quand même (tentatives !)    │
 *   └─────────────────────────────────┘
 *         ↓
 *   [Réponse envoyée au client]
 *
 * SÉCURITÉ :
 * ──────────
 * - Les données de requête (corps, user, IP) sont capturées avant l'exécution.
 * - L'écriture en audit_logs est INDÉPENDANTE du succès de l'opération métier.
 * - Même une tentative de suppression échouée est tracée.
 * - L'Interceptor ne lève JAMAIS d'erreur qui bloquerait la requête.
 *   Il est "silencieux" : s'il échoue, la requête continue normalement.
 *   (On ne veut pas qu'un bug d'audit bloque une livraison d'urgence !)
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditLog } from './entities/audit-log.entity';

/**
 * Méthodes HTTP qui déclenchent un audit.
 * GET et HEAD ne modifient pas les données → pas de trace nécessaire.
 */
const AUDITED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Routes à exclure de l'audit (internes ou sans impact sur les données métier).
 */
const EXCLUDED_PATHS = [
  '/api/v1/health',
  '/api/v1/auth/token',   // Le login lui-même n'est pas une écriture métier
];

/**
 * Table cible déduite du chemin de l'URL.
 * Ex: "/api/v1/missions/uuid123" → "missions_livraison"
 */
const PATH_TO_TABLE_MAP: Record<string, string> = {
  'missions': 'missions_livraison',
  'materiels': 'materiels',
  'stocks': 'stocks',
  'entrepots': 'entrepots',
  'distributeurs': 'distributeurs',
  'sync': 'missions_livraison', // POST /sync met à jour des missions
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const method = request.method.toUpperCase();

    // ── FILTRE 1 : Ne tracer que les opérations d'écriture ─────────────────
    if (!AUDITED_METHODS.includes(method)) {
      return next.handle();
    }

    // ── FILTRE 2 : Exclure les routes techniques ────────────────────────────
    if (EXCLUDED_PATHS.some((path) => request.path.startsWith(path))) {
      return next.handle();
    }

    // ── CAPTURE DES DONNÉES AVANT EXÉCUTION ────────────────────────────────

    /**
     * L'utilisateur est déjà injecté dans request.user par JwtAuthGuard.
     * Si request.user est null ici, c'est une route @Public() — rare pour
     * des routes d'écriture, mais on gère le cas.
     */
    const user = (request as any).user;

    /** Capturer le corps de la requête AVANT que le contrôleur le consomme */
    const requestBody = this.sanitizeBody(request.body);

    /** Extraire l'ID de la ressource depuis l'URL (ex: /missions/uuid123) */
    const recordId = this.extractRecordId(request.path, request.params as Record<string, string>);

    /** Déterminer la table cible depuis le chemin URL */
    const tableCible = this.inferTableFromPath(request.path);

    /** Mapper la méthode HTTP vers l'opération SQL */
    const operation = this.mapHttpMethodToOperation(method);

    /** Extraire l'IP (en tenant compte des proxies — important pour les déploiements cloud) */
    const ipAddress = this.extractIpAddress(request);

    /** User-Agent (pour distinguer app mobile / webapp / appel direct API) */
    const userAgent = request.headers['user-agent'] || null;

    // ── EXÉCUTION DU CONTRÔLEUR + CAPTURE DE LA RÉPONSE ────────────────────
    return next.handle().pipe(

      /**
       * tap() : s'exécute en cas de SUCCÈS (réponse 2xx).
       * On a accès ici au résultat retourné par le contrôleur.
       */
      tap((responseBody) => {
        // Extraire l'ID de la ressource créée (pour les POST, l'ID est dans la réponse)
        const finalRecordId = this.extractIdFromResponse(responseBody) || recordId;

        this.persistAuditLog({
          tableCible,
          operation,
          recordId: finalRecordId,
          valeursAvant: operation === 'INSERT' ? null : requestBody,
          // Pour INSERT → les nouvelles valeurs sont dans la réponse
          // Pour UPDATE → le corps de la requête contient les nouvelles valeurs
          // Pour DELETE → null (la ressource n'existe plus)
          valeursApres: operation === 'DELETE'
            ? null
            : (operation === 'INSERT' ? this.sanitizeBody(responseBody) : requestBody),
          acteurUserId: user?.userId || 'anonymous',
          acteurRole: user?.primaryRole || 'UNKNOWN',
          acteurEmail: user?.email || null,
          entrepotId: this.extractEntrepotId(request, responseBody),
          ipAddress,
          userAgent,
        });
      }),

      /**
       * catchError() : s'exécute en cas d'ÉCHEC (erreur 4xx/5xx).
       * On trace quand même la tentative — une tentative de suppression
       * non-autorisée d'un stock doit apparaître dans les logs !
       */
      catchError((error) => {
        this.persistAuditLog({
          tableCible,
          operation,
          recordId,
          // On préfixe avec "[ECHEC]" pour distinguer dans le dashboard Super-Admin
          valeursAvant: null,
          valeursApres: {
            _echec: true,
            _erreur: error.message,
            _statusCode: error.status || 500,
            _requete: requestBody,
          },
          acteurUserId: user?.userId || 'anonymous',
          acteurRole: user?.primaryRole || 'UNKNOWN',
          acteurEmail: user?.email || null,
          entrepotId: null,
          ipAddress,
          userAgent,
        });
        // Re-propager l'erreur pour que le client reçoive bien le bon code HTTP
        throw error;
      }),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MÉTHODES PRIVÉES — Utilitaires internes de l'Interceptor
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Persistance en base de données.
   * Cette méthode est ASYNCHRONE mais on ne l'await pas dans intercept()
   * pour ne pas bloquer la réponse HTTP. L'audit est "fire-and-forget".
   * En cas d'erreur d'écriture → on log en console mais on ne plante PAS.
   */
  private persistAuditLog(data: Partial<AuditLog>): void {
    this.auditLogRepository
      .save(this.auditLogRepository.create(data))
      .then(() => {
        this.logger.debug(
          `[AUDIT] ${data.operation} sur ${data.tableCible} par ${data.acteurUserId}`,
        );
      })
      .catch((err) => {
        // Écrire dans les logs du serveur sans crasher l'application
        this.logger.error(
          `[AUDIT] Échec d'enregistrement dans audit_logs : ${err.message}`,
          err.stack,
        );
      });
  }

  /**
   * Mapper la méthode HTTP vers l'opération SQL équivalente.
   * POST  → INSERT (création d'une nouvelle ressource)
   * PUT   → UPDATE (remplacement complet)
   * PATCH → UPDATE (modification partielle)
   * DELETE → DELETE (suppression)
   */
  private mapHttpMethodToOperation(
    method: string,
  ): 'INSERT' | 'UPDATE' | 'DELETE' {
    const map: Record<string, 'INSERT' | 'UPDATE' | 'DELETE'> = {
      POST: 'INSERT',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };
    return map[method] || 'UPDATE';
  }

  /**
   * Déduire la table PostgreSQL cible depuis le chemin URL.
   * Ex: "/api/v1/missions/abc123" → "missions_livraison"
   *     "/api/v1/materiels"       → "materiels"
   */
  private inferTableFromPath(path: string): string {
    const segments = path.split('/').filter(Boolean);
    // Le segment significatif est généralement à l'index 2 (après "api" et "v1")
    for (const segment of segments) {
      if (PATH_TO_TABLE_MAP[segment]) {
        return PATH_TO_TABLE_MAP[segment];
      }
    }
    return 'unknown';
  }

  /**
   * Extraire l'ID de la ressource depuis le paramètre URL ou le corps.
   * Ex: DELETE /missions/f47ac10b → "f47ac10b"
   */
  private extractRecordId(
    path: string,
    params: Record<string, string>,
  ): string {
    // Priorité aux paramètres de route NestJS (:id)
    if (params?.id) return params.id;

    // Fallback : dernier segment de l'URL qui ressemble à un UUID
    const segments = path.split('/');
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const lastSegment = segments[segments.length - 1];
    return uuidRegex.test(lastSegment) ? lastSegment : 'N/A';
  }

  /**
   * Extraire l'ID depuis la réponse du contrôleur (utile pour les POST).
   * Quand on crée une mission, l'ID est généré par PostgreSQL et retourné
   * dans la réponse — on veut le stocker dans audit_logs.
   */
  private extractIdFromResponse(responseBody: any): string | null {
    if (!responseBody) return null;
    return responseBody?.id || responseBody?.data?.id || null;
  }

  /**
   * Extraire l'ID de l'entrepôt depuis la requête ou la réponse.
   * Permet au Super-Admin de filtrer les logs par entrepôt provincial.
   */
  private extractEntrepotId(request: Request, responseBody: any): string | null {
    // Depuis les paramètres de route
    const params = (request as any).params;
    if (params?.entrepotId) return params.entrepotId;

    // Depuis le corps de la requête
    const body = request.body;
    if (body?.entrepotId) return body.entrepotId;
    if (body?.entrepot_source_id) return body.entrepot_source_id;

    // Depuis la réponse du contrôleur
    if (responseBody?.entrepotId) return responseBody.entrepotId;

    return null;
  }

  /**
   * Extraire l'adresse IP réelle du client.
   * En production derrière un reverse proxy (Nginx, Cloudflare),
   * l'IP réelle est dans l'en-tête X-Forwarded-For.
   */
  private extractIpAddress(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      // X-Forwarded-For peut contenir plusieurs IPs : "client, proxy1, proxy2"
      return (forwarded as string).split(',')[0].trim();
    }
    return request.socket?.remoteAddress || request.ip || 'unknown';
  }

  /**
   * Nettoyer le corps de la requête pour le stockage JSON.
   * SÉCURITÉ IMPORTANTE : supprimer les champs sensibles avant de logger.
   * On ne veut PAS stocker les mots de passe ou tokens dans les logs.
   */
  private sanitizeBody(body: any): Record<string, any> | null {
    if (!body || typeof body !== 'object') return null;

    // Liste des champs à JAMAIS logger
    const SENSITIVE_FIELDS = [
      'password', 'mot_de_passe', 'token', 'access_token',
      'refresh_token', 'secret', 'private_key', 'apiKey',
    ];

    const sanitized = { ...body };

    for (const field of SENSITIVE_FIELDS) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
