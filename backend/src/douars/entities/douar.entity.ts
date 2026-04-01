import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { DouarSeverite } from '../../crises/entities/douar-severite.entity';

@Entity('douars')
export class Douar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  nom: string;

  @Column({ length: 150 })
  commune: string;

  @Column({ length: 100 })
  province: string;

  @Column({ length: 100 })
  wilaya: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  longitude: number;

  /** Population recensée (source : RGPH 2024) */
  @Column({ type: 'int', default: 0 })
  population: number;

  @OneToMany(() => DouarSeverite, (ds) => ds.douar)
  severites: DouarSeverite[];
}
