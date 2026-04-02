import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Crise }       from '../crises/entities/crise.entity';
import { Tournee }     from '../tournees/entities/tournee.entity';
import { TourneeEtape } from '../tournees/entities/tournee-etape.entity';
import { Stock }       from '../stocks/entities/stock.entity';
import { Evenement }   from '../evenements/entities/evenement.entity';
import { GpsCacheService }       from './gps-cache.service';
import { GpsGateway }            from './gps.gateway';
import { SupervisionService }    from './supervision.service';
import { SupervisionController } from './supervision.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Crise, Tournee, TourneeEtape, Stock, Evenement]),
  ],
  providers:   [GpsCacheService, GpsGateway, SupervisionService],
  controllers: [SupervisionController],
  exports:     [GpsCacheService, SupervisionService],
})
export class SupervisionModule {}
