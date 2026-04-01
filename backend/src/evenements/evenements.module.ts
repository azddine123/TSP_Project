import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evenement }            from './entities/evenement.entity';
import { EvenementsService }    from './evenements.service';
import { EvenementsController } from './evenements.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([Evenement])],
  providers:   [EvenementsService],
  controllers: [EvenementsController],
  exports:     [EvenementsService],
})
export class EvenementsModule {}
