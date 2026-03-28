import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entrepot } from './entities/entrepot.entity';
import { EntrepotsService } from './entrepots.service';
import { EntrepotsController } from './entrepots.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([Entrepot])],
  providers:   [EntrepotsService],
  controllers: [EntrepotsController],
  exports:     [EntrepotsService],   // Exporté pour usage dans MissionsModule
})
export class EntrepotsModule {}
