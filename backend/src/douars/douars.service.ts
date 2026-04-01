import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Douar } from './entities/douar.entity';

@Injectable()
export class DouarsService {
  constructor(
    @InjectRepository(Douar)
    private readonly repo: Repository<Douar>,
  ) {}

  findAll(): Promise<Douar[]> {
    return this.repo.find({ order: { wilaya: 'ASC', province: 'ASC', nom: 'ASC' } });
  }

  findOne(id: string): Promise<Douar | null> {
    return this.repo.findOneBy({ id });
  }
}
