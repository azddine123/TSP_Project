import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mission }            from './entities/mission.entity';
import { MissionItem }        from './entities/mission-item.entity';
import { MissionsService }    from './missions.service';
import { MissionsController } from './missions.controller';
import { SyncController }     from './sync.controller';
import { StocksModule }       from '../stocks/stocks.module';
import { DistributeursModule } from '../distributeurs/distributeurs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mission, MissionItem]),

    // Importé pour décrémenter le stock lors de POST /missions
    StocksModule,

    // Importé pour mettre à jour le statut distributeur (en_mission ↔ disponible)
    DistributeursModule,
  ],
  providers:   [MissionsService],
  controllers: [MissionsController, SyncController],
})
export class MissionsModule {}
