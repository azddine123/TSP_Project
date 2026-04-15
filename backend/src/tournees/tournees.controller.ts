import {
  Controller, Get, Post, Patch, Param, Body, NotFoundException,
} from '@nestjs/common';
import { TourneesService }          from './tournees.service';
import { AssignerTourneeDto }       from './dto/assigner-tournee.dto';
import { UpdateEtapeStatutDto }     from './dto/update-etape-statut.dto';
import { Roles, CurrentUser, AuthUser } from '../auth/decorators/roles.decorator';
import { EntrepotsService }         from '../entrepots/entrepots.service';
import { IsOptional, IsString }     from 'class-validator';

class RouteBloqueeDto {
  @IsOptional()
  @IsString()
  commentaire?: string;
}

@Controller('tournees')
export class TourneesController {
  constructor(
    private readonly service: TourneesService,
    private readonly entrepotsService: EntrepotsService,
  ) {}

  /** GET /tournees — Toutes les tournées (Super Admin uniquement) */
  @Get()
  @Roles('SUPER_ADMIN')
  findAll() {
    return this.service.findAll();
  }

  /** GET /tournees/crise/:criseId — Super Admin */
  @Get('crise/:criseId')
  @Roles('SUPER_ADMIN', 'ADMIN_ENTREPOT')
  findByCrise(@Param('criseId') criseId: string) {
    return this.service.findByCrise(criseId);
  }

  /**
   * GET /tournees/entrepot/mine — Admin Entrepôt
   * Retourne toutes les tournées affectées à l'entrepôt de l'admin connecté.
   * Déclaré avant :id pour éviter le conflit de route.
   */
  @Get('entrepot/mine')
  @Roles('ADMIN_ENTREPOT')
  async findMine(@CurrentUser() user: AuthUser) {
    const entrepot = await this.entrepotsService.findByAdmin(user.userId);
    if (!entrepot) throw new NotFoundException('Aucun entrepôt associé à votre compte.');
    return this.service.findByEntrepot(entrepot.id);
  }

  /**
   * GET /tournees/distributeur/mine — Distributeur
   * Retourne les tournées assignées au distributeur connecté (hors annulées).
   * Déclaré avant :id pour éviter le conflit de route.
   */
  @Get('distributeur/mine')
  @Roles('DISTRIBUTEUR')
  findMineAsDistributeur(@CurrentUser() user: AuthUser) {
    return this.service.findForDistributeur(user.userId);
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

  /** PATCH /tournees/:id/reassigner */
  @Patch(':id/reassigner')
  @Roles('SUPER_ADMIN', 'ADMIN_ENTREPOT')
  reassigner(
    @Param('id') id: string,
    @Body() dto: AssignerTourneeDto,
  ) {
    return this.service.reassigner(id, dto);
  }

  /** PATCH /tournees/:id/annuler */
  @Patch(':id/annuler')
  @Roles('SUPER_ADMIN', 'ADMIN_ENTREPOT')
  annuler(@Param('id') id: string) {
    return this.service.annuler(id);
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

  /**
   * PATCH /tournees/:id/etapes/:etapeId/route-bloquee
   * Le distributeur signale que la route vers ce douar est bloquée.
   * → Étape marquée 'echec' + événement ROUTE_BLOQUEE créé pour le Super Admin.
   */
  @Patch(':id/etapes/:etapeId/route-bloquee')
  @Roles('DISTRIBUTEUR', 'ADMIN_ENTREPOT', 'SUPER_ADMIN')
  signalerRouteBloquee(
    @Param('id')      tourneeId: string,
    @Param('etapeId') etapeId:   string,
    @Body() dto: RouteBloqueeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.signalerRouteBloquee(
      tourneeId,
      etapeId,
      dto.commentaire ?? '',
      user?.userId ?? null,
      user?.username ?? null,
    );
  }
}
