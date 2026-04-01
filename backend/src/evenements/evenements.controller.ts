import {
  Controller, Get, Post, Patch, Param, Body, Query,
} from '@nestjs/common';
import { EvenementsService }         from './evenements.service';
import { CreateEvenementDto }        from './dto/create-evenement.dto';
import { UpdateEvenementStatutDto }  from './dto/update-evenement-statut.dto';
import { SendAlertDto }              from './dto/send-alert.dto';
import { Roles, CurrentUser, AuthUser } from '../auth/decorators/roles.decorator';

@Controller('evenements')
export class EvenementsController {
  constructor(private readonly service: EvenementsService) {}

  /** GET /evenements/crise/:criseId?page=1&limit=20 */
  @Get('crise/:criseId')
  @Roles('SUPER_ADMIN', 'ADMIN_ENTREPOT')
  findByCrise(
    @Param('criseId') criseId: string,
    @Query('page')  page  = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.findByCrise(criseId, parseInt(page), parseInt(limit));
  }

  /** POST /evenements */
  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_ENTREPOT', 'DISTRIBUTEUR')
  create(
    @Body() dto: CreateEvenementDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(dto, user.userId, user.username);
  }

  /** POST /evenements/alert */
  @Post('alert')
  @Roles('SUPER_ADMIN')
  sendAlert(
    @Body() dto: SendAlertDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.sendAlert(dto, user.userId, user.username);
  }

  /** PATCH /evenements/:id/statut */
  @Patch(':id/statut')
  @Roles('SUPER_ADMIN', 'ADMIN_ENTREPOT')
  updateStatut(
    @Param('id') id: string,
    @Body() dto: UpdateEvenementStatutDto,
  ) {
    return this.service.updateStatut(id, dto);
  }
}
