import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';

/** Transformateur DECIMAL PostgreSQL → number JavaScript */
const toNum = {
  to:   (v: number | null) => v,
  from: (v: string | null) => (v != null ? parseFloat(v) : null),
};

@Entity('entrepots')
export class Entrepot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20, unique: true })
  code: string;

  @Column({ length: 150 })
  nom: string;

  @Column({ length: 100 })
  wilaya: string;

  @Column({ length: 100, nullable: true })
  province: string | null;

  @Column({ type: 'text', nullable: true })
  adresse: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, transformer: toNum })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, transformer: toNum })
  longitude: number;

  @Column({ name: 'capacite_m3', type: 'integer', nullable: true })
  capaciteM3: number | null;

  /** actif | inactif | surcharge */
  @Column({ length: 20, default: 'actif' })
  statut: string;

  @Column({ name: 'keycloak_admin_id', length: 36, nullable: true })
  keycloakAdminId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ── Relations (lazy-loading évité : on charge explicitement en service) ──
  @OneToMany('Stock',       'entrepot')
  stocks: any[];

  @OneToMany('Materiel',    'entrepot')
  materiels: any[];

  @OneToMany('Distributeur','entrepot')
  distributeurs: any[];

  @OneToMany('Mission',     'entrepotSource')
  missions: any[];
}
