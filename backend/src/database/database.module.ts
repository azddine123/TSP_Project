/**
 * Module de connexion PostgreSQL via TypeORM.
 * Entités chargées explicitement — garantie dev + production.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditLog }     from '../audit/entities/audit-log.entity';
import { Entrepot }     from '../entrepots/entities/entrepot.entity';
import { Materiel }     from '../materiels/entities/materiel.entity';
import { Stock }        from '../stocks/entities/stock.entity';
import { Distributeur } from '../distributeurs/entities/distributeur.entity';
import { Mission }      from '../missions/entities/mission.entity';
import { MissionItem }  from '../missions/entities/mission-item.entity';
import { Douar }               from '../douars/entities/douar.entity';
import { Crise }               from '../crises/entities/crise.entity';
import { DouarSeverite }       from '../crises/entities/douar-severite.entity';
import { PipelineResultEntity } from '../algorithmes/entities/pipeline-result.entity';
import { Tournee }             from '../tournees/entities/tournee.entity';
import { TourneeEtape }        from '../tournees/entities/tournee-etape.entity';
import { Evenement }           from '../evenements/entities/evenement.entity';
import { StockMouvement }      from '../stocks/entities/stock-mouvement.entity';
import { Vehicule }            from '../vehicules/entities/vehicule.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host:     config.get<string>('DB_HOST', 'localhost'),
        port:     parseInt(config.get<string>('DB_PORT', '5432'), 10),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),

        // ── Toutes les entités enregistrées explicitement ────────────────────
        entities: [
          AuditLog,
          Entrepot,
          Materiel,
          Stock,
          Distributeur,
          Mission,
          MissionItem,
          Douar,
          Crise,
          DouarSeverite,
          PipelineResultEntity,
          Tournee,
          TourneeEtape,
          Evenement,
          StockMouvement,
          Vehicule,
        ],

        /**
         * synchronize: false en production (le schéma SQL est géré par schema.sql).
         * En développement : true pour recréer les colonnes manquantes automatiquement.
         * ATTENTION : synchronize:true ne supprime pas les colonnes existantes ni les
         * triggers PostgreSQL créés par schema.sql — il est safe pour le dev.
         */
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        logging:     config.get<string>('NODE_ENV') === 'development',
        ssl: config.get<string>('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),
  ],
})
export class DatabaseModule {}
