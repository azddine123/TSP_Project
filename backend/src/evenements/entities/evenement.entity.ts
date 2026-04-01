import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Crise } from '../../crises/entities/crise.entity';

/**
 * Événements / incidents signalés durant une crise.
 * Types : INCIDENT_TERRAIN | RUPTURE_STOCK | VEHICULE_PANNE | ROUTE_BLOQUEE |
 *         ALERTE_PUSH | RECALCUL_DEMANDE
 * Sévérité : info | warning | critical
 * Statut : ouvert | en_traitement | resolu
 */
@Entity('evenements')
export class Evenement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'crise_id' })
  criseId: string;

  @ManyToOne(() => Crise, (c) => c.evenements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crise_id' })
  crise: Crise;

  @Column({ length: 30 })
  type: string;

  @Column({ length: 10, default: 'info' })
  severite: string;

  @Column({ length: 200 })
  titre: string;

  @Column({ type: 'text' })
  description: string;

  /** UUID Keycloak de l'utilisateur signalant l'événement (nullable = système) */
  @Column({ name: 'signale_par_id', length: 36, nullable: true })
  signaleParId: string | null;

  @Column({ name: 'signale_par_nom', length: 200, nullable: true })
  signaleParNom: string | null;

  /** Tournée concernée (optionnel) */
  @Column({ name: 'tournee_id', nullable: true })
  tourneeId: string | null;

  /** Douar concerné (optionnel) */
  @Column({ name: 'douar_id', nullable: true })
  douarId: string | null;

  /** ouvert | en_traitement | resolu */
  @Column({ length: 20, default: 'ouvert' })
  statut: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;
}
