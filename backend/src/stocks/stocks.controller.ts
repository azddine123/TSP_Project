import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StocksService } from './stocks.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Stocks')
@ApiBearerAuth('JWT-Keycloak')
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  /**
   * GET /api/v1/stocks
   * Alimente le DataGrid "Inventaire du Stock" avec badges d'alerte.
   */
  @Get()
  @Roles('ADMIN_ENTREPOT')
  @ApiOperation({ summary: 'Inventaire du stock avec alertes (ADMIN_ENTREPOT)' })
  @ApiResponse({ status: 200, description: 'Stocks retournés avec entrepôt et matériel.' })
  findAll() {
    return this.stocksService.findAll();
  }
}
