import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Mission }  from './mission.entity';
import { Materiel } from '../../materiels/entities/materiel.entity';

/** Contrainte UNIQUE (mission_id, materiel_id) — miroir du schéma SQL */
@Unique(['missionId', 'materielId'])
@Entity('mission_items')
export class MissionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── FK mission ────────────────────────────────────────────────────────────
  @Column({ name: 'mission_id' })
  missionId: string;

  @ManyToOne(() => Mission, (m) => m.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mission_id' })
  mission: Mission;

  // ── FK matériel ───────────────────────────────────────────────────────────
  @Column({ name: 'materiel_id' })
  materielId: string;

  @ManyToOne(() => Materiel, (m) => m.missionItems, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'materiel_id' })
  materiel: Materiel;

  /** Quantité prévue à l'expédition */
  @Column({ name: 'quantite_prevue', type: 'integer' })
  quantitePrevue: number;

  /** Quantité effectivement livrée (renseignée à la validation terrain) */
  @Column({ name: 'quantite_livree', type: 'integer', nullable: true })
  quantiteLivree: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
