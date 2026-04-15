import { Module }          from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { Tournee }         from './entities/tournee.entity';
import { TourneeEtape }    from './entities/tournee-etape.entity';
import { TourneesService }    from './tournees.service';
import { TourneesController } from './tournees.controller';
import { EntrepotsModule }    from '../entrepots/entrepots.module';
import { EvenementsModule }   from '../evenements/evenements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tournee, TourneeEtape]),
    EntrepotsModule,
    EvenementsModule,
  ],
  providers:   [TourneesService],
  controllers: [TourneesController],
  exports:     [TourneesService],
})
export class TourneesModule {}
