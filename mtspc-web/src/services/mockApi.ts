/**
 * MOCK API SERVICE
 * ================
 * Simulation des appels API pour le développement
 * Active avec USE_MOCK_DATA = true
 */

import {
  MOCK_MISSIONS,
  MOCK_TOURNEES,
  MOCK_STOCK,
  MOCK_ADMIN_MISSIONS,
  MOCK_ENTREPOTS,
  MOCK_AUDIT_LOGS,
  MOCK_VEHICULES,
  MOCK_DISTRIBUTEURS,
  MOCK_DOUBLES,
  MOCK_USERS,
} from '../mock';
import { ENTREPOT_A, DISTRIBUTEURS_ENTREPOT_A } from '../mock/entrepotA';
import { tourneesStore, crisesStore, vrpTourneeToAdminTournee, broadcastTourneesUpdate } from '../mock/store';

import type { Mission, CreateCriseDto, Crise, DouarSeverite, AdminEntrepot, SupervisionSnapshot, CreateAdminEntrepotDto, UpdateAdminStatutDto, PipelineResult, RunPipelineDto, AhpResult, TopsisRanking, VrpTournee, VrpEtape, Evenement, CreateEvenementDto, EvenementsResponse } from '../types';

// Flag pour activer/désactiver les mocks
// true par défaut → aucun backend requis en dev
// Mettre VITE_USE_MOCK=false dans .env pour utiliser le vrai backend
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK !== 'false';

// Simulation de délai réseau
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// API MISSIONS
// ============================================================================

export const missionApi = {
  getAll: async () => {
    await delay(500);
    return Promise.resolve([...MOCK_MISSIONS]);
  },
  
  getById: async (id: string) => {
    await delay(400);
    const mission = MOCK_MISSIONS.find(m => m.id === id);
    if (!mission) {
      throw new Error(`Mission ${id} non trouvée`);
    }
    return Promise.resolve(mission);
  },
  
  create: async (data: Partial<Mission> | Record<string, unknown>) => {
    await delay(600);
    const newMission: Mission = {
      id: `mission-${Date.now()}`,
      numeroMission: `MS-2026-${String(MOCK_MISSIONS.length + 1).padStart(3, '0')}`,
      statut: 'pending',
      priorite: 'medium',
      createdAt: new Date().toISOString(),
      dateEcheance: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      destinationNom: (data as Partial<Mission>).destinationNom || 'Nouvelle destination',
      ...data as Partial<Mission>,
    };
    return Promise.resolve(newMission);
  },
  
  update: async (id: string, data: Partial<Mission>) => {
    await delay(500);
    return Promise.resolve({ id, ...data });
  },
};

// ============================================================================
// API TOURNÉES (VRP)
// ============================================================================

export const tourneeApi = {
  getByMissionId: async (missionId: string) => {
    await delay(600);
    const tournee = MOCK_TOURNEES[missionId];
    if (!tournee) {
      throw new Error(`Tournée pour mission ${missionId} non trouvée`);
    }
    return Promise.resolve(tournee);
  },

  /** Retourne toutes les tournées du store (ENTREPOT_A uniquement en mock) */
  getMine: async () => {
    await delay(300);
    return Promise.resolve(tourneesStore.getAll());
  },

  /** Affecter un distributeur à une tournée */
  assigner: async (id: string, dto: { distributeurId: string }) => {
    await delay(400);
    const dist = DISTRIBUTEURS_ENTREPOT_A.find(d => d.id === dto.distributeurId);
    const patch = {
      distributeurId: dto.distributeurId,
      distributeur: dist ? { id: dist.id, nom: dist.nom, prenom: dist.prenom } : null,
    };
    tourneesStore.update(id, patch);
    return Promise.resolve({ ...tourneesStore.getById(id), ...patch });
  },

  /** Démarrer une tournée planifiée → en_cours */
  demarrer: async (id: string) => {
    await delay(400);
    const patch = { statut: 'en_cours', demarreeAt: new Date().toISOString() };
    tourneesStore.update(id, patch);
    return Promise.resolve({ ...tourneesStore.getById(id), ...patch });
  },

  /** Annuler une tournée */
  annuler: async (id: string) => {
    await delay(400);
    const patch = { statut: 'annulee' };
    tourneesStore.update(id, patch);
    return Promise.resolve({ ...tourneesStore.getById(id), ...patch });
  },

  updateEtape: async (tourneeId: string, etapeOrdre: number, data: { statut: string; heureArrivee?: string }) => {
    await delay(400);
    return Promise.resolve({ tourneeId, etapeOrdre, ...data });
  },

  start: async (tourneeId: string) => {
    await delay(500);
    return Promise.resolve({ id: tourneeId, statut: 'en_cours', dateDebut: new Date().toISOString() });
  },

  complete: async (tourneeId: string) => {
    await delay(500);
    return Promise.resolve({ id: tourneeId, statut: 'terminee', dateFin: new Date().toISOString() });
  },
};

