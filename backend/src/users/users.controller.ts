import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { UsersService }             from './users.service';
import { CreateAdminEntrepotDto }   from './dto/create-admin-entrepot.dto';
import { UpdateAdminStatutDto }     from './dto/update-admin-statut.dto';
import { Roles }                    from '../auth/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  /** GET /users/admins — liste tous les ADMIN_ENTREPOT */
  @Get('admins')
  @Roles('SUPER_ADMIN')
  findAll() {
    return this.service.findAll();
  }

  /** GET /users/:id */
  @Get(':id')
  @Roles('SUPER_ADMIN')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** POST /users — créer un compte ADMIN_ENTREPOT */
  @Post()
  @Roles('SUPER_ADMIN')
  create(@Body() dto: CreateAdminEntrepotDto) {
    return this.service.create(dto);
  }

  /** PATCH /users/:id/statut — activer / désactiver */
  @Patch(':id/statut')
  @Roles('SUPER_ADMIN')
  updateStatut(
    @Param('id') id: string,
    @Body() dto: UpdateAdminStatutDto,
  ) {
    return this.service.updateStatut(id, dto);
  }

  /** POST /users/:id/reset-password — déclenche email Keycloak */
  @Post(':id/reset-password')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Param('id') id: string) {
    return this.service.resetPassword(id);
  }

  /** DELETE /users/:id */
  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
