/**
 * Module racine de l'application NestJS.
 * Orchestre tous les sous-modules du projet.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule }      from './database/database.module';
import { AuthModule }          from './auth/auth.module';
import { AuditModule }         from './audit/audit.module';
import { AuditLogInterceptor } from './audit/audit-log.interceptor';
import { EntrepotsModule }     from './entrepots/entrepots.module';
import { MaterielsModule }     from './materiels/materiels.module';
import { StocksModule }        from './stocks/stocks.module';
import { DistributeursModule } from './distributeurs/distributeurs.module';
import { MissionsModule }      from './missions/missions.module';
import { HealthModule }        from './health/health.module';
import { DouarsModule }        from './douars/douars.module';
import { CrisesModule }        from './crises/crises.module';
import { AlgorithmesModule }   from './algorithmes/algorithmes.module';
import { TourneesModule }      from './tournees/tournees.module';
import { EvenementsModule }    from './evenements/evenements.module';

@Module({
  imports: [
    // ── Variables d'environnement (.env) ────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal:    true,
      envFilePath: '.env',
    }),

    // ── Base de données PostgreSQL ───────────────────────────────────────────
    DatabaseModule,

    // ── Authentification Keycloak ────────────────────────────────────────────
    AuthModule,

    // ── Module Audit (table immuable) ────────────────────────────────────────
    AuditModule,

    // ── Modules métier ───────────────────────────────────────────────────────
    EntrepotsModule,     // GET /entrepots
    MaterielsModule,     // GET /materiels
    StocksModule,        // GET /stocks
    DistributeursModule, // GET /distributeurs
    MissionsModule,      // GET|POST /missions, PATCH /missions/:id/statut, POST /sync
    HealthModule,        // GET /health (public)
    DouarsModule,        // GET /douars
    CrisesModule,        // GET|POST /crises, PATCH /crises/:id/statut
    AlgorithmesModule,   // POST /algorithmes/pipeline, GET /algorithmes/pipeline/:id
    TourneesModule,      // GET|PATCH /tournees
    EvenementsModule,    // GET|POST /evenements
  ],
  providers: [
    /**
     * Enregistrement GLOBAL de l'Audit Log Interceptor.
     * S'applique automatiquement à TOUTES les routes POST/PUT/PATCH/DELETE.
     * Aucun @UseInterceptors() nécessaire sur les contrôleurs — "zero-touch auditing".
     */
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