// ============================================================================
// API STOCK (Admin)
// ============================================================================

export const stockApi = {
  getAll: async () => {
    await delay(500);
    return Promise.resolve([...MOCK_STOCK]);
  },
  
  getByEntrepot: async (entrepotId: string) => {
    await delay(400);
    return Promise.resolve(MOCK_STOCK.filter(s => s.entrepot.nom.toLowerCase().includes(entrepotId.toLowerCase())));
  },
  
  getAlertes: async () => {
    await delay(400);
    return Promise.resolve(MOCK_STOCK.filter(s => s.quantite <= s.seuilAlerte));
  },
  
  updateQuantite: async (stockId: string, quantite: number) => {
    await delay(500);
    return Promise.resolve({ id: stockId, quantite });
  },
};

// ============================================================================
// API ADMIN MISSIONS (avec distributeurs)
// ============================================================================

export const adminMissionApi = {
  getAll: async () => {
    await delay(500);
    return Promise.resolve([...MOCK_ADMIN_MISSIONS]);
  },
  
  getActives: async () => {
    await delay(400);
    return Promise.resolve(MOCK_ADMIN_MISSIONS.filter(m => m.statut === 'in_progress' || m.statut === 'pending'));
  },
};

// ============================================================================
// API ENTREPÔTS (SuperAdmin)
// ============================================================================

export const entrepotApi = {
  getAll: async () => {
    await delay(600);
    return Promise.resolve([...MOCK_ENTREPOTS]);
  },
  
  getById: async (id: string) => {
    await delay(400);
    const entrepot = MOCK_ENTREPOTS.find(e => e.id === id);
    if (!entrepot) {
      throw new Error(`Entrepôt ${id} non trouvé`);
    }
    return Promise.resolve(entrepot);
  },
  
  getActifs: async () => {
    await delay(400);
    return Promise.resolve(MOCK_ENTREPOTS.filter(e => e.statut === 'actif'));
  },
  
  getEnSurcharge: async () => {
    await delay(400);
    return Promise.resolve(MOCK_ENTREPOTS.filter(e => e.statut === 'surcharge'));
  },
};

// ============================================================================
// API AUDIT LOGS (SuperAdmin)
// ============================================================================

export const auditApi = {
  getLogs: async (params?: { page?: number; limit?: number; operation?: string }) => {
    await delay(700);
    let logs = [...MOCK_AUDIT_LOGS];
    
    if (params?.operation) {
      logs = logs.filter(l => l.operation === params.operation);
    }
    
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return Promise.resolve({
      data: logs.slice(start, end),
      meta: { 
        total: logs.length,
        page,
        limit,
        totalPages: Math.ceil(logs.length / limit),
      },
    });
  },
  
  getByTable: async (table: string) => {
    await delay(500);
    return Promise.resolve(MOCK_AUDIT_LOGS.filter(l => l.tableCible === table));
  },
};

// ============================================================================
// API VÉHICULES
// ============================================================================

export const vehiculeApi = {
  getAll: async () => {
    await delay(500);
    return Promise.resolve([...MOCK_VEHICULES]);
  },
  
  getDisponibles: async () => {
    await delay(400);
    return Promise.resolve(MOCK_VEHICULES.filter(v => v.statut === 'disponible'));
  },
  
  getEnMission: async () => {
    await delay(400);
    return Promise.resolve(MOCK_VEHICULES.filter(v => v.statut === 'en_mission'));
  },
};

