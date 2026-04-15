/**
 * MISSION SERVICE — Appels API vers le Backend NestJS
 * ====================================================
 * Le distributeur travaille avec des TOURNÉES (routes VRP) — pas des Missions.
 * Ce service appelle GET /tournees/distributeur/mine et mappe le résultat
 * vers les types Mission/Tournee attendus par home.tsx et mission-detail.tsx.
 *
 * MODE MOCK: USE_MOCK_DATA = true → données de test (pas de backend requis)
 *            USE_MOCK_DATA = false → appels API réels (Keycloak + NestJS requis)
 */
import * as SecureStore from 'expo-secure-store';
import type { Mission, Tournee, EtapeVRP, MissionStatut, NiveauPriorite } from '../types/app';
import { API_BASE_URL } from '../config/keycloakConfig';
import { getMockMissions, getMockMissionById } from '../mock/missions';
import { getMockTourneeByMissionId } from '../mock/tournees';

const TOKEN_KEY = 'reliefchain_access_token';

/**
 * MODE DÉVELOPPEMENT: Mettre à false pour utiliser l'API réelle.
 * true → données de test sans backend ; false → NestJS + Keycloak requis.
 */
export const USE_MOCK_DATA = true; // ← Modifier à false pour le vrai backend

// ── Utilitaire fetch authentifié ──────────────────────────────────────────────

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) {
    console.warn('[Auth] Aucun token trouvé — connexion requise');
    throw new Error('AUTH_REQUIRED');
  }
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
}

// ── Types du backend (réponse JSON brute) ─────────────────────────────────────

interface BackendRessources {
  tentes: number;
  couvertures: number;
  vivres: number;
  kits_med: number;
  eau_litres: number;
}

interface BackendEtape {
  id: string;
  ordre: number;
  statut: string;
  douarId: string;
  douar?: { nom: string; commune?: string; province?: string };
  latitude: number | null;
  longitude: number | null;
  population: number | null;
  menages: number | null;
  scoreTopsis: number | null;
  ressources: BackendRessources | null;
}

interface BackendTournee {
  id: string;
  criseId: string;
  entrepotId: string;
  entrepot?: { id: string; nom: string; province?: string };
  distributeurId: string | null;
  statut: string;
  distanceTotale: number;
  tempsEstime: number;
  ressourcesTotales: BackendRessources | null;
  etapes: BackendEtape[];
  createdAt: string;
}

// ── Fonctions de mapping ───────────────────────────────────────────────────────

function mapStatutToMission(s: string): MissionStatut {
  const table: Record<string, MissionStatut> = {
    planifiee: 'pending',
    en_cours:  'in_progress',
    terminee:  'completed',
    annulee:   'annulee',
  };
  return table[s] ?? 'pending';
}

function mapStatutToTournee(s: string): 'assignee' | 'en_cours' | 'terminee' {
  if (s === 'en_cours') return 'en_cours';
  if (s === 'terminee') return 'terminee';
  return 'assignee';
}

function scoreToPriorite(score: number | null): NiveauPriorite {
  if (score === null) return 'MOYENNE';
  if (score >= 0.75)  return 'CRITIQUE';
  if (score >= 0.50)  return 'HAUTE';
  if (score >= 0.25)  return 'MOYENNE';
  return 'BASSE';
}

/**
 * Convertit une tournée backend en objet Mission pour home.tsx
 * (liste des missions du distributeur).
 */
function backendTourneeToMission(t: BackendTournee): Mission {
  const etapesSorted = [...t.etapes].sort((a, b) => a.ordre - b.ordre);
  const firstEtape   = etapesSorted[0];
  const res          = t.ressourcesTotales;

  return {
    id:              t.id,
    numeroMission:   `TRN-${t.id.slice(0, 8).toUpperCase()}`,
    entrepotNom:     t.entrepot?.nom ?? t.entrepotId,
    entrepotId:      t.entrepotId,
    destinationNom:  firstEtape?.douar?.nom ?? `Tournée (${t.etapes.length} douars)`,
    destinationLat:  firstEtape?.latitude  ?? null,
    destinationLng:  firstEtape?.longitude ?? null,
    items: res ? [
      { id: 'tentes',      materielNom: 'Tentes familiales',   quantitePrevue: res.tentes,      unite: 'unité',  categorie: 'TENTE'      },
      { id: 'couvertures', materielNom: 'Couvertures',          quantitePrevue: res.couvertures, unite: 'unité',  categorie: 'EQUIPEMENT' },
      { id: 'vivres',      materielNom: 'Kits alimentaires',    quantitePrevue: res.vivres,      unite: 'kit',    categorie: 'NOURRITURE' },
      { id: 'kits_med',    materielNom: 'Kits médicaux',        quantitePrevue: res.kits_med,    unite: 'kit',    categorie: 'MEDICAMENT' },
      { id: 'eau',         materielNom: 'Eau potable',          quantitePrevue: res.eau_litres,  unite: 'litres', categorie: 'EAU'        },
    ] : [],
    tentes: res?.tentes ?? 0,
    eau:    res?.eau_litres ?? 0,
    statut:       mapStatutToMission(t.statut),
    priorite:     'high',
    dateEcheance: t.createdAt,
    dateCreation: t.createdAt,
    createdAt:    t.createdAt,
    description:  `${t.etapes.length} douars · ${Math.round(t.distanceTotale)} km · Crise ${t.criseId.slice(0, 8)}`,
  };
}

/**
 * Convertit une tournée backend en objet Tournee pour mission-detail.tsx
 * (carte, étapes, ressources à décharger par douar).
 */
