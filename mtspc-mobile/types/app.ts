/**
 * TYPES PARTAGÉS — Toute l'application mobile
 * Adaptés depuis labcollect-mobile/app/types/app.ts
 * clientName → entrepotNom  |  sampleCount → inventaire logistique
 */

export type MissionStatut =
  | 'draft'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'annulee';

export type MissionPriorite = 'low' | 'medium' | 'high' | 'critique';

export interface MissionItem {
  id: string;
  materielNom: string;
  categorie?: 'TENTE' | 'EAU' | 'MEDICAMENT' | 'NOURRITURE' | 'EQUIPEMENT' | 'AUTRE';
  quantitePrevue: number;
  quantiteLivree?: number | null;
  unite: string;
}

/** Structure principale d'une mission — compatible avec le backend NestJS */
export interface Mission {
  id: string;
  numeroMission: string;

  // Remplace "clientName" de labcollect-mobile
  entrepotNom: string;
  entrepotId?: string;

  // Destination (zone sinistrée)
  destinationNom: string;
  destinationLat: number | null;
  destinationLng: number | null;
  destinationAdresse?: string;

  // Remplace "sampleCount" de labcollect-mobile : inventaire logistique
  items: MissionItem[];
  tentes?: number;   // Raccourci calculé : somme des items catégorie TENTE
  medicaments?: number;   // Raccourci calculé : somme des items catégorie MEDICAMENT
  eau?: number;   // Raccourci calculé : somme des items catégorie EAU

  statut: MissionStatut;
  priorite: MissionPriorite;
  dateEcheance: string;
  dateCreation?: string;  // Date de création de la mission
  description?: string;   // Description détaillée
  notes?: string;
  createdAt?: string;
}

/** Payload envoyé au backend lors d'une synchronisation hors-ligne */
export interface PendingSubmission {
  missionId: string;
  douarId?: string;         // Optionnel — pour déduplication par douar
  statut: 'completed';
  commentaireTerrain?: string;
  livraisonLat?: number;
  livraisonLng?: number;
  timestampLocal: string;   // ISO — horodatage de validation en mode hors-ligne
  tentativeSync: number;   // Nombre de tentatives de sync (pour debug jury)
  livraison?: DouarLivraison; // Payload complet — rempli depuis livraison-confirmation
}

export interface AuthUser {
  userId: string;
  username: string;
  email: string;
  roles: string[];
}

// ─── Tournée VRP (calculée par OR-Tools côté backend) ────────────────────────

/** Niveau de priorité d'un douar, issu du score TOPSIS */
export type NiveauPriorite = 'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE';

/** Une étape de l'itinéraire VRP — correspond à un douar à desservir */
export interface EtapeVRP {
  ordre: number;        // 1, 2, 3...
  etapeId?: string;     // UUID backend TourneeEtape — présent en mode API réel
  douarId: string;
  douarNom: string;
  lat: number;
  lng: number;
  distanceKm: number;        // Distance depuis l'étape précédente
  tempsEstimeMin: number;        // Temps de trajet estimé en minutes
  priorite: NiveauPriorite;
  scoreTopsis: number;        // Score C_i (0–1)
  population: number;
  ressources: {                   // Quantités à décharger à ce douar
    tentes: number;
    couvertures: number;
    vivres: number;
    kits_med: number;
    eau_litres: number;
  };
}

/** La tournée complète reçue du backend après calcul AHP→TOPSIS→VRP */
export interface Tournee {
  id: string;
  missionId: string;
  entrepotId: string;
  vehiculeId: string;
  distanceTotaleKm: number;
  tempsEstimeTotalMin: number;
  etapes: EtapeVRP[];
  statut: 'assignee' | 'en_cours' | 'terminee';
  criseId: string;
}

/** Confirmation de livraison effectuée à un douar */
export interface DouarLivraison {
  tourneeId: string;
  douarId: string;
  douarNom: string;
  // Quantités réellement livrées (peuvent différer du plan)
  quantitesReelles: {
    tentes: number;
    couvertures: number;
    vivres: number;
    kits_med: number;
    eau_litres: number;
  };
  commentaire?: string;
  photoUri?: string;        // URI locale de la photo de preuve
  signatureBase64?: string;       // Signature du responsable local (base64 PNG)
  timestampLocal: string;        // ISO — horodatage de la confirmation
  lat?: number;        // Position GPS au moment de la confirmation
  lng?: number;
  tentativeSync: number;
}

// ─── GPS & Alertes ────────────────────────────────────────────────────────────

/** Position GPS envoyée au backend via WebSocket toutes les 30 s */
export interface GpsPosition {
  distributeurId: string;
  tourneeId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: string;        // ISO
}

/** Alerte reçue via FCM (push notification) ou WebSocket */
export interface AlerteTerrain {
  id: string;
  type: 'route_bloquee' | 'replique_sismique' | 'meteo' | 'recalcul' | 'info';
  message: string;
  criseId: string;
  timestamp: string;
  // Pour les alertes "route bloquée" — coordonnées de l'obstacle
  obstacleLat?: number;
  obstacleLng?: number;
}
