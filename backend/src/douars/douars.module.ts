import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Douar } from './entities/douar.entity';
import { DouarsService } from './douars.service';
import { DouarsController } from './douars.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([Douar])],
  providers:   [DouarsService],
  controllers: [DouarsController],
  exports:     [DouarsService],
})
export class DouarsModule {}
