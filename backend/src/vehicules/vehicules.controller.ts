import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { VehiculesService }          from './vehicules.service';
import { CreateVehiculeDto }         from './dto/create-vehicule.dto';
import { UpdateVehiculeStatutDto }   from './dto/update-vehicule-statut.dto';
import { Roles, CurrentUser, AuthUser } from '../auth/decorators/roles.decorator';

@Controller('vehicules')
export class VehiculesController {
  constructor(private readonly service: VehiculesService) {}

  /** GET /vehicules/entrepot/mine */
  @Get('entrepot/mine')
  @Roles('ADMIN_ENTREPOT')
  findMine(@CurrentUser() user: AuthUser) {
    return this.service.findByEntrepot(user);
  }

  /** POST /vehicules */
  @Post()
  @Roles('ADMIN_ENTREPOT')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateVehiculeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(dto, user);
  }

  /** PATCH /vehicules/:id/statut */
  @Patch(':id/statut')
  @Roles('ADMIN_ENTREPOT')
  updateStatut(
    @Param('id') id: string,
    @Body() dto: UpdateVehiculeStatutDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateStatut(id, dto, user);
  }

  /** DELETE /vehicules/:id */
  @Delete(':id')
  @Roles('ADMIN_ENTREPOT')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user);
  }
}
