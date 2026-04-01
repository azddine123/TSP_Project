import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipelineResultEntity }  from './entities/pipeline-result.entity';
import { AhpService }            from './ahp.service';
import { TopsisService }         from './topsis.service';
import { VrpService }            from './vrp.service';
import { AlgorithmesService }    from './algorithmes.service';
import { AlgorithmesController } from './algorithmes.controller';
import { CrisesModule }          from '../crises/crises.module';
import { EntrepotsModule }       from '../entrepots/entrepots.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PipelineResultEntity]),
    CrisesModule,
    EntrepotsModule,
  ],
  providers:   [AhpService, TopsisService, VrpService, AlgorithmesService],
  controllers: [AlgorithmesController],
  exports:     [AlgorithmesService],
})
export class AlgorithmesModule {}
