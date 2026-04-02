import {
  Controller, Get, Post, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { StocksService }      from './stocks.service';
import { CreateMouvementDto } from './dto/create-mouvement.dto';
import { Roles, CurrentUser, AuthUser } from '../auth/decorators/roles.decorator';
import { EntrepotsService }   from '../entrepots/entrepots.service';
import { NotFoundException }  from '@nestjs/common';

@Controller('stocks')
export class StocksController {
  constructor(
    private readonly stocksService:   StocksService,
    private readonly entrepotsService: EntrepotsService,
  ) {}

  // ── SUPER_ADMIN — vue globale ────────────────────────────────────────────

  /** GET /stocks — tous les stocks (Super Admin) */
  @Get()
  @Roles('SUPER_ADMIN')
  findAll() {
    return this.stocksService.findAll();
  }

  // ── ADMIN_ENTREPOT — vue filtrée sur son entrepôt ────────────────────────

  /**
   * GET /stocks/entrepot/mine
   * Inventaire de l'entrepôt de l'admin connecté.
   * RBAC strict : l'entrepotId est résolu depuis keycloak_admin_id, jamais passé en clair.
   */
  @Get('entrepot/mine')
  @Roles('ADMIN_ENTREPOT')
  async findMine(@CurrentUser() user: AuthUser) {
    const entrepot = await this.entrepotsService.findByAdmin(user.userId);
    if (!entrepot) throw new NotFoundException('Aucun entrepôt associé à votre compte.');
    return this.stocksService.findByEntrepot(entrepot.id);
  }

  /**
   * POST /stocks/entrepot/mine/mouvement
   * Enregistre une entrée ou sortie de stock avec horodatage.
   */
  @Post('entrepot/mine/mouvement')
  @Roles('ADMIN_ENTREPOT')
  @HttpCode(HttpStatus.CREATED)
  async createMouvement(
    @Body() dto: CreateMouvementDto,
    @CurrentUser() user: AuthUser,
  ) {
    const entrepot = await this.entrepotsService.findByAdmin(user.userId);
    if (!entrepot) throw new NotFoundException('Aucun entrepôt associé à votre compte.');
    return this.stocksService.createMouvement(entrepot.id, dto, user);
  }

  /**
   * GET /stocks/entrepot/mine/mouvements
   * Historique paginé des mouvements de l'entrepôt.
   */
  @Get('entrepot/mine/mouvements')
  @Roles('ADMIN_ENTREPOT')
  async getMouvements(
    @CurrentUser() user: AuthUser,
    @Query('page')       page?:       string,
    @Query('limit')      limit?:      string,
    @Query('type')       type?:       'ENTREE' | 'SORTIE',
    @Query('materielId') materielId?: string,
  ) {
    const entrepot = await this.entrepotsService.findByAdmin(user.userId);
    if (!entrepot) throw new NotFoundException('Aucun entrepôt associé à votre compte.');
    return this.stocksService.getMouvements(entrepot.id, {
      page:       page  ? parseInt(page,  10) : undefined,
      limit:      limit ? parseInt(limit, 10) : undefined,
      type,
      materielId,
    });
  }
}