// ============================================================================
// API DISTRIBUTEURS
// ============================================================================

export const distributeurApi = {
  getAll: async () => {
    await delay(500);
    return Promise.resolve([...MOCK_DISTRIBUTEURS]);
  },

  /** Retourne les distributeurs de l'entrepôt (en mock, toujours ENTREPOT_A) */
  getByEntrepot: async (_entrepotId: string) => {
    await delay(200);
    return Promise.resolve([...DISTRIBUTEURS_ENTREPOT_A]);
  },

  getDisponibles: async () => {
    await delay(400);
    return Promise.resolve(MOCK_DISTRIBUTEURS.filter(d => d.statut === 'disponible'));
  },

  getEnMission: async () => {
    await delay(400);
    return Promise.resolve(MOCK_DISTRIBUTEURS.filter(d => d.statut === 'en_mission'));
  },
};

// ============================================================================
// API CRISES
// ============================================================================

export const criseApi = {
  getAll: async (): Promise<Crise[]> => {
    await delay(600);
    return [...crisesStore.getAll()];
  },

  getActives: async (): Promise<Crise[]> => {
    await delay(400);
    return [...crisesStore.getActive()];
  },

  create: async (dto: CreateCriseDto): Promise<Crise> => {
    await delay(700);
    const id = `crise-${Date.now()}`;
    const newCrise: Crise = {
      id,
      reference: `CRISE-2026-${String(crisesStore.getAll().length + 1).padStart(3, '0')}`,
      type: dto.type,
      zone: dto.zone,
      description: dto.description ?? null,
      statut: 'active',
      declencheParId: 'superadmin-1',
      declencheParUsername: 'superadmin',
      createdAt: new Date().toISOString(),
      clotureeAt: null,
      severitesParDouar: dto.severitesParDouar.map((s): DouarSeverite => {
        const douar = MOCK_DOUBLES.find(d => d.id === s.douarId)!;
        return {
          id: `sev-${id}-${s.douarId}`,
          criseId: id,
          douar,
          severite: s.severite,
          vulnerabilite: s.vulnerabilite,
          accessibilite: s.accessibilite,
          accesSoins: s.accesSoins,
        };
      }),
    };
    crisesStore.add(newCrise);
    return newCrise;
  },

  updateStatut: async (id: string, statut: Crise['statut']): Promise<Crise> => {
    await delay(400);
    crisesStore.updateStatut(id, statut);
    const updated = crisesStore.getAll().find(c => c.id === id);
    if (!updated) throw new Error(`Crise ${id} non trouvée`);
    return { ...updated };
  },
};

// ============================================================================
// API DOUARS
// ============================================================================

export const douarApi = {
  getAll: async () => {
    await delay(600);
    return Promise.resolve([...MOCK_DOUBLES]);
  },

  getByProvince: async (province: string) => {
    await delay(400);
    return Promise.resolve(MOCK_DOUBLES.filter(d => d.province.toLowerCase() === province.toLowerCase()));
  },
};

// ============================================================================
// API UTILISATEURS (mock)
// ============================================================================

const mockUsersStore: AdminEntrepot[] = [...MOCK_USERS];

// Canal BroadcastChannel pour synchronisation temps-réel des utilisateurs entre onglets
let _usersBroadcast: BroadcastChannel | null = null;
function getUsersBroadcast(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!_usersBroadcast) _usersBroadcast = new BroadcastChannel('najda_users');
  return _usersBroadcast;
}

function appendAuditLog(entry: Omit<typeof MOCK_AUDIT_LOGS[0], 'id'>) {
  const nextId = MOCK_AUDIT_LOGS.length > 0
    ? Math.max(...MOCK_AUDIT_LOGS.map(l => l.id)) + 1
    : 1;
  MOCK_AUDIT_LOGS.push({ id: nextId, ...entry } as typeof MOCK_AUDIT_LOGS[0]);
}

