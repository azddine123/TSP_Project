import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournee }          from './entities/tournee.entity';
import { TourneeEtape }     from './entities/tournee-etape.entity';
import { TourneesService }  from './tournees.service';
import { TourneesController } from './tournees.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([Tournee, TourneeEtape])],
  providers:   [TourneesService],
  controllers: [TourneesController],
  exports:     [TourneesService],
})
export class TourneesModule {}
