import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Stock }         from './entities/stock.entity';
import { StockMouvement } from './entities/stock-mouvement.entity';
import { CreateMouvementDto } from './dto/create-mouvement.dto';
import type { AuthUser } from '../auth/decorators/roles.decorator';

export interface MouvementsQuery {
  page?:       number;
  limit?:      number;
  type?:       'ENTREE' | 'SORTIE';
  materielId?: string;
}

@Injectable()
export class StocksService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepo: Repository<Stock>,
    @InjectRepository(StockMouvement)
    private readonly mouvementRepo: Repository<StockMouvement>,
    private readonly dataSource: DataSource,
  ) {}

  // ── SUPER_ADMIN : tous les stocks ────────────────────────────────────────

  findAll(): Promise<Stock[]> {
    return this.stockRepo.find({
      relations: ['entrepot', 'materiel'],
      order:     { updatedAt: 'DESC' },
    });
  }

  // ── ADMIN_ENTREPOT : stocks de son entrepôt ──────────────────────────────

  findByEntrepot(entrepotId: string): Promise<Stock[]> {
    return this.stockRepo.find({
      where:     { entrepotId },
      relations: ['materiel'],
      order:     { updatedAt: 'DESC' },
    });
  }

  // ── Mouvement IN/OUT avec mise à jour atomique du stock ──────────────────

  async createMouvement(
    entrepotId: string,
    dto: CreateMouvementDto,
    user: AuthUser,
  ): Promise<StockMouvement> {
    return this.dataSource.transaction(async (em) => {
      // Verrou pessimiste pour éviter les race conditions
      const stock = await em.findOne(Stock, {
        where:     { entrepotId, materielId: dto.materielId },
        lock:      { mode: 'pessimistic_write' },
        relations: ['materiel'],
      });

      if (!stock) {
        throw new NotFoundException(
          `Aucun stock trouvé pour ce matériel dans votre entrepôt.`,
        );
      }

      // Vérification stock suffisant pour une sortie
      if (dto.type === 'SORTIE' && stock.quantite < dto.quantite) {
        throw new BadRequestException(
          `Stock insuffisant pour "${stock.materiel?.nom}". ` +
          `Disponible : ${stock.quantite}, demandé : ${dto.quantite}.`,
        );
      }

      // Mise à jour du stock
      if (dto.type === 'ENTREE') {
        stock.quantite       += dto.quantite;
        stock.derniereEntree  = new Date();
      } else {
        stock.quantite       -= dto.quantite;
        stock.derniereSortie  = new Date();
      }
      stock.updatedBy = user.userId;
      await em.save(stock);

      // Création de la ligne de mouvement
      const mouvement = em.create(StockMouvement, {
        entrepotId,
        materielId:   dto.materielId,
        type:         dto.type,
        quantite:     dto.quantite,
        motif:        dto.motif ?? null,
        referenceDoc: dto.referenceDoc ?? null,
        stockApres:   stock.quantite,
        acteurId:     user.userId,
        acteurNom:    user.username,
      });

      return em.save(mouvement);
    });
  }

  // ── Historique mouvements (paginé) ───────────────────────────────────────

  async getMouvements(
    entrepotId: string,
    query: MouvementsQuery = {},
  ): Promise<{ data: StockMouvement[]; meta: { total: number; page: number } }> {
    const page  = Math.max(1, query.page  ?? 1);
    const limit = Math.min(100, query.limit ?? 50);

    const qb = this.mouvementRepo.createQueryBuilder('m')
      .leftJoinAndSelect('m.materiel', 'mat')
      .where('m.entrepot_id = :entrepotId', { entrepotId })
      .orderBy('m.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.type)       qb.andWhere('m.type = :type', { type: query.type });
    if (query.materielId) qb.andWhere('m.materiel_id = :mid', { mid: query.materielId });

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page } };
  }

  // ── Décrémentation (appelée par MissionsService) ─────────────────────────

  async decrementStock(
    entrepotId: string,
    materielId: string,
    quantite:   number,
    updatedBy:  string,
  ): Promise<void> {
    const stock = await this.stockRepo.findOne({
      where:     { entrepotId, materielId },
      relations: ['materiel'],
    });

    if (!stock) {
      throw new NotFoundException(
        `Stock introuvable pour le matériel ${materielId} dans l'entrepôt ${entrepotId}.`,
      );
    }

    if (stock.quantite < quantite) {
      throw new BadRequestException(
        `Stock insuffisant pour "${stock.materiel?.nom ?? materielId}". ` +
        `Disponible : ${stock.quantite}, demandé : ${quantite}.`,
      );
    }

    stock.quantite      -= quantite;
    stock.derniereSortie = new Date();
    stock.updatedBy      = updatedBy;

    await this.stockRepo.save(stock);
  }
}
