import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from './entities/stock.entity';
import { StocksService } from './stocks.service';
import { StocksController } from './stocks.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([Stock])],
  providers:   [StocksService],
  controllers: [StocksController],
  exports:     [StocksService],   // Exporté → MissionsModule l'utilise pour décrémenter
})
export class StocksModule {}
