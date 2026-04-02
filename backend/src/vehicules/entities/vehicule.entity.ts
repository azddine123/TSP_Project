import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Entrepot }     from '../../entrepots/entities/entrepot.entity';
import { Distributeur } from '../../distributeurs/entities/distributeur.entity';

/** CAMION | PICKUP | 4X4 | MOTO */
export type VehiculeType   = 'CAMION' | 'PICKUP' | '4X4' | 'MOTO';

/** disponible | en_mission | maintenance */
export type VehiculeStatut = 'disponible' | 'en_mission' | 'maintenance';

@Entity('vehicules')
export class Vehicule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── FK entrepôt de rattachement ──────────────────────────────────────────
  @Column({ name: 'entrepot_id' })
  entrepotId: string;

  @ManyToOne(() => Entrepot, { onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'entrepot_id' })
  entrepot: Entrepot;

  /** Plaque d'immatriculation */
  @Column({ length: 20, unique: true })
  immatriculation: string;

  /** CAMION | PICKUP | 4X4 | MOTO */
  @Column({ length: 10 })
  type: VehiculeType;

  @Column({ length: 100, nullable: true })
  marque: string | null;

  /** Capacité de charge en kg */
  @Column({ type: 'integer', nullable: true })
  capacite: number | null;

  /** disponible | en_mission | maintenance */
  @Column({ length: 20, default: 'disponible' })
  statut: VehiculeStatut;

  // ── Distributeur actuellement affecté (nullable) ─────────────────────────
  @Column({ name: 'distributeur_id', nullable: true })
  distributeurId: string | null;

  @ManyToOne(() => Distributeur, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'distributeur_id' })
  distributeur: Distributeur | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
