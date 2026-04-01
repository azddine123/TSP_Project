import {
  Controller, Get, Post, Patch, Param, Body,
} from '@nestjs/common';
import { TourneesService }       from './tournees.service';
import { AssignerTourneeDto }    from './dto/assigner-tournee.dto';
import { UpdateEtapeStatutDto }  from './dto/update-etape-statut.dto';
import { Roles }                 from '../auth/decorators/roles.decorator';

@Controller('tournees')
export class TourneesController {
  constructor(private readonly service: TourneesService) {}

  /** GET /tournees/crise/:criseId */
  @Get('crise/:criseId')
  @Roles('SUPER_ADMIN', 'ADMIN_ENTREPOT')
  findByCrise(@Param('criseId') criseId: string) {
    return this.service.findByCrise(criseId);
  }

  /** GET /tournees/:id */
  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_ENTREPOT', 'DISTRIBUTEUR')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** PATCH /tournees/:id/assigner */
  @Patch(':id/assigner')
  @Roles('SUPER_ADMIN', 'ADMIN_ENTREPOT')
  assigner(
    @Param('id') id: string,
    @Body() dto: AssignerTourneeDto,
  ) {
    return this.service.assigner(id, dto);
  }

  /** PATCH /tournees/:id/demarrer */
  @Patch(':id/demarrer')
  @Roles('SUPER_ADMIN', 'ADMIN_ENTREPOT')
  demarrer(@Param('id') id: string) {
    return this.service.demarrer(id);
  }

  /** PATCH /tournees/:id/etapes/:etapeId/statut */
  @Patch(':id/etapes/:etapeId/statut')
  @Roles('SUPER_ADMIN', 'ADMIN_ENTREPOT', 'DISTRIBUTEUR')
  updateEtapeStatut(
    @Param('id')      tourneeId: string,
    @Param('etapeId') etapeId:   string,
    @Body() dto: UpdateEtapeStatutDto,
  ) {
    return this.service.updateEtapeStatut(tourneeId, etapeId, dto);
  }
}
