import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock }          from './entities/stock.entity';
import { StockMouvement } from './entities/stock-mouvement.entity';
import { StocksService }  from './stocks.service';
import { StocksController } from './stocks.controller';
import { EntrepotsModule }  from '../entrepots/entrepots.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stock, StockMouvement]),
    EntrepotsModule,
  ],
  providers:   [StocksService],
  controllers: [StocksController],
  exports:     [StocksService],
})
export class StocksModule {}