function backendTourneeToTournee(t: BackendTournee): Tournee {
  const etapesSorted = [...t.etapes].sort((a, b) => a.ordre - b.ordre);
  const n = etapesSorted.length || 1;

  const etapes: EtapeVRP[] = etapesSorted.map((e) => ({
    ordre:          e.ordre,
    etapeId:        e.id,
    douarId:        e.douarId,
    douarNom:       e.douar?.nom ?? e.douarId,
    lat:            e.latitude  ?? 0,
    lng:            e.longitude ?? 0,
    // Distance et temps par étape : répartition uniforme du total si non stockés
    distanceKm:     parseFloat((t.distanceTotale / n).toFixed(1)),
    tempsEstimeMin: Math.round(t.tempsEstime / n),
    priorite:       scoreToPriorite(e.scoreTopsis),
    scoreTopsis:    e.scoreTopsis ?? 0,
    population:     e.population ?? 0,
    ressources:     e.ressources ?? { tentes: 0, couvertures: 0, vivres: 0, kits_med: 0, eau_litres: 0 },
  }));

  return {
    id:                  t.id,
    missionId:           t.id,   // tournée = mission dans ce contexte
    entrepotId:          t.entrepotId,
    vehiculeId:          '',     // non stocké sur l'entité Tournee côté backend
    distanceTotaleKm:    t.distanceTotale,
    tempsEstimeTotalMin: t.tempsEstime,
    etapes,
    statut: mapStatutToTournee(t.statut),
    criseId: t.criseId,
  };
}

// ── Service exporté ───────────────────────────────────────────────────────────

export const missionService = {
  /**
   * Récupère les tournées assignées au distributeur connecté.
   * Mode mock → mock/missions.ts  |  Mode réel → GET /tournees/distributeur/mine
   */
  async getAllMissions(): Promise<Mission[]> {
    if (USE_MOCK_DATA) {
      console.log('[MOCK] Chargement des missions de test...');
      return getMockMissions();
    }
    const res = await authFetch('/tournees/distributeur/mine');
    if (!res.ok) {
      if (res.status === 401) throw new Error('AUTH_REQUIRED');
      throw new Error(`Erreur API ${res.status}`);
    }
    const tournees: BackendTournee[] = await res.json();
    return tournees.map(backendTourneeToMission);
  },

  /**
   * Récupère le détail d'une tournée/mission par son ID.
   * Mode mock → mock/missions.ts  |  Mode réel → GET /tournees/:id
   */
  async getMissionById(id: string): Promise<Mission> {
    if (USE_MOCK_DATA) {
      console.log(`[MOCK] Chargement de la mission ${id}...`);
      const mission = await getMockMissionById(id);
      if (!mission) throw new Error('Mission introuvable');
      return mission;
    }
    const res = await authFetch(`/tournees/${id}`);
    if (!res.ok) throw new Error(`Mission introuvable : ${res.status}`);
    const t: BackendTournee = await res.json();
    return backendTourneeToMission(t);
  },

  /**
   * Met à jour le statut d'une tournée.
   * Mode réel : in_progress → PATCH /tournees/:id/demarrer
   */
  async updateStatut(id: string, statut: string): Promise<void> {
    if (USE_MOCK_DATA) {
      console.log(`[MOCK] Mise à jour statut mission ${id} → ${statut}`);
      return Promise.resolve();
    }
    if (statut === 'in_progress') {
      const res = await authFetch(`/tournees/${id}/demarrer`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`Erreur démarrage tournée : ${res.status}`);
    }
    // 'completed' : géré étape par étape via updateEtapeStatut
  },

  /**
   * Signale une route bloquée vers un douar.
   * Mode réel → PATCH /tournees/:tourneeId/etapes/:etapeId/route-bloquee
   */
  async signalerRouteBloquee(
    tourneeId: string,
    etapeId: string,
    commentaire: string = '',
  ): Promise<void> {
    if (USE_MOCK_DATA) {
      console.log(`[MOCK] Route bloquée — tournée ${tourneeId}, étape ${etapeId}`);
      return Promise.resolve();
    }
    const res = await authFetch(
      `/tournees/${tourneeId}/etapes/${etapeId}/route-bloquee`,
      { method: 'PATCH', body: JSON.stringify({ commentaire }) },
    );
    if (!res.ok) throw new Error(`Erreur signalement route bloquée : ${res.status}`);
  },

  /**
   * Récupère la tournée VRP complète pour une mission (même ID).
   * Mode mock → mock/tournees.ts  |  Mode réel → GET /tournees/:id
   */
  async getTourneeByMissionId(tourneeId: string): Promise<Tournee | null> {
    if (USE_MOCK_DATA) {
      console.log(`[MOCK] Chargement de la tournée ${tourneeId}...`);
      return getMockTourneeByMissionId(tourneeId);
    }
    const res = await authFetch(`/tournees/${tourneeId}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Erreur récupération tournée : ${res.status}`);
    }
    const t: BackendTournee = await res.json();
    return backendTourneeToTournee(t);
  },

  /**
   * Met à jour le statut d'une étape (en_route → livree / echec).
   * Mode réel → PATCH /tournees/:tourneeId/etapes/:etapeId/statut
   */
  async updateEtapeStatut(
    tourneeId: string,
    etapeId: string,
    statut: 'en_route' | 'livree' | 'echec',
  ): Promise<void> {
    if (USE_MOCK_DATA) {
      console.log(`[MOCK] Étape ${etapeId} → ${statut}`);
      return Promise.resolve();
    }
    const res = await authFetch(
      `/tournees/${tourneeId}/etapes/${etapeId}/statut`,
      { method: 'PATCH', body: JSON.stringify({ statut }) },
    );
    if (!res.ok) throw new Error(`Erreur mise à jour étape : ${res.status}`);
  },
};
