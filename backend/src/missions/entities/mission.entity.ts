import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Entrepot }     from '../../entrepots/entities/entrepot.entity';
import { Distributeur } from '../../distributeurs/entities/distributeur.entity';
import { MissionItem }  from './mission-item.entity';

const toNum = {
  to:   (v: number | null) => v,
  from: (v: string | null) => (v != null ? parseFloat(v) : null),
};

@Entity('missions_livraison')
export class Mission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** ex: MSN-2024-00042 (unique, généré par le service) */
  @Column({ name: 'numero_mission', length: 30, unique: true })
  numeroMission: string;

  // ── FK entrepôt source ───────────────────────────────────────────────────
  @Column({ name: 'entrepot_source_id' })
  entrepotSourceId: string;

  @ManyToOne(() => Entrepot, (e) => e.missions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'entrepot_source_id' })
  entrepotSource: Entrepot;

  // ── FK distributeur (nullable : mission non-assignée possible) ───────────
  @Column({ name: 'distributeur_id', nullable: true })
  distributeurId: string | null;

  @ManyToOne(() => Distributeur, (d) => d.missions, {
    nullable:  true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'distributeur_id' })
  distributeur: Distributeur | null;

  // ── Destination (zone sinistrée) ─────────────────────────────────────────
  @Column({ name: 'destination_nom', length: 200 })
  destinationNom: string;

  @Column({ name: 'destination_adresse', type: 'text', nullable: true })
  destinationAdresse: string | null;

  @Column({ name: 'destination_lat', type: 'decimal', precision: 10, scale: 7, nullable: true, transformer: toNum })
  destinationLat: number | null;

  @Column({ name: 'destination_lng', type: 'decimal', precision: 10, scale: 7, nullable: true, transformer: toNum })
  destinationLng: number | null;

  // ── Statut & priorité ────────────────────────────────────────────────────
  /** draft | pending | in_progress | completed | annulee */
  @Column({ length: 20, default: 'draft' })
  statut: string;

  /** low | medium | high | critique */
  @Column({ length: 10, default: 'medium' })
  priorite: string;

  @Column({ name: 'date_echeance', type: 'timestamptz', nullable: true })
  dateEcheance: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // ── Données de livraison terrain (renseignées par le distributeur) ────────
  @Column({ name: 'preuve_photo_url', type: 'text', nullable: true })
  preuvePhotoUrl: string | null;

  @Column({ name: 'signature_url', type: 'text', nullable: true })
  signatureUrl: string | null;

  @Column({ name: 'commentaire_terrain', type: 'text', nullable: true })
  commentaireTerrain: string | null;

  @Column({ name: 'livraison_lat', type: 'decimal', precision: 10, scale: 7, nullable: true, transformer: toNum })
  livraisonLat: number | null;

  @Column({ name: 'livraison_lng', type: 'decimal', precision: 10, scale: 7, nullable: true, transformer: toNum })
  livraisonLng: number | null;

  // ── Audit interne ────────────────────────────────────────────────────────
  /** UUID Keycloak de l'admin qui a créé la mission */
  @Column({ name: 'created_by', length: 36 })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  // ── Items (matériels embarqués) ──────────────────────────────────────────
  @OneToMany(() => MissionItem, (item) => item.mission, { cascade: true })
  items: MissionItem[];
}
