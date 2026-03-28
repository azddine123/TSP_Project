import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MaterielsService } from './materiels.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Matériels')
@ApiBearerAuth('JWT-Keycloak')
@Controller('materiels')
export class MaterielsController {
  constructor(private readonly matService: MaterielsService) {}

  /**
   * GET /api/v1/materiels
   * Alimente les listes déroulantes du formulaire "Créer une Mission".
   */
  @Get()
  @Roles('ADMIN_ENTREPOT')
  @ApiOperation({ summary: 'Liste tous les matériels disponibles (ADMIN_ENTREPOT)' })
  @ApiResponse({ status: 200, description: 'Catalogue matériels retourné.' })
  findAll() {
    return this.matService.findAll();
  }
}
