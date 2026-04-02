import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, interval } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { Crise }        from '../crises/entities/crise.entity';
import { Tournee }      from '../tournees/entities/tournee.entity';
import { Stock }        from '../stocks/entities/stock.entity';
import { Evenement }    from '../evenements/entities/evenement.entity';
import { GpsCacheService, VehiculePosition } from './gps-cache.service';

export interface TourneeProgres {
  tourneeId:      string;
  entrepotNom:    string;
  etapesTotal:    number;
  etapesLivrees:  number;
  pourcentage:    number;
}

export interface StockGlobalItem {
  entrepotId:       string;
  entrepotNom:      string;
  province:         string;
  tauxRemplissage:  number;
  alertesCount:     number;
}

export interface SupervisionSnapshot {
  timestamp:       string;
  criseActive:     Pick<Crise, 'id' | 'reference' | 'type' | 'zone'> | null;
  vehicules:       VehiculePosition[];
  stocksGlobal:    StockGlobalItem[];
  tourneeProgres:  TourneeProgres[];
  alertesActives:  Evenement[];
}

/** Intervalle SSE en millisecondes */
const SSE_INTERVAL_MS = 5_000;

@Injectable()
export class SupervisionService {
  private readonly logger = new Logger(SupervisionService.name);

  constructor(
    @InjectRepository(Crise)    private readonly criseRepo: Repository<Crise>,
    @InjectRepository(Tournee)  private readonly tourneeRepo: Repository<Tournee>,
    @InjectRepository(Stock)    private readonly stockRepo: Repository<Stock>,
    @InjectRepository(Evenement) private readonly evenementRepo: Repository<Evenement>,
    private readonly gpsCache: GpsCacheService,
  ) {}

  /**
   * Retourne un Observable RxJS émettant un SupervisionSnapshot toutes les 5 s.
   * NestJS transforme cela en Server-Sent Events via @Sse().
   */
  getStream(): Observable<MessageEvent<SupervisionSnapshot>> {
    return interval(SSE_INTERVAL_MS).pipe(
      switchMap(() => this.buildSnapshot()),
      map((snapshot) => ({ data: snapshot } as MessageEvent<SupervisionSnapshot>)),
    );
  }

  // ── Construction du snapshot ──────────────────────────────────────────────

  private async buildSnapshot(): Promise<SupervisionSnapshot> {
    const [criseActive, vehicules, stocksGlobal, tourneeProgres, alertesActives] =
      await Promise.all([
        this.getCriseActive(),
        Promise.resolve(this.gpsCache.getAll()),
        this.getStocksGlobal(),
        this.getTourneeProgres(),
        this.getAlertesActives(),
      ]);

    return {
      timestamp:      new Date().toISOString(),
      criseActive,
      vehicules,
      stocksGlobal,
      tourneeProgres,
      alertesActives,
    };
  }

  // ── Crise active ──────────────────────────────────────────────────────────

  private async getCriseActive(): Promise<Pick<Crise, 'id' | 'reference' | 'type' | 'zone'> | null> {
    const crise = await this.criseRepo.findOne({
      where:  { statut: 'active' },
      select: ['id', 'reference', 'type', 'zone'],
      order:  { createdAt: 'DESC' },
    });
    return crise ?? null;
  }

  // ── Stocks globaux ────────────────────────────────────────────────────────

  private async getStocksGlobal(): Promise<StockGlobalItem[]> {
    const stocks = await this.stockRepo.find({
      relations: { entrepot: true, materiel: true },
    });

    // Grouper par entrepôt
    const byEntrepot = new Map<string, {
      nom: string; province: string;
      total: number; alertes: number;
    }>();

    for (const s of stocks) {
      const key = s.entrepot.id;
      const existing = byEntrepot.get(key) ?? {
        nom:      s.entrepot.nom,
        province: s.entrepot.province,
        total:    0,
        alertes:  0,
      };
      existing.total++;
      if (s.quantite <= s.seuilAlerte) existing.alertes++;
      byEntrepot.set(key, existing);
    }

    return Array.from(byEntrepot.entries()).map(([id, v]) => ({
      entrepotId:       id,
      entrepotNom:      v.nom,
      province:         v.province,
      tauxRemplissage:  v.total > 0 ? Math.round(((v.total - v.alertes) / v.total) * 100) : 100,
      alertesCount:     v.alertes,
    }));
  }

  // ── Progression des tournées en cours ─────────────────────────────────────

  private async getTourneeProgres(): Promise<TourneeProgres[]> {
    const tournees = await this.tourneeRepo.find({
      where:     { statut: 'en_cours' },
      relations: { etapes: true, entrepot: true },
    });

    return tournees.map((t) => {
      const total  = t.etapes.length;
      const livrees = t.etapes.filter((e) => e.statut === 'livree').length;
      return {
        tourneeId:     t.id,
        entrepotNom:   t.entrepot.nom,
        etapesTotal:   total,
        etapesLivrees: livrees,
        pourcentage:   total > 0 ? Math.round((livrees / total) * 100) : 0,
      };
    });
  }

  // ── Alertes actives (dernières 50) ────────────────────────────────────────

  private async getAlertesActives(): Promise<Evenement[]> {
    return this.evenementRepo.find({
      where: [{ statut: 'ouvert' }, { statut: 'en_traitement' }],
      order: { createdAt: 'DESC' },
      take:  50,
    });
  }
}
