import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Tournee } from './tournee.entity';
import { Douar }   from '../../douars/entities/douar.entity';

/** en_attente | en_route | livree | echec */
@Entity('tournee_etapes')
export class TourneeEtape {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tournee_id' })
  tourneeId: string;

  @ManyToOne(() => Tournee, (t) => t.etapes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournee_id' })
  tournee: Tournee;

  @Column({ name: 'douar_id' })
  douarId: string;

  @ManyToOne(() => Douar, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'douar_id' })
  douar: Douar;

  /** Position dans la séquence de la tournée (1-based) */
  @Column({ type: 'int' })
  ordre: number;

  /** en_attente | en_route | livree | echec */
  @Column({ length: 20, default: 'en_attente' })
  statut: string;

  @Column({ name: 'arrivee_at', type: 'timestamptz', nullable: true })
  arriveeAt: Date | null;
}
