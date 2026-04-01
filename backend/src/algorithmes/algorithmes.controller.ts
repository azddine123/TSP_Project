import {
  Controller, Post, Get, Param, Body,
} from '@nestjs/common';
import { AlgorithmesService } from './algorithmes.service';
import { RunPipelineDto }     from './dto/run-pipeline.dto';
import { Roles }              from '../auth/decorators/roles.decorator';

@Controller('algorithmes')
export class AlgorithmesController {
  constructor(private readonly service: AlgorithmesService) {}

  /** POST /algorithmes/pipeline — lancer le pipeline complet */
  @Post('pipeline')
  @Roles('SUPER_ADMIN')
  runPipeline(@Body() dto: RunPipelineDto) {
    return this.service.runPipeline(dto);
  }

  /** GET /algorithmes/pipeline/crise/:criseId — historique d'une crise */
  @Get('pipeline/crise/:criseId')
  @Roles('SUPER_ADMIN')
  findByCrise(@Param('criseId') criseId: string) {
    return this.service.findByCrise(criseId);
  }

  /** GET /algorithmes/pipeline/:id — résultat détaillé */
  @Get('pipeline/:id')
  @Roles('SUPER_ADMIN')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
