/**
 * TYPES CENTRALISÉS — Source unique de vérité pour tous les DTO et types métier.
 * Couvre l'ensemble des modules : existants + nouveaux (Crise, Algo, Supervision…)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITÉS EXISTANTES
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE DOUARS
// ═══════════════════════════════════════════════════════════════════════════════

export interface Douar {
  id:         string;
  nom:        string;
  commune:    string;
  province:   string;
  wilaya:     string;
  latitude:   number;
  longitude:  number;
  population: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE CRISES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Crise {
  id:                     string;
  reference:              string;   // ex: CRISE-2026-001
  type:                   CriseType;
  zone:                   string;
  description:            string | null;
  statut:                 CriseStatut;
  declencheParId:         string;
  declencheParUsername:   string;
  createdAt:              string;
  clotureeAt:             string | null;
  severitesParDouar:      DouarSeverite[];
}

export interface DouarSeverite {
  id:             string;
  criseId:        string;
  douar:          Douar;
  /** Score de sévérité de la catastrophe sur ce douar : 0 (faible) → 10 (critique) */
  severite:       number;
  /** Score de vulnérabilité de la population : 0 → 1 */
  vulnerabilite:  number;
  /** Indice d'accessibilité routière : 0 (inaccessible) → 1 (libre) */
  accessibilite:  number;
  /** Proximité/disponibilité des soins : 0 (aucun) → 1 (bonne couverture) */
  accesSoins:     number;
}

