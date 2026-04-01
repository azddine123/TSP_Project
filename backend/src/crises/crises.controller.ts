import {
  Controller, Get, Post, Patch, Param, Body,
} from '@nestjs/common';
import { CrisesService }         from './crises.service';
import { CreateCriseDto }        from './dto/create-crise.dto';
import { UpdateCriseStatutDto }  from './dto/update-crise-statut.dto';
import { Roles, CurrentUser, AuthUser } from '../auth/decorators/roles.decorator';

@Controller('crises')
export class CrisesController {
  constructor(private readonly service: CrisesService) {}

  /** GET /crises — liste toutes les crises */
  @Get()
  @Roles('SUPER_ADMIN')
  findAll() {
    return this.service.findAll();
  }

  /** GET /crises/:id */
  @Get(':id')
  @Roles('SUPER_ADMIN')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** POST /crises — déclencher une nouvelle crise */
  @Post()
  @Roles('SUPER_ADMIN')
  create(
    @Body() dto: CreateCriseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(dto, user.userId, user.username);
  }

  /** PATCH /crises/:id/statut — suspendre / clôturer */
  @Patch(':id/statut')
  @Roles('SUPER_ADMIN')
  updateStatut(
    @Param('id') id: string,
    @Body() dto: UpdateCriseStatutDto,
  ) {
    return this.service.updateStatut(id, dto);
  }
}
