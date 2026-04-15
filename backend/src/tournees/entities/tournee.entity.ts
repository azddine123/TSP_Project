import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { RessourcesDouar } from './tournee-etape.entity';
import { Crise }            from '../../crises/entities/crise.entity';
import { Entrepot }         from '../../entrepots/entities/entrepot.entity';
import { Distributeur }     from '../../distributeurs/entities/distributeur.entity';
import { TourneeEtape }     from './tournee-etape.entity';
import { PipelineResultEntity } from '../../algorithmes/entities/pipeline-result.entity';

/** planifiee | en_cours | terminee | annulee */
@Entity('tournees')
export class Tournee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'crise_id' })
  criseId: string;

  @ManyToOne(() => Crise, (c) => c.tournees, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crise_id' })
  crise: Crise;

  @Column({ name: 'pipeline_id' })
  pipelineId: string;

  @ManyToOne(() => PipelineResultEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline: PipelineResultEntity;

  @Column({ name: 'entrepot_id' })
  entrepotId: string;

  @ManyToOne(() => Entrepot, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'entrepot_id' })
  entrepot: Entrepot;

  @Column({ name: 'distributeur_id', nullable: true })
  distributeurId: string | null;

  @ManyToOne(() => Distributeur, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'distributeur_id' })
  distributeur: Distributeur | null;

  /** planifiee | en_cours | terminee | annulee */
  @Column({ length: 20, default: 'planifiee' })
  statut: string;

  @Column({
    name: 'distance_totale',
    type: 'decimal', precision: 10, scale: 3,
    transformer: { to: (v) => v, from: (v) => v != null ? parseFloat(v) : 0 },
  })
  distanceTotale: number;

  @Column({
    name: 'temps_estime',
    type: 'int',
    default: 0,
    comment: 'Durée estimée en minutes',
  })
  tempsEstime: number;

  @OneToMany(() => TourneeEtape, (e) => e.tournee, { cascade: true })
  etapes: TourneeEtape[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'demarree_at', type: 'timestamptz', nullable: true })
  demarreeAt: Date | null;

  @Column({ name: 'terminee_at', type: 'timestamptz', nullable: true })
  termineeAt: Date | null;

  /** Ressources totales de toute la tournée (somme des étapes) */
  @Column({ name: 'ressources_totales', type: 'jsonb', nullable: true })
  ressourcesTotales: RessourcesDouar | null;
}