export const mockUsersApi = {
  getAdmins: async (): Promise<AdminEntrepot[]> => {
    await delay(300);
    return Promise.resolve([...mockUsersStore]);
  },

  create: async (dto: CreateAdminEntrepotDto): Promise<AdminEntrepot> => {
    await delay(600);
    const newUser: AdminEntrepot = {
      id: `user-${Date.now()}`,
      username: dto.username,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      enabled: true,
      entrepotId: dto.entrepotId ?? null,
      createdAt: Date.now(),
      role: 'ADMIN_ENTREPOT',
    };
    mockUsersStore.push(newUser);
    // Audit
    appendAuditLog({
      operation: 'INSERT',
      tableCible: 'utilisateurs',
      recordId: newUser.id,
      acteurUserId: 'superadmin-1',
      acteurEmail: 'superadmin@najda.ma',
      acteurRole: 'SUPER_ADMIN',
      ipAddress: '10.0.0.15',
      valeursApres: { username: newUser.username, email: newUser.email, role: 'ADMIN_ENTREPOT', entrepotId: newUser.entrepotId },
      createdAt: new Date().toISOString(),
    });
    // Broadcast pour mise à jour temps-réel dans les autres onglets
    getUsersBroadcast()?.postMessage({ type: 'USER_CREATED', userId: newUser.id });
    return Promise.resolve(newUser);
  },

  updateStatut: async (id: string, dto: UpdateAdminStatutDto): Promise<AdminEntrepot> => {
    await delay(400);
    const user = mockUsersStore.find(u => u.id === id);
    if (!user) throw new Error(`Utilisateur ${id} non trouvé`);
    const prevEnabled = user.enabled;
    user.enabled = dto.enabled;
    // Audit
    appendAuditLog({
      operation: 'UPDATE',
      tableCible: 'utilisateurs',
      recordId: id,
      acteurUserId: 'superadmin-1',
      acteurEmail: 'superadmin@najda.ma',
      acteurRole: 'SUPER_ADMIN',
      ipAddress: '10.0.0.15',
      valeursApres: { username: user.username, enabled: dto.enabled, action: dto.enabled ? 'activation' : 'suspension' },
      createdAt: new Date().toISOString(),
    });
    getUsersBroadcast()?.postMessage({ type: 'USER_UPDATED', userId: id, prevEnabled });
    return Promise.resolve({ ...user });
  },

  delete: async (id: string): Promise<void> => {
    await delay(400);
    const idx = mockUsersStore.findIndex(u => u.id === id);
    const user = idx !== -1 ? mockUsersStore[idx] : null;
    if (idx !== -1) mockUsersStore.splice(idx, 1);
    if (user) {
      // Audit
      appendAuditLog({
        operation: 'DELETE',
        tableCible: 'utilisateurs',
        recordId: id,
        acteurUserId: 'superadmin-1',
        acteurEmail: 'superadmin@najda.ma',
        acteurRole: 'SUPER_ADMIN',
        ipAddress: '10.0.0.15',
        valeursApres: null,
        createdAt: new Date().toISOString(),
      });
      getUsersBroadcast()?.postMessage({ type: 'USER_DELETED', userId: id });
    }
  },

  resetPassword: async (id: string): Promise<void> => {
    await delay(600);
    const user = mockUsersStore.find(u => u.id === id);
    if (user) {
      appendAuditLog({
        operation: 'UPDATE',
        tableCible: 'utilisateurs',
        recordId: id,
        acteurUserId: 'superadmin-1',
        acteurEmail: 'superadmin@najda.ma',
        acteurRole: 'SUPER_ADMIN',
        ipAddress: '10.0.0.15',
        valeursApres: { username: user.username, action: 'reset_password' },
        createdAt: new Date().toISOString(),
      });
    }
    // En production: déclenche un email Keycloak de réinitialisation
  },
};

// ============================================================================
// API SUPERVISION (mock snapshot)
// ============================================================================

