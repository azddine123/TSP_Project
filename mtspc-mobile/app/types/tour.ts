/**
 * TYPES VRP / TOURNÉE — Application Mobile Distributeur
 * ======================================================
 * Types spécifiques au moteur de tournée optimisée (OR-Tools backend).
 * Compatible avec l'endpoint GET /tours/:id/full-manifest du backend NestJS.
 */

// ── Priorité TOPSIS ────────────────────────────────────────────────────────────

export type DouarPriorite = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const PRIORITE_CONFIG: Record<
  DouarPriorite,
  { color: string; bg: string; label: string; emoji: string }
> = {
  CRITICAL: { color: '#EF4444', bg: '#FEF2F2', label: 'CRITIQUE', emoji: '🔴' },
  HIGH:     { color: '#F97316', bg: '#FFF7ED', label: 'HAUTE',    emoji: '🟠' },
  MEDIUM:   { color: '#EAB308', bg: '#FEFCE8', label: 'MOYENNE',  emoji: '🟡' },
  LOW:      { color: '#22C55E', bg: '#F0FDF4', label: 'BASSE',    emoji: '🟢' },
};

// ── Article à livrer ───────────────────────────────────────────────────────────

export interface ArticleLivraison {
  item:     string;   // Ex : "Tente", "Couverture", "Kit vivres"
  quantite: number;   // Quantité planifiée par le VRP
}

// ── Étape de livraison (un douar) ─────────────────────────────────────────────

export type StatutEtape = 'pending' | 'delivered' | 'partial' | 'skipped';

export interface EtapeLivraison {
  id:             string;         // UUID local (généré à la création)
  tourId:         string;
  douarId:        string;
  douarNom:       string;
  ordreSequence:  number;         // Position dans l'itinéraire VRP optimisé
  distanceKm:     number;         // Distance depuis l'étape précédente
  etaMinutes:     number;         // Temps estimé depuis l'étape précédente
  latitude:       number;
  longitude:      number;
  priorite:       DouarPriorite;
  topsisScore:    number;         // Score TOPSIS [0..1] calculé par le backend
  articlesPlanifies: ArticleLivraison[];

  // ── Champs remplis lors de la confirmation terrain ──────────────────────────
  statut:          StatutEtape;
  articlesLivres?: ArticleLivraison[];  // Quantités réelles (peut différer du plan)
  photoUri?:       string;              // URI locale de la photo de preuve
  signatureB64?:   string;              // Signature data-url PNG base64
  confirmeAt?:     number;              // Timestamp de confirmation (ms)
  gpsLat?:         number;              // Position GPS à la confirmation
  gpsLng?:         number;
  noteChaufeur?:   string;
  isSynced:        boolean;             // true = envoyé au serveur avec succès
}

// ── Tournée complète ───────────────────────────────────────────────────────────

export type StatutTour = 'pending' | 'active' | 'completed';

export interface Tour {
  id:           string;
  tourId:       string;          // ID backend (ex : "TOUR-2026-001")
  chauffeurId:  string;
  dateDebut:    number;          // Timestamp (ms)
  statut:       StatutTour;
  etapes:       EtapeLivraison[];
  syncedAt?:    number;          // Dernier timestamp de sync serveur
  rawManifest:  string;          // Snapshot JSON complet reçu du backend
}

// ── File d'attente de sync ─────────────────────────────────────────────────────

export type TypeOperation = 'DELIVERY_CONFIRM' | 'GPS_BATCH' | 'ROAD_ALERT';

export type StatutOperation = 'pending' | 'processing' | 'failed';

export interface OperationSync {
  id:          string;
  type:        TypeOperation;
  payload:     string;           // JSON sérialisé
  createdAt:   number;
  retryCount:  number;
  statut:      StatutOperation;
  erreur?:     string;
  nextRetryAt?: number;          // Timestamp du prochain essai (backoff)
}

// ── Payload de confirmation de livraison ───────────────────────────────────────

export interface PayloadConfirmLivraison {
  tour_id:         string;
  douar_id:        string;
  statut:          StatutEtape;
  articles_livres: ArticleLivraison[];
  confirmed_at:    number;
  gps?:            { lat: number; lng: number };
  note_chauffeur?: string;
  photo_url?:      string;       // URL après upload S3/MinIO
  signature_b64?:  string;
}

// ── Payload GPS batch ──────────────────────────────────────────────────────────

export interface PointGPS {
  lat:         number;
  lng:         number;
  accuracy:    number;
  recorded_at: number;
}

export interface PayloadGPSBatch {
  tour_id: string;
  points:  PointGPS[];
}

// ── Alerte terrain ─────────────────────────────────────────────────────────────

export type TypeAlerte = 'ROAD_BLOCKED' | 'LANDSLIDE' | 'BRIDGE_DAMAGED' | 'OTHER';

export interface PayloadAlerte {
  type:        TypeAlerte;
  douar_id?:   string;
  description: string;
  gps:         { lat: number; lng: number };
  reported_at: number;
}

// ── Manifest reçu du backend ───────────────────────────────────────────────────

export interface TourManifest {
  tour_id:    string;
  driver_id:  string;
  date:       string;      // ISO date
  stops: Array<{
    douar_id:        string;
    douar_name:      string;
    sequence_order:  number;
    distance_km:     number;
    eta_minutes:     number;
    latitude:        number;
    longitude:       number;
    priority:        DouarPriorite;
    topsis_score:    number;
    planned_items:   ArticleLivraison[];
  }>;
}
