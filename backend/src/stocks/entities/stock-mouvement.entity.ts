/**
 * STOCK MOUVEMENT — Historique inaltérable de chaque entrée/sortie de stock.
 * Chaque opération crée une ligne ici ET met à jour stock.quantite.
 * Jamais de suppression (append-only).
 */
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Entrepot } from '../../entrepots/entities/entrepot.entity';
import { Materiel } from '../../materiels/entities/materiel.entity';

/** ENTREE = réapprovisionnement / SORTIE = chargement mission / perte / correction */
export type MouvementType = 'ENTREE' | 'SORTIE';

@Entity('stocks_mouvements')
export class StockMouvement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── FK entrepôt ──────────────────────────────────────────────────────────
  @Column({ name: 'entrepot_id' })
  entrepotId: string;

  @ManyToOne(() => Entrepot, { onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'entrepot_id' })
  entrepot: Entrepot;

  // ── FK matériel ──────────────────────────────────────────────────────────
  @Column({ name: 'materiel_id' })
  materielId: string;

  @ManyToOne(() => Materiel, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'materiel_id' })
  materiel: Materiel;

  /** ENTREE ou SORTIE */
  @Column({ length: 10 })
  type: MouvementType;

  /** Quantité absolue (toujours positive) */
  @Column({ type: 'integer' })
  quantite: number;

  /**
   * Motif : 'reapprovisionnement' | 'chargement_mission' | 'perte' |
   *         'correction' | 'retour_mission' | 'autre'
   */
  @Column({ length: 50, nullable: true })
  motif: string | null;

  /** Référence document : numéro de tournée, bon de livraison, etc. */
  @Column({ name: 'reference_doc', length: 100, nullable: true })
  referenceDoc: string | null;

  /** Stock résultant APRÈS ce mouvement (snapshot pour l'audit) */
  @Column({ name: 'stock_apres', type: 'integer' })
  stockApres: number;

  /** UUID Keycloak de l'acteur */
  @Column({ name: 'acteur_id', length: 36 })
  acteurId: string;

  /** Nom d'affichage de l'acteur (dénormalisé pour éviter la dépendance Keycloak) */
  @Column({ name: 'acteur_nom', length: 150 })
  acteurNom: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
