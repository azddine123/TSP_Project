import {
  Entity, PrimaryGeneratedColumn, Column,
  UpdateDateColumn, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Entrepot } from '../../entrepots/entities/entrepot.entity';
import { Materiel } from '../../materiels/entities/materiel.entity';

/** Contrainte UNIQUE sur (entrepot_id, materiel_id) — miroir du schéma SQL */
@Unique(['entrepotId', 'materielId'])
@Entity('stocks')
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── FK entrepot ───────────────────────────────────────────────────────────
  @Column({ name: 'entrepot_id' })
  entrepotId: string;

  @ManyToOne(() => Entrepot, (e) => e.stocks, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'entrepot_id' })
  entrepot: Entrepot;

  // ── FK materiel ───────────────────────────────────────────────────────────
  @Column({ name: 'materiel_id' })
  materielId: string;

  @ManyToOne(() => Materiel, (m) => m.stocks, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'materiel_id' })
  materiel: Materiel;

  @Column({ type: 'integer', default: 0 })
  quantite: number;

  @Column({ name: 'seuil_alerte', type: 'integer', default: 10 })
  seuilAlerte: number;

  @Column({ name: 'derniere_entree', type: 'timestamptz', nullable: true })
  derniereEntree: Date | null;

  @Column({ name: 'derniere_sortie', type: 'timestamptz', nullable: true })
  derniereSortie: Date | null;

  /**
   * UUID Keycloak de l'acteur qui a mis à jour le stock (NOT NULL dans le schéma).
   * Fourni par @CurrentUser() dans le contrôleur / service.
   */
  @Column({ name: 'updated_by', length: 36 })
  updatedBy: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
