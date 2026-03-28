/**
 * TYPES CENTRALISÉS — Interfaces partagées dans toute l'application
 * =================================================================
 * Source unique de vérité pour tous les DTO et types métier.
 * Ces types correspondent exactement aux réponses du backend NestJS.
 */

// ── Entités métier ────────────────────────────────────────────────────────────

export interface StockRow {
  id:          string;
  entrepot:    { id: string; nom: string; province: string };
  materiel:    { id: string; nom: string; categorie: string; unite: string };
  quantite:    number;
  seuilAlerte: number;
  updatedAt:   string;
}

export interface Mission {
  id:             string;
  numeroMission:  string;
  destinationNom: string;
  statut:         MissionStatut;
  priorite:       MissionPriorite;
  dateEcheance:   string;
  distributeur?:  { id: string; nom: string; prenom: string };
  createdAt:      string;
}

export interface AuditLog {
  id:           number;
  tableCible:   string;
  operation:    AuditOperation;
  recordId:     string;
  valeursApres: Record<string, unknown> | null;
  acteurUserId: string;
  acteurRole:   string;
  acteurEmail:  string | null;
  ipAddress:    string | null;
  createdAt:    string;
}

export interface Entrepot {
  id:        string;
  code:      string;
  nom:       string;
  wilaya:    string;
  province:  string;
  latitude:  number;
  longitude: number;
  statut:    EntrepotStatut;
}

export interface Distributeur {
  id:     string;
  nom:    string;
  prenom: string;
  statut: string;
}

export interface Materiel {
  id:        string;
  nom:       string;
  categorie: string;
  unite:     string;
}

// ── DTOs de création ──────────────────────────────────────────────────────────

export interface CreateMissionDto {
  entrepotSourceId: string;
  distributeurId:   string;
  destinationNom:   string;
  destinationLat?:  number;
  destinationLng?:  number;
  priorite:         MissionPriorite;
  dateEcheance:     string;
  notes?:           string;
  items:            { materielId: string; quantitePrevue: number }[];
}

// ── Réponses paginées ─────────────────────────────────────────────────────────

export interface AuditLogsResponse {
  data: AuditLog[];
  meta: { total: number; page: number; totalPages: number };
}

// ── Enums métier ──────────────────────────────────────────────────────────────

export type MissionStatut =
  | 'draft'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'annulee';

export type MissionPriorite = 'low' | 'medium' | 'high' | 'critique';

export type AuditOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export type EntrepotStatut = 'actif' | 'surcharge' | 'inactif';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN_ENTREPOT' | 'DISTRIBUTEUR';
