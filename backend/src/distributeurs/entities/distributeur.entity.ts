import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Entrepot } from '../../entrepots/entities/entrepot.entity';

@Entity('distributeurs')
export class Distributeur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** UUID Keycloak — lié au compte Keycloak du distributeur (DISTRIBUTEUR rôle) */
  @Column({ name: 'keycloak_user_id', length: 36, unique: true })
  keycloakUserId: string;

  @Column({ length: 100 })
  nom: string;

  @Column({ length: 100 })
  prenom: string;

  @Column({ length: 20, nullable: true })
  telephone: string | null;

  @Column({ length: 150, nullable: true })
  email: string | null;

  // ── FK entrepot (entrepôt de rattachement du distributeur) ────────────────
  @Column({ name: 'entrepot_id' })
  entrepotId: string;

  @ManyToOne(() => Entrepot, (e) => e.distributeurs, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'entrepot_id' })
  entrepot: Entrepot;

  /** disponible | en_mission | inactif */
  @Column({ length: 20, default: 'disponible' })
  statut: string;

  @Column({ name: 'derniere_connexion', type: 'timestamptz', nullable: true })
  derniereConnexion: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany('Mission', 'distributeur')
  missions: any[];
}