export const supervisionMockApi = {
  getSnapshot: async (): Promise<SupervisionSnapshot> => {
    await delay(300);
    const tauxParEntrepot: Record<string, number> = {
      'entrepot-1': 72, 'entrepot-2': 45,
    };
    const alertesParEntrepot: Record<string, number> = {
      'entrepot-1': 1, 'entrepot-2': 2,
    };
    return {
      timestamp: new Date().toISOString(),
      criseActive: {
        id: 'crise-001',
        reference: 'CRISE-2026-001',
        type: 'SEISME',
        zone: 'Province Azilal',
      },
      vehicules: MOCK_DISTRIBUTEURS
        .filter(d => d.statut === 'en_mission' && d.vehiculeAssigneId)
        .map(d => {
          const veh = MOCK_VEHICULES.find(v => v.id === d.vehiculeAssigneId);
          return {
            distributeurId: d.id,
            distributeurNom: `${d.prenom} ${d.nom}`,
            tourneeId: `tournee-${d.id}`,
            latitude: veh?.localisation?.lat ?? 32.2,
            longitude: veh?.localisation?.lng ?? -6.0,
            vitesse: Math.floor(Math.random() * 60) + 20,
            cap: Math.floor(Math.random() * 360),
            updatedAt: new Date().toISOString(),
          };
        }),
      stocksGlobal: MOCK_ENTREPOTS.map(e => ({
        entrepotId: e.id,
        entrepotNom: e.nom,
        province: e.province,
        tauxRemplissage: tauxParEntrepot[e.id] ?? 50,
        alertesCount: alertesParEntrepot[e.id] ?? 0,
      })),
      tourneeProgres: MOCK_ENTREPOTS.map((e, i) => ({
        tourneeId: `tournee-${i + 1}`,
        entrepotNom: e.nom,
        etapesTotal: 7,
        etapesLivrees: [3, 5][i],
        pourcentage: Math.round(([3, 5][i] / 7) * 100),
      })),
      alertesActives: [],
    };
  },
};

// ============================================================================
// API ÉVÉNEMENTS / INCIDENTS (mock)
// ============================================================================

const mockEvenementsStore: Evenement[] = [
  {
    id: 'ev-001',
    criseId: 'crise-001',
    type: 'ROUTE_BLOQUEE',
    severite: 'critical',
    titre: 'Route P1501 bloquée — glissement de terrain',
    description: 'La route reliant Azilal à Aït Attab est inaccessible suite à un glissement.',
    signaleParId: 'dist-001',
    signaleParNom: 'Ahmed Benali',
    tourneeId: null,
    douarId: null,
    statut: 'ouvert',
    createdAt: '2026-04-04T08:15:00Z',
    resolvedAt: null,
  },
  {
    id: 'ev-002',
    criseId: 'crise-001',
    type: 'RUPTURE_STOCK',
    severite: 'warning',
    titre: 'Stock couvertures insuffisant — Entrepôt Azilal',
    description: 'Quantité restante : 12 unités. Seuil critique : 50.',
    signaleParId: 'admin-1',
    signaleParNom: 'Hassan Bouyahya',
    tourneeId: null,
    douarId: null,
    statut: 'en_traitement',
    createdAt: '2026-04-04T10:30:00Z',
    resolvedAt: null,
  },
  {
    id: 'ev-003',
    criseId: 'crise-001',
    type: 'VEHICULE_PANNE',
    severite: 'warning',
    titre: 'Panne véhicule 54237-A-6',
    description: 'Crevaison sur piste. Distributeur en attente de secours.',
    signaleParId: 'dist-001',
    signaleParNom: 'Ahmed Benali',
    tourneeId: 'tournee-1',
    douarId: null,
    statut: 'resolu',
    createdAt: '2026-04-03T14:00:00Z',
    resolvedAt: '2026-04-03T16:30:00Z',
  },
];

