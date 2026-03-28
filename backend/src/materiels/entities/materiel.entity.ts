import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Entrepot } from '../../entrepots/entities/entrepot.entity';

@Entity('materiels')
export class Materiel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** ex: MAT-TENTE-3P */
  @Column({ length: 50, unique: true })
  reference: string;

  @Column({ length: 200 })
  nom: string;

  /** TENTE | EAU | MEDICAMENT | NOURRITURE | EQUIPEMENT | AUTRE */
  @Column({ length: 30 })
  categorie: string;

  @Column({ name: 'sous_categorie', length: 100, nullable: true })
  sousCategorie: string | null;

  @Column({ length: 30, default: 'unité' })
  unite: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // ── FK entrepot ───────────────────────────────────────────────────────────
  @Column({ name: 'entrepot_id' })
  entrepotId: string;

  @ManyToOne(() => Entrepot, (e) => e.materiels, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'entrepot_id' })
  entrepot: Entrepot;

  /** UUID Keycloak de l'admin qui a créé ce matériel */
  @Column({ name: 'created_by', length: 36 })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany('Stock',       'materiel')
  stocks: any[];

  @OneToMany('MissionItem', 'materiel')
  missionItems: any[];
}
