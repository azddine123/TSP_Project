import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Distributeur } from './entities/distributeur.entity';
import { DistributeursService } from './distributeurs.service';
import { DistributeursController } from './distributeurs.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([Distributeur])],
  providers:   [DistributeursService],
  controllers: [DistributeursController],
  exports:     [DistributeursService],  // Exporté → MissionsModule met à jour le statut
})
export class DistributeursModule {}
