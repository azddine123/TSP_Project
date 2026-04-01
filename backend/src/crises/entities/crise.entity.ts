import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, OneToMany,
} from 'typeorm';
import { DouarSeverite }  from './douar-severite.entity';
import { Tournee }        from '../../tournees/entities/tournee.entity';
import { Evenement }      from '../../evenements/entities/evenement.entity';

@Entity('crises')
export class Crise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Référence lisible, ex: CRISE-2026-001 (générée par le service) */
  @Column({ length: 30, unique: true })
  reference: string;

  /** SEISME | INONDATION | GLISSEMENT | SECHERESSE | AUTRE */
  @Column({ length: 20 })
  type: string;

  /** Zone géographique concernée (ex: "Province de Béni Mellal") */
  @Column({ length: 200 })
  zone: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** active | suspendue | cloturee */
  @Column({ length: 20, default: 'active' })
  statut: string;

  /** UUID Keycloak du Super Admin ayant déclenché la crise */
  @Column({ name: 'declenche_par_id', length: 36 })
  declencheParId: string;

  @Column({ name: 'declenche_par_username', length: 100 })
  declencheParUsername: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'cloturee_at', type: 'timestamptz', nullable: true })
  clotureeAt: Date | null;

  @OneToMany(() => DouarSeverite, (ds) => ds.crise, { cascade: true })
  severitesParDouar: DouarSeverite[];

  @OneToMany(() => Tournee, (t) => t.crise)
  tournees: Tournee[];

  @OneToMany(() => Evenement, (e) => e.crise)
  evenements: Evenement[];
}