export const mockEvenementApi = {
  getByCrise: async (criseId: string, page = 1, limit = 20): Promise<EvenementsResponse> => {
    await delay(400);
    const data = mockEvenementsStore.filter(e => e.criseId === criseId);
    const start = (page - 1) * limit;
    return Promise.resolve({
      data: data.slice(start, start + limit),
      meta: { total: data.length, page, totalPages: Math.ceil(data.length / limit) },
    });
  },

  getById: async (id: string): Promise<Evenement> => {
    await delay(200);
    const ev = mockEvenementsStore.find(e => e.id === id);
    if (!ev) throw new Error(`Événement ${id} non trouvé`);
    return Promise.resolve({ ...ev });
  },

  create: async (dto: CreateEvenementDto): Promise<Evenement> => {
    await delay(500);
    const newEv: Evenement = {
      id: `ev-${Date.now()}`,
      criseId: dto.criseId,
      type: dto.type,
      severite: dto.severite,
      titre: dto.titre,
      description: dto.description,
      signaleParId: 'superadmin-1',
      signaleParNom: 'SuperAdmin',
      tourneeId: dto.tourneeId ?? null,
      douarId: dto.douarId ?? null,
      statut: 'ouvert',
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };
    mockEvenementsStore.unshift(newEv);
    return Promise.resolve(newEv);
  },

  updateStatut: async (id: string, statut: Evenement['statut']): Promise<Evenement> => {
    await delay(300);
    const ev = mockEvenementsStore.find(e => e.id === id);
    if (!ev) throw new Error(`Événement ${id} non trouvé`);
    ev.statut = statut;
    if (statut === 'resolu') ev.resolvedAt = new Date().toISOString();
    return Promise.resolve({ ...ev });
  },

  sendAlert: async (): Promise<void> => {
    await delay(400);
  },
};

// ============================================================================
// API ALGORITHMES — AHP → TOPSIS → VRP (mock)
// ============================================================================

/** Compute approximate AHP weights via geometric mean (simplified). */
function computeAhp(c: RunPipelineDto['ahpMatrice']['comparaisons']): AhpResult {
  // Build 4x4 matrix rows for [vuln, sev, acc, soins]
  const m = [
    [1,           c.vuln_vs_sev,   c.vuln_vs_acc,   c.vuln_vs_soins],
    [1/c.vuln_vs_sev, 1,           c.sev_vs_acc,    c.sev_vs_soins ],
    [1/c.vuln_vs_acc, 1/c.sev_vs_acc, 1,            c.acc_vs_soins ],
    [1/c.vuln_vs_soins, 1/c.sev_vs_soins, 1/c.acc_vs_soins, 1     ],
  ];
  const gm = m.map(row => Math.pow(row.reduce((a, b) => a * b, 1), 0.25));
  const sum = gm.reduce((a, b) => a + b, 0);
  const w = gm.map(v => v / sum);
  // λmax ≈ sum of (Aw)_i / w_i
  const Aw = m.map(row => row.reduce((s, v, j) => s + v * w[j], 0));
  const lambdaMax = Aw.reduce((s, v, i) => s + v / w[i], 0) / 4;
  const ci = (lambdaMax - 4) / 3;
  const rc = ci / 0.9; // RI for n=4
  return {
    poids: { vulnerabilite: w[0], severite: w[1], accessibilite: w[2], accesSoins: w[3] },
    rc: Math.abs(rc),
    coherent: Math.abs(rc) < 0.1,
    lambdaMax,
  };
}

// ── Pipeline history — persisté en localStorage (survit HMR et multi-onglets) ──
const LS_PIPELINE = 'najda_mock_pipeline_history';
function readPipelineHistory(): PipelineResult[] {
  try {
    const raw = localStorage.getItem(LS_PIPELINE);
    if (raw) return JSON.parse(raw) as PipelineResult[];
  } catch { /* ignore */ }
  return [];
}
function writePipelineHistory(list: PipelineResult[]) {
  try { localStorage.setItem(LS_PIPELINE, JSON.stringify(list)); } catch { /* quota */ }
}

