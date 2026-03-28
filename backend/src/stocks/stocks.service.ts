import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from './entities/stock.entity';

@Injectable()
export class StocksService {
  constructor(
    @InjectRepository(Stock)
    private readonly repo: Repository<Stock>,
  ) {}

  /**
   * Retourne tous les stocks avec leurs relations entrepôt et matériel.
   * Le DataGrid "Inventaire du Stock" du dashboard AdminDashboard consomme cette réponse.
   */
  findAll(): Promise<Stock[]> {
    return this.repo.find({
      relations: ['entrepot', 'materiel'],
      order:     { updatedAt: 'DESC' },
    });
  }

  /**
   * Décrémente le stock lors de la création d'une mission.
   * Appelée par MissionsService dans la boucle des items.
   *
   * @throws NotFoundException   si aucun stock n'existe pour ce couple entrepôt/matériel
   * @throws BadRequestException si la quantité disponible est insuffisante
   */
  async decrementStock(
    entrepotId: string,
    materielId: string,
    quantite:   number,
    updatedBy:  string,   // UUID Keycloak de l'admin qui crée la mission
  ): Promise<void> {
    const stock = await this.repo.findOne({
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

    await this.repo.save(stock);
  }
}
