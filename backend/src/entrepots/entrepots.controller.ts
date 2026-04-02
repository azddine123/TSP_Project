import { Controller, Get, NotFoundException } from '@nestjs/common';
import { EntrepotsService }             from './entrepots.service';
import { Roles, CurrentUser, AuthUser } from '../auth/decorators/roles.decorator';

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
