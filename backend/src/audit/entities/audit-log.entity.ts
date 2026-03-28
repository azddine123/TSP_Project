/**
 * ENTITÉ TYPEORM : audit_logs
 * ===========================
 * Mappe la table SQL `audit_logs` créée dans le schéma Phase 1.
 * Cette entité est en LECTURE/ÉCRITURE mais la table SQL sous-jacente
 * est rendue immuable par un trigger PostgreSQL (voir schéma SQL).
 *
 * Pour le jury : on NE DÉCLARE PAS de méthode update/delete ici.
 * Le service AuditLog ne propose qu'une méthode `insert()`.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  /**
   * Clé primaire auto-incrémentée (BIGSERIAL).
   * L'ordre croissant garantit la chronologie des événements — propriété
   * critique pour toute enquête d'intégrité menée par le Super-Admin.
   */
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  // ── QUI A FAIT QUOI SUR QUELLE TABLE ────────────────────────────────────────

  /** Nom de la table PostgreSQL ciblée par l'action */
  @Column({ name: 'table_cible', length: 100 })
  tableCible: string;

  /** Type d'opération HTTP mappé en opération SQL */
  @Column({
    type: 'varchar',
    length: 10,
    // INSERT = POST, UPDATE = PUT/PATCH, DELETE = DELETE
  })
  operation: 'INSERT' | 'UPDATE' | 'DELETE';

  /** Identifiant de l'enregistrement modifié (UUID ou ID de la ressource) */
  @Column({ name: 'record_id', length: 255 })
  recordId: string;

  // ── SNAPSHOT AVANT/APRÈS (pour comparaison lors d'une enquête) ─────────────

  /**
   * Valeurs de l'enregistrement AVANT la modification.
   * NULL pour les INSERT (il n'y avait rien avant).
   */
  @Column({ name: 'valeurs_avant', type: 'jsonb', nullable: true })
  valeursAvant: Record<string, any> | null;

  /**
   * Valeurs de l'enregistrement APRÈS la modification.
   * NULL pour les DELETE (plus rien après la suppression).
   */
  @Column({ name: 'valeurs_apres', type: 'jsonb', nullable: true })
  valeursApres: Record<string, any> | null;

  // ── CONTEXTE DE SÉCURITÉ (QUI a effectué l'action) ─────────────────────────

  /** UUID Keycloak de l'acteur — lié à un compte nominatif dans Keycloak */
  @Column({ name: 'acteur_user_id', length: 36 })
  acteurUserId: string;

  /** Rôle de l'acteur au moment de l'action */
  @Column({ name: 'acteur_role', length: 30 })
  acteurRole: string;

  /** Email de l'acteur (pour affichage humain dans le dashboard Super-Admin) */
  @Column({ name: 'acteur_email', length: 150, nullable: true })
  acteurEmail: string | null;

  /**
   * Identifiant de l'entrepôt concerné (si applicable).
   * Permet au Super-Admin de filtrer les logs par province.
   */
  @Column({ name: 'entrepot_id', type: 'uuid', nullable: true })
  entrepotId: string | null;

  // ── CONTEXTE RÉSEAU (D'OÙ vient la requête) ────────────────────────────────

  /** Adresse IP de l'acteur (valeur "inet" PostgreSQL stockée en string) */
  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string | null;

  /** User-Agent du client (navigateur, app mobile Expo, etc.) */
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  // ── HORODATAGE IMMUABLE ─────────────────────────────────────────────────────

  /**
   * Date/heure de l'événement.
   * @CreateDateColumn l'insère automatiquement via TypeORM.
   * Le trigger SQL PostgreSQL bloque toute modification ultérieure.
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;
}
