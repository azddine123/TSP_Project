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
  MOCK_CRISES,
  MOCK_DOUBLES,
  MOCK_USERS,
} from '../mock';

import type { Mission, CreateCriseDto, Crise, DouarSeverite, AdminEntrepot, SupervisionSnapshot, CreateAdminEntrepotDto, UpdateAdminStatutDto, PipelineResult, RunPipelineDto, AhpResult, TopsisRanking, VrpTournee, VrpEtape, Evenement, CreateEvenementDto, EvenementsResponse } from '../types';

// Flag pour activer/désactiver les mocks
export const USE_MOCK_DATA = true;

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
    return Promise.resolve([...MOCK_CRISES]);
  },

  getActives: async (): Promise<Crise[]> => {
    await delay(400);
    return Promise.resolve(MOCK_CRISES.filter(c => c.statut === 'active'));
  },

  create: async (dto: CreateCriseDto): Promise<Crise> => {
    await delay(700);
    const newCrise: Crise = {
      id: `crise-${Date.now()}`,
      reference: `CRISE-2026-${String(MOCK_CRISES.length + 1).padStart(3, '0')}`,
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
          id: `sev-${Date.now()}-${s.douarId}`,
          criseId: `crise-${Date.now()}`,
          douar,
          severite: s.severite,
          vulnerabilite: s.vulnerabilite,
          accessibilite: s.accessibilite,
          accesSoins: s.accesSoins,
        };
      }),
    };
    MOCK_CRISES.push(newCrise);
    return Promise.resolve(newCrise);
  },

  updateStatut: async (id: string, statut: Crise['statut']): Promise<Crise> => {
    await delay(400);
    const crise = MOCK_CRISES.find(c => c.id === id);
    if (!crise) throw new Error(`Crise ${id} non trouvée`);
    crise.statut = statut;
    if (statut === 'cloturee') crise.clotureeAt = new Date().toISOString();
    return Promise.resolve({ ...crise });
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

export const mockUsersApi = {
  getAdmins: async (): Promise<AdminEntrepot[]> => {
    await delay(500);
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
    };
    mockUsersStore.push(newUser);
    return Promise.resolve(newUser);
  },

  updateStatut: async (id: string, dto: UpdateAdminStatutDto): Promise<AdminEntrepot> => {
    await delay(400);
    const user = mockUsersStore.find(u => u.id === id);
    if (!user) throw new Error(`Utilisateur ${id} non trouvé`);
    user.enabled = dto.enabled;
    return Promise.resolve({ ...user });
  },

  delete: async (id: string): Promise<void> => {
    await delay(400);
    const idx = mockUsersStore.findIndex(u => u.id === id);
    if (idx !== -1) mockUsersStore.splice(idx, 1);
  },

  resetPassword: async (_id: string): Promise<void> => {
    await delay(600);
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

const pipelineHistory: PipelineResult[] = [];

export const mockAlgoApi = {
  runPipeline: async (dto: RunPipelineDto): Promise<PipelineResult> => {
    await delay(1200);

    const ahp = computeAhp(dto.ahpMatrice.comparaisons);
    const crise = MOCK_CRISES.find(c => c.id === dto.criseId);

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

    // VRP: distribute top douars across entrepots
    const tournees: VrpTournee[] = MOCK_ENTREPOTS.map((ent, ei) => {
      const slice = classement.filter((_, i) => i % MOCK_ENTREPOTS.length === ei).slice(0, 5);
      const etapes: VrpEtape[] = slice.map((r, oi) => {
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
      const dist = Math.round(40 + Math.random() * 80);
      const temps = Math.round(dist * 1.8);
      return {
        entrepotId:       ent.id,
        entrepotNom:      ent.nom,
        vehiculeCapacite: dto.contraintesVehicules.find(v => v.entrepotId === ent.id)?.capacite ?? 1000,
        etapes,
        distanceTotale:   dist,
        tempsEstime:      temps,
        scoreZ:           dto.lambdas.distance * dist + dto.lambdas.temps * temps - dto.lambdas.couverture * etapes.length * 10,
      };
    });

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
    pipelineHistory.unshift(result);
    return result;
  },

  getHistory: async (criseId: string): Promise<PipelineResult[]> => {
    await delay(300);
    return pipelineHistory.filter(r => r.criseId === criseId);
  },

  getStatus: async (pipelineId: string): Promise<PipelineResult> => {
    await delay(200);
    const r = pipelineHistory.find(p => p.id === pipelineId);
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