export interface CreateCriseDto {
  type:               CriseType;
  zone:               string;
  description?:       string;
  severitesParDouar:  {
    douarId:       string;
    severite:      number;
    vulnerabilite: number;
    accessibilite: number;
    accesSoins:    number;
  }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE ALGORITHMES (AHP → TOPSIS → VRP)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Paramètres de la matrice AHP (comparaison par paires des 4 critères).
 * Représente la matrice supérieure triangulaire (6 valeurs).
 * Critères : [0]=Vulnérabilité, [1]=Sévérité, [2]=Accessibilité, [3]=AccèsSoins
 */
export interface AhpMatrice {
  /** Valeur de comparaison a_ij : importance du critère i par rapport à j (échelle 1-9) */
  comparaisons: {
    vuln_vs_sev:    number;  // α vs δ
    vuln_vs_acc:    number;  // α vs β
    vuln_vs_soins:  number;  // α vs γ
    sev_vs_acc:     number;  // δ vs β
    sev_vs_soins:   number;  // δ vs γ
    acc_vs_soins:   number;  // β vs γ
  };
}

export interface AhpResult {
  poids: {
    vulnerabilite: number;  // α ≈ 0.467
    severite:      number;  // δ ≈ 0.315
    accessibilite: number;  // β ≈ 0.139
    accesSoins:    number;  // γ ≈ 0.079
  };
  rc:        number;    // Ratio de Cohérence (doit être < 0.10)
  coherent:  boolean;   // rc < 0.10
  lambdaMax: number;    // Valeur propre principale
}

export interface TopsisRanking {
  douarId:   string;
  douarNom:  string;
  commune:   string;
  score:     number;   // C_i ∈ [0, 1] — plus élevé = priorité plus haute
  rang:      number;
  distances: {
    dPlus:   number;   // Distance à la solution idéale positive A+
    dMinus:  number;   // Distance à la solution idéale négative A-
  };
}

export interface TopsisResult {
  classement:   TopsisRanking[];
  solutionIdealePlus:  number[];  // A+ par critère
  solutionIdealeNeg:   number[];  // A- par critère
}

export interface VrpEtape {
  douarId:   string;
  douarNom:  string;
  ordre:     number;
  latitude:  number;
  longitude: number;
  population: number;
}

export interface VrpTournee {
  entrepotId:       string;
  entrepotNom:      string;
  vehiculeCapacite: number;
  etapes:           VrpEtape[];
  distanceTotale:   number;   // km
  tempsEstime:      number;   // minutes
  scoreZ:           number;   // Valeur de la fonction objective Z = λ1·D + λ2·T − λ3·C
}

export interface PipelineResult {
  id:            string;
  criseId:       string;
  statut:        PipelineStatut;
  ahp:           AhpResult  | null;
  topsis:        TopsisResult | null;
  tournees:      VrpTournee[] | null;
  executionMs:   number | null;
  createdAt:     string;
  completedAt:   string | null;
  erreur:        string | null;
}

export interface RunPipelineDto {
  criseId:     string;
  ahpMatrice:  AhpMatrice;
  /** Coefficients de la fonction objectif VRP : Z = λ1·Distance + λ2·Temps − λ3·Couverture */
  lambdas: {
    distance:   number;  // λ1
    temps:      number;  // λ2
    couverture: number;  // λ3
  };
  contraintesVehicules: {
    entrepotId:  string;
    capacite:    number;  // kg ou unités
    nbVehicules: number;
  }[];
  /** Recalcul partiel : IDs de douars déjà desservis à exclure */
  douarsExclus?:    string[];
  /** Segments routiers signalés bloqués (format "lat1,lng1-lat2,lng2") */
  routesBloquees?:  string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE TOURNÉES (résultats persistés du VRP)
// ═══════════════════════════════════════════════════════════════════════════════

export interface Tournee {
  id:              string;
  criseId:         string;
  pipelineId:      string;
  entrepot:        { id: string; nom: string; province: string };
  distributeur:    { id: string; nom: string; prenom: string } | null;
  statut:          TourneeStatut;
  distanceTotale:  number;
  tempsEstime:     number;
  etapes:          TourneeEtape[];
  createdAt:       string;
  demarreeAt:      string | null;
  termineeAt:      string | null;
}

export interface TourneeEtape {
  id:        string;
  tourneeId: string;
  douar:     Douar;
  ordre:     number;
  statut:    EtapeStatut;
  arriveeAt: string | null;
}

export interface AssignerTourneeDto {
  distributeurId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE SUPERVISION (temps réel SSE + WebSocket)
// ═══════════════════════════════════════════════════════════════════════════════

export interface VehiculePosition {
  distributeurId:   string;
  distributeurNom:  string;
  tourneeId:        string;
  latitude:         number;
  longitude:        number;
  vitesse:          number;   // km/h
  cap:              number;   // degrés (0–360)
  updatedAt:        string;
}

export interface TourneeProgres {
  tourneeId:      string;
  entrepotNom:    string;
  etapesTotal:    number;
  etapesLivrees:  number;
  pourcentage:    number;
}

export interface StockGlobalItem {
  entrepotId:        string;
  entrepotNom:       string;
  province:          string;
  tauxRemplissage:   number;  // % 0–100
  alertesCount:      number;  // nb articles sous seuil
}

/** Snapshot complet envoyé par SSE toutes les N secondes */
export interface SupervisionSnapshot {
  timestamp:      string;
  criseActive:    Pick<Crise, 'id' | 'reference' | 'type' | 'zone'> | null;
  vehicules:      VehiculePosition[];
  stocksGlobal:   StockGlobalItem[];
  tourneeProgres: TourneeProgres[];
  alertesActives: Evenement[];
}

/** Payload envoyé par l'app mobile (WebSocket) pour mise à jour GPS */
export interface GpsUpdatePayload {
  distributeurId: string;
  tourneeId:      string;
  latitude:       number;
  longitude:      number;
  vitesse:        number;
  cap:            number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE ÉVÉNEMENTS / INCIDENTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface Evenement {
  id:            string;
  criseId:       string;
  type:          EvenementType;
  severite:      EvenementSeverite;
  titre:         string;
  description:   string;
  signaleParId:  string | null;
  signaleParNom: string | null;
  tourneeId:     string | null;
  douarId:       string | null;
  statut:        EvenementStatut;
  createdAt:     string;
  resolvedAt:    string | null;
}

export interface CreateEvenementDto {
  criseId:      string;
  type:         EvenementType;
  severite:     EvenementSeverite;
  titre:        string;
  description:  string;
  tourneeId?:   string;
  douarId?:     string;
}

export interface SendAlertDto {
  criseId:         string;
  distributeurIds: string[];
  titre:           string;
  message:         string;
  severite:        EvenementSeverite;
}

export interface EvenementsResponse {
  data: Evenement[];
  meta: { total: number; page: number; totalPages: number };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE UTILISATEURS (Admin Entrepôt via Keycloak Admin API)
// ═══════════════════════════════════════════════════════════════════════════════

export interface AdminEntrepot {
  id:         string;   // UUID Keycloak
  username:   string;
  email:      string;
  firstName:  string;
  lastName:   string;
  enabled:    boolean;
  entrepotId: string | null;
  createdAt:  number;   // timestamp ms (format Keycloak)
}

export interface CreateAdminEntrepotDto {
  username:    string;
  email:       string;
  firstName:   string;
  lastName:    string;
  password:    string;
  entrepotId?: string;
}

export interface UpdateAdminStatutDto {
  enabled: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs EXISTANTS
// ═══════════════════════════════════════════════════════════════════════════════

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

export interface AuditLogsResponse {
  data: AuditLog[];
  meta: { total: number; page: number; totalPages: number };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS MÉTIER
// ═══════════════════════════════════════════════════════════════════════════════

export type MissionStatut    = 'draft' | 'pending' | 'in_progress' | 'completed' | 'annulee';
export type MissionPriorite  = 'low' | 'medium' | 'high' | 'critique';
export type AuditOperation   = 'INSERT' | 'UPDATE' | 'DELETE';
export type EntrepotStatut   = 'actif' | 'surcharge' | 'inactif';
export type UserRole         = 'SUPER_ADMIN' | 'ADMIN_ENTREPOT' | 'DISTRIBUTEUR';

export type CriseType        = 'SEISME' | 'INONDATION' | 'GLISSEMENT' | 'SECHERESSE' | 'AUTRE';
export type CriseStatut      = 'active' | 'suspendue' | 'cloturee';

export type PipelineStatut   = 'pending' | 'running' | 'completed' | 'failed';

export type TourneeStatut    = 'planifiee' | 'en_cours' | 'terminee' | 'annulee';
export type EtapeStatut      = 'en_attente' | 'en_route' | 'livree' | 'echec';

export type EvenementType    =
  | 'INCIDENT_TERRAIN'
  | 'RUPTURE_STOCK'
  | 'VEHICULE_PANNE'
  | 'ROUTE_BLOQUEE'
  | 'ALERTE_PUSH'
  | 'RECALCUL_DEMANDE';

export type EvenementSeverite = 'info' | 'warning' | 'critical';
export type EvenementStatut   = 'ouvert' | 'en_traitement' | 'resolu';
