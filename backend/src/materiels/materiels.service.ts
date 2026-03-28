import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Materiel } from './entities/materiel.entity';

@Injectable()
export class MaterielsService {
  constructor(
    @InjectRepository(Materiel)
    private readonly repo: Repository<Materiel>,
  ) {}

  /**
   * Retourne tous les matériels avec leur entrepôt de rattachement.
   * Utilisé pour remplir la liste déroulante "Matériels à expédier" du formulaire Web.
   */
  findAll(): Promise<Materiel[]> {
    return this.repo.find({
      relations: ['entrepot'],
      order:     { nom: 'ASC' },
    });
  }

  findById(id: string): Promise<Materiel | null> {
    return this.repo.findOne({ where: { id } });
  }
}
