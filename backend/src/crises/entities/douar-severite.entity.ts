import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Crise }  from './crise.entity';
import { Douar }  from '../../douars/entities/douar.entity';

const toNum = { to: (v: number) => v, from: (v: string) => parseFloat(v) };

@Entity('douar_severites')
export class DouarSeverite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'crise_id' })
  criseId: string;

  @ManyToOne(() => Crise, (c) => c.severitesParDouar, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crise_id' })
  crise: Crise;

  @Column({ name: 'douar_id' })
  douarId: string;

  @ManyToOne(() => Douar, (d) => d.severites, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'douar_id' })
  douar: Douar;

  /** Score de sévérité de la catastrophe sur ce douar : 0 → 10 */
  @Column({ type: 'decimal', precision: 4, scale: 2, transformer: toNum })
  severite: number;

  /** Score de vulnérabilité de la population : 0 → 1 */
  @Column({ type: 'decimal', precision: 4, scale: 3, transformer: toNum })
  vulnerabilite: number;

  /** Indice d'accessibilité routière : 0 (inaccessible) → 1 (libre) */
  @Column({ type: 'decimal', precision: 4, scale: 3, transformer: toNum })
  accessibilite: number;

  /** Proximité des soins : 0 (aucun) → 1 (bonne couverture) */
  @Column({ name: 'acces_soins', type: 'decimal', precision: 4, scale: 3, transformer: toNum })
  accesSoins: number;
}
