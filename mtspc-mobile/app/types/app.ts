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
  id:             string;
  materielNom:    string;
  categorie:      'TENTE' | 'EAU' | 'MEDICAMENT' | 'NOURRITURE' | 'EQUIPEMENT' | 'AUTRE';
  quantitePrevue: number;
  quantiteLivree: number | null;
  unite:          string;
}

/** Structure principale d'une mission — compatible avec le backend NestJS */
export interface Mission {
  id:              string;
  numeroMission:   string;

  // Remplace "clientName" de labcollect-mobile
  entrepotNom:     string;
  entrepotId:      string;

  // Destination (zone sinistrée)
  destinationNom:  string;
  destinationLat:  number | null;
  destinationLng:  number | null;
  destinationAdresse?: string;

  // Remplace "sampleCount" de labcollect-mobile : inventaire logistique
  items:           MissionItem[];
  tentes:          number;   // Raccourci calculé : somme des items catégorie TENTE
  medicaments:     number;   // Raccourci calculé : somme des items catégorie MEDICAMENT
  eau:             number;   // Raccourci calculé : somme des items catégorie EAU

  statut:          MissionStatut;
  priorite:        MissionPriorite;
  dateEcheance:    string;
  notes?:          string;
  createdAt:       string;
}

/** Payload envoyé au backend lors d'une synchronisation hors-ligne */
export interface PendingSubmission {
  missionId:        string;
  statut:           'completed';
  commentaireTerrain?: string;
  livraisonLat?:    number;
  livraisonLng?:    number;
  timestampLocal:   string;   // ISO — horodatage de validation en mode hors-ligne
  tentativeSync:    number;   // Nombre de tentatives de sync (pour debug jury)
}

export interface AuthUser {
  userId:   string;
  username: string;
  email:    string;
  roles:    string[];
}
