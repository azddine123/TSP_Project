import { Controller, Get, Patch, Param, Body, NotFoundException } from '@nestjs/common';
import { IsString } from 'class-validator';
import { EntrepotsService }             from './entrepots.service';
import { Roles, CurrentUser, AuthUser } from '../auth/decorators/roles.decorator';

class AssignAdminDto {
  @IsString()
  keycloakAdminId: string;
}

@Controller('entrepots')
export class EntrepotsController {
  constructor(private readonly entrepotsService: EntrepotsService) {}

  /** GET /entrepots — tous les entrepôts (Super Admin + Admin Entrepôt pour formulaires) */
  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_ENTREPOT')
  findAll() {
    return this.entrepotsService.findAll();
  }

  /**
   * PATCH /entrepots/:id/assign-admin
   * Associe un compte Keycloak (Admin Entrepôt) à cet entrepôt.
   * Réservé au Super Admin.
   */
  @Patch(':id/assign-admin')
  @Roles('SUPER_ADMIN')
  async assignAdmin(
    @Param('id') id: string,
    @Body() dto: AssignAdminDto,
  ) {
    const entrepot = await this.entrepotsService.assignAdmin(id, dto.keycloakAdminId);
    if (!entrepot) throw new NotFoundException(`Entrepôt ${id} introuvable.`);
    return entrepot;
  }

  /**
   * GET /entrepots/mine
   * Retourne l'entrepôt associé à l'Admin Entrepôt connecté.
   * Déclaré AVANT :id pour éviter que NestJS l'intercepte comme un paramètre.
   */
  @Get('mine')
  @Roles('ADMIN_ENTREPOT')
  async findMine(@CurrentUser() user: AuthUser) {
    const entrepot = await this.entrepotsService.findByAdmin(user.userId);
    if (!entrepot) {
      throw new NotFoundException(
        'Aucun entrepôt associé à votre compte. Contactez un Super Admin.',
      );
    }
    return entrepot;
  }
}
