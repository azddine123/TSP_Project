import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DistributeursService } from './distributeurs.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Distributeurs')
@ApiBearerAuth('JWT-Keycloak')
@Controller('distributeurs')
export class DistributeursController {
  constructor(private readonly distService: DistributeursService) {}

  /**
   * GET /api/v1/distributeurs
   * Alimente la liste déroulante "Distributeur assigné" du formulaire Web.
   * Le frontend filtre côté client sur statut === 'disponible'.
   */
  @Get()
  @Roles('ADMIN_ENTREPOT')
  @ApiOperation({ summary: 'Liste des distributeurs (ADMIN_ENTREPOT)' })
  @ApiResponse({ status: 200, description: 'Distributeurs retournés.' })
  findAll() {
    return this.distService.findAll();
  }
}
