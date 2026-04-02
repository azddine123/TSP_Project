import { Module }          from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { Vehicule }        from './entities/vehicule.entity';
import { VehiculesService }    from './vehicules.service';
import { VehiculesController } from './vehicules.controller';
import { EntrepotsModule }     from '../entrepots/entrepots.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicule]),
    EntrepotsModule,
  ],
  providers:   [VehiculesService],
  controllers: [VehiculesController],
  exports:     [VehiculesService],
})
export class VehiculesModule {}
