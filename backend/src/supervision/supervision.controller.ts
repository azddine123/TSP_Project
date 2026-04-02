import {
  Controller, Get, Sse, Query, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { SupervisionService, SupervisionSnapshot } from './supervision.service';
import { Public } from '../auth/decorators/roles.decorator';

@Controller('supervision')
export class SupervisionController {
  constructor(private readonly service: SupervisionService) {}

  /**
   * GET /supervision/stream
   *
   * Server-Sent Events — snapshot temps réel toutes les 5 s.
   * Authentification via token en query param (SSE ne supporte pas les headers custom).
   *
   * Le token est vérifié par le JwtAuthGuard global via le header
   * Authorization injecté dynamiquement dans le middleware SSE.
   *
   * @Public() : le guard global est bypass ici, le token est validé
   * dans le middleware d'auth (voir main.ts / auth.module).
   * Pour simplifier en dev, on laisse public et on documente.
   */
  @Sse('stream')
  @Public()
  stream(@Res() res: Response): Observable<MessageEvent<SupervisionSnapshot>> {
    // Désactiver le timeout HTTP pour SSE long-polling
    res.setTimeout(0);
    return this.service.getStream();
  }

  /**
   * GET /supervision/snapshot
   * Snapshot ponctuel (pour le premier rendu de la page, sans SSE).
   */
  @Get('snapshot')
  async snapshot() {
    // On réutilise le stream et prend la première valeur
    return new Promise<SupervisionSnapshot>((resolve) => {
      this.service.getStream().subscribe({
        next: (event) => resolve(event.data),
      });
    });
  }
}
