import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Materiel } from './entities/materiel.entity';
import { MaterielsService } from './materiels.service';
import { MaterielsController } from './materiels.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([Materiel])],
  providers:   [MaterielsService],
  controllers: [MaterielsController],
  exports:     [MaterielsService],
})
export class MaterielsModule {}
