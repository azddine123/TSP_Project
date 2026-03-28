import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/roles.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Vérification de l\'état de l\'API (sans authentification)' })
  @ApiResponse({
    status: 200,
    description: 'API opérationnelle.',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-09-12T16:45:00.000Z',
        uptime: 42.3,
        environment: 'development',
      },
    },
  })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
