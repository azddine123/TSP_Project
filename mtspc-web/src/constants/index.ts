/**
 * CONSTANTES CENTRALISÉES — Source unique de vérité pour labels, couleurs et formats
 * ===================================================================================
 * Importer depuis ici plutôt que de dupliquer inline dans chaque composant.
 */
import type { MissionStatut, MissionPriorite, AuditOperation, UserRole } from '../types';

// ── Couleurs MUI par statut de mission ────────────────────────────────────────

export const MISSION_STATUT_COLOR: Record<
  MissionStatut,
  'default' | 'warning' | 'info' | 'success' | 'error'
> = {
  draft:       'default',
  pending:     'warning',
  in_progress: 'info',
  completed:   'success',
  annulee:     'error',
};

export const MISSION_STATUT_LABEL: Record<MissionStatut, string> = {
  draft:       'Brouillon',
  pending:     'En attente',
  in_progress: 'En cours',
  completed:   'Terminée',
  annulee:     'Annulée',
};

// ── Couleurs MUI par priorité de mission ──────────────────────────────────────

export const MISSION_PRIORITE_COLOR: Record<
  MissionPriorite,
  'default' | 'warning' | 'error'
> = {
  low:      'default',
  medium:   'warning',
  high:     'error',
  critique: 'error',
};

export const MISSION_PRIORITE_LABEL: Record<MissionPriorite, string> = {
  low:      'Basse',
  medium:   'Normale',
  high:     'Haute',
  critique: 'CRITIQUE',
};

// ── Couleurs MUI par opération d'audit ────────────────────────────────────────

export const AUDIT_OPERATION_COLOR: Record<
  AuditOperation,
  'success' | 'warning' | 'error'
> = {
  INSERT: 'success',
  UPDATE: 'warning',
  DELETE: 'error',
};

// ── Couleurs MUI par catégorie de matériel ────────────────────────────────────

export const MATERIEL_CATEGORIE_COLOR: Record<
  string,
  'error' | 'warning' | 'info' | 'success' | 'default'
> = {
  TENTE:      'info',
  EAU:        'success',
  MEDICAMENT: 'error',
  NOURRITURE: 'warning',
};

// ── Couleurs MUI par rôle utilisateur ─────────────────────────────────────────

export const ROLE_CHIP_COLOR: Record<UserRole, 'error' | 'warning' | 'info'> = {
  SUPER_ADMIN:    'error',
  ADMIN_ENTREPOT: 'warning',
  DISTRIBUTEUR:   'info',
};

// ── Couleurs hex par statut d'entrepôt (pour Leaflet & légende) ───────────────

export const ENTREPOT_STATUT_COLOR: Record<string, string> = {
  actif:     '#4CAF50',
  surcharge: '#E53935',
  inactif:   '#9E9E9E',
};

// ── Formatage de dates (fr-MA) ────────────────────────────────────────────────

export const DATE_LOCALE = 'fr-MA';

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(DATE_LOCALE);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(DATE_LOCALE);
}

// ── Textes localisés pour MUI DataGrid ────────────────────────────────────────

export const DATAGRID_LOCALE = {
  noRowsLabel:        'Aucune donnée',
  MuiTablePagination: { labelRowsPerPage: 'Lignes par page :' },
};