export const mockAlgoApi = {
  runPipeline: async (dto: RunPipelineDto): Promise<PipelineResult> => {
    await delay(1200);

    const ahp = computeAhp(dto.ahpMatrice.comparaisons);
    // Utiliser crisesStore (pas MOCK_CRISES) pour inclure les crises créées dynamiquement
    const crise = crisesStore.getAll().find(c => c.id === dto.criseId);

    // TOPSIS: score each douar from severitesParDouar
    const sevDouars = crise?.severitesParDouar ?? [];
    const classement: TopsisRanking[] = sevDouars
      .map((s, idx) => {
        const rawScore =
          ahp.poids.vulnerabilite * (s.vulnerabilite / 5) +
          ahp.poids.severite      * (s.severite      / 5) +
          ahp.poids.accessibilite * ((5 - s.accessibilite) / 5) +
          ahp.poids.accesSoins    * ((5 - s.accesSoins)    / 5);
        const dPlus  = Math.sqrt(Math.pow(1 - rawScore, 2) + 0.01 * idx);
        const dMinus = Math.sqrt(Math.pow(rawScore,     2) + 0.01 * idx);
        const score  = dMinus / (dPlus + dMinus);
        return {
          douarId:  s.douar.id,
          douarNom: s.douar.nom,
          commune:  s.douar.commune,
          score,
          rang:     0,
          distances: { dPlus, dMinus },
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((r, i) => ({ ...r, rang: i + 1 }));

    // VRP: tous les douars prioritaires → une seule tournée
    // On prend le premier entrepôt de dto (= Entrepôt Régional Azilal, entrepot-1)
    // On force aussi entrepot-a pour que adminApi.ts le reconnaisse
    const targetEnt = dto.contraintesVehicules[0];
    const vrpEtapes: VrpEtape[] = classement.slice(0, 8).map((r, oi) => {
      const d = sevDouars.find(s => s.douar.id === r.douarId)?.douar;
      return {
        douarId:    r.douarId,
        douarNom:   r.douarNom,
        ordre:      oi + 1,
        latitude:   d?.latitude  ?? 32.0,
        longitude:  d?.longitude ?? -6.0,
        population: d?.population ?? 500,
      };
    });
    const dist  = Math.round(40 + Math.random() * 80);
    const temps = Math.round(dist * 1.8);
    const capacite = targetEnt?.capacite ?? 1000;
    const tournees: VrpTournee[] = vrpEtapes.length > 0 ? [{
      entrepotId:       ENTREPOT_A.id,   // 'entrepot-a' — référence de l'admin
      entrepotNom:      ENTREPOT_A.nom,
      vehiculeCapacite: capacite,
      etapes:           vrpEtapes,
      distanceTotale:   dist,
      tempsEstime:      temps,
      scoreZ:           dto.lambdas.distance * dist + dto.lambdas.temps * temps - dto.lambdas.couverture * vrpEtapes.length * 10,
    }] : [];

    const result: PipelineResult = {
      id:          `pipeline-${Date.now()}`,
      criseId:     dto.criseId,
      statut:      'completed',
      ahp,
      topsis: {
        classement,
        solutionIdealePlus: [1, 1, 0, 0],
        solutionIdealeNeg:  [0, 0, 1, 1],
      },
      tournees,
      executionMs:  Math.round(800 + Math.random() * 400),
      createdAt:    new Date().toISOString(),
      completedAt:  new Date().toISOString(),
      erreur:       null,
    };
    writePipelineHistory([result, ...readPipelineHistory()]);

    // ── Pont SuperAdmin → Admin Entrepôt ─────────────────────────────────────
    // Écriture DIRECTE dans localStorage — contourne tout module intermédiaire
    if (tournees.length > 0 && (tournees[0].etapes ?? []).length > 0) {
      const vrp = tournees[0];
      const tourneeId  = `tournee-vrp-${Date.now()}`;
      const missionNum = `MS-VRP-${new Date().getFullYear()}-001`;

      const etapesAdmin = (vrp.etapes ?? []).map((e: VrpEtape, i: number) => ({
        id:             `etape-${tourneeId}-${i + 1}`,
        ordre:          e.ordre ?? (i + 1),
        douarId:        e.douarId,
        douar:          { nom: e.douarNom, commune: '', province: '' },
        douarNom:       e.douarNom,
        lat:            e.latitude ?? 32.0,
        lng:            e.longitude ?? -6.0,
        distanceKm:     parseFloat((8 + Math.random() * 12).toFixed(1)),
        tempsEstimeMin: Math.floor(15 + Math.random() * 20),
        priorite:       i === 0 ? 'CRITIQUE' : i < 2 ? 'HAUTE' : 'MOYENNE',
        scoreTopsis:    parseFloat((0.9 - i * 0.1).toFixed(3)),
        population:     e.population ?? 300,
        menages:        Math.ceil((e.population ?? 300) / 5.5),
        statut:         'en_attente',
        ressources: {
          tentes:      Math.floor(Math.ceil((e.population ?? 300) / 5.5) * 0.6),
          couvertures: Math.ceil((e.population ?? 300) / 5.5) * 4,
          vivres:      Math.ceil((e.population ?? 300) / 5.5) * 2,
          kits_med:    Math.floor(Math.ceil((e.population ?? 300) / 5.5) * 0.3),
          eau_litres:  (e.population ?? 300) * 5,
        },
      }));

      // Calcul ressourcesTotales depuis les étapes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ressourcesTotales = etapesAdmin.reduce((acc: any, e: any) => ({
        tentes:      (acc.tentes      ?? 0) + (e.ressources?.tentes      ?? 0),
        couvertures: (acc.couvertures ?? 0) + (e.ressources?.couvertures ?? 0),
        vivres:      (acc.vivres      ?? 0) + (e.ressources?.vivres      ?? 0),
        kits_med:    (acc.kits_med    ?? 0) + (e.ressources?.kits_med    ?? 0),
        eau_litres:  (acc.eau_litres  ?? 0) + (e.ressources?.eau_litres  ?? 0),
      }), { tentes: 0, couvertures: 0, vivres: 0, kits_med: 0, eau_litres: 0 });

      const newAdminTournee = {
        id:                  tourneeId,
        missionId:           `mission-vrp-${tourneeId}`,
        missionNumero:       missionNum,
        entrepotId:          ENTREPOT_A.id,
        entrepot:            { id: ENTREPOT_A.id, nom: ENTREPOT_A.nom, province: ENTREPOT_A.province },
        vehiculeId:          null,
        distributeur:        null,
        distanceTotale:      vrp.distanceTotale ?? 0,
        tempsEstime:         vrp.tempsEstime ?? 0,
        tempsEstimeTotalMin: vrp.tempsEstime ?? 0,
        statut:              'planifiee',
        criseId:             dto.criseId,
        createdAt:           new Date().toISOString(),
        datePlanification:   new Date().toISOString(),
        etapes:              etapesAdmin,
        ressourcesTotales,
        _fromPipeline:       true,
      };

      // Écriture double : mémoire partagée (même onglet) + localStorage (cross-onglets)
      // 1. Via tourneesStore — met à jour le cache mémoire du module store.ts
      {
        const current = tourneesStore.getAll().filter((t: any) => !(t._fromPipeline && t.criseId === dto.criseId));
        tourneesStore.set([...current, newAdminTournee]);
      }
      // 2. Écriture directe localStorage en fallback (si tourneesStore.set() a échoué à persister)
      try {
        const LS_KEY  = 'najda_mock_tournees';
        const existing: unknown[] = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
        const filtered = existing.filter((t: any) => !(t._fromPipeline && t.criseId === dto.criseId));
        localStorage.setItem(LS_KEY, JSON.stringify([...filtered, newAdminTournee]));
      } catch (_e) { /* localStorage indisponible */ }
      // 3. Broadcast cross-onglets (ne dépend pas de localStorage)
      broadcastTourneesUpdate();
    }

    return result;
  },

  getHistory: async (criseId: string): Promise<PipelineResult[]> => {
    await delay(300);
    return readPipelineHistory().filter(r => r.criseId === criseId);
  },

  getStatus: async (pipelineId: string): Promise<PipelineResult> => {
    await delay(200);
    const r = readPipelineHistory().find(p => p.id === pipelineId);
    if (!r) throw new Error(`Pipeline ${pipelineId} non trouvé`);
    return r;
  },
};

// ============================================================================
// EXPORT GLOBAL
// ============================================================================

const mockApi = {
  missionApi,
  tourneeApi,
  stockApi,
  adminMissionApi,
  entrepotApi,
  auditApi,
  vehiculeApi,
  distributeurApi,
  criseApi,
  douarApi,
  mockUsersApi,
  supervisionMockApi,
  mockAlgoApi,
  mockEvenementApi,
};

export default mockApi;
