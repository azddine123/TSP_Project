import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Crise }            from './entities/crise.entity';
import { DouarSeverite }    from './entities/douar-severite.entity';
import { CrisesService }    from './crises.service';
import { CrisesController } from './crises.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([Crise, DouarSeverite])],
  providers:   [CrisesService],
  controllers: [CrisesController],
  exports:     [CrisesService],
})
export class CrisesModule {}
