import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EntrepotsService } from './entrepots.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Entrepôts')
@ApiBearerAuth('JWT-Keycloak')
@Controller('entrepots')
export class EntrepotsController {
  constructor(private readonly entrepotsService: EntrepotsService) {}

  /**
   * GET /api/v1/entrepots
   * Accessible par SUPER_ADMIN (carte Leaflet) et ADMIN_ENTREPOT (formulaire missions).
   */
  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_ENTREPOT')
  @ApiOperation({ summary: 'Liste tous les entrepôts de la région' })
  @ApiResponse({ status: 200, description: 'Liste des entrepôts avec coordonnées GPS.' })
  @ApiResponse({ status: 403, description: 'Accès refusé.' })
  findAll() {
    return this.entrepotsService.findAll();
  }
}
