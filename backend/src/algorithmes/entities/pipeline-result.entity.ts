import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Crise } from '../../crises/entities/crise.entity';

/**
 * Persistance du résultat complet AHP → TOPSIS → VRP.
 * Permet de conserver l'historique des décisions algorithmiques.
 */
@Entity('pipeline_results')
export class PipelineResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'crise_id' })
  criseId: string;

  @ManyToOne(() => Crise, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crise_id' })
  crise: Crise;

  /** pending | running | completed | failed */
  @Column({ length: 20, default: 'pending' })
  statut: string;

  /** Résultat AHP sérialisé en JSON */
  @Column({ name: 'ahp_result', type: 'jsonb', nullable: true })
  ahpResult: Record<string, unknown> | null;

  /** Résultat TOPSIS sérialisé en JSON */
  @Column({ name: 'topsis_result', type: 'jsonb', nullable: true })
  topsisResult: Record<string, unknown> | null;

  /** Tournées générées par le VRP, sérialisées en JSON */
  @Column({ name: 'vrp_tournees', type: 'jsonb', nullable: true })
  vrpTournees: Record<string, unknown>[] | null;

  /** Paramètres d'entrée (RunPipelineDto) pour traçabilité */
  @Column({ name: 'input_params', type: 'jsonb', nullable: true })
  inputParams: Record<string, unknown> | null;

  /** Durée d'exécution totale en millisecondes */
  @Column({ name: 'execution_ms', type: 'int', nullable: true })
  executionMs: number | null;

  /** Message d'erreur en cas d'échec */
  @Column({ type: 'text', nullable: true })
  erreur: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
