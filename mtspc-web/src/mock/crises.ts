/**
 * MOCK DATA — Crises / Situations d'urgence
 * =========================================
 */

export interface Crise {
  id: string;
  nom: string;
  description: string;
  niveau: 'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE';
  statut: 'active' | 'resolue' | 'archivee';
  province: string;
  dateDebut: string;
  dateFin?: string;
  populationAffectee: number;
  nbMenagesAffectes: number;
  coordonnees?: {
    lat: number;
    lng: number;
  };
}

export const MOCK_CRISES: Crise[] = [
  {
    id: 'crise-001',
    nom: 'Séisme Azilal',
    description: 'Tremblement de terre de magnitude 5.2, dommages structurels dans plusieurs douars',
    niveau: 'CRITIQUE',
    statut: 'active',
    province: 'Azilal',
    dateDebut: '2026-03-15T08:30:00Z',
    populationAffectee: 3500,
    nbMenagesAffectes: 620,
    coordonnees: { lat: 31.9615, lng: -6.5717 },
  },
  {
    id: 'crise-002',
    nom: 'Inondations Fquih Ben Salah',
    description: 'Crues soudaines suite aux fortes pluies, accès coupés à plusieurs villages',
    niveau: 'HAUTE',
    statut: 'active',
    province: 'Fquih Ben Salah',
    dateDebut: '2026-03-28T14:00:00Z',
    populationAffectee: 1800,
    nbMenagesAffectes: 340,
    coordonnees: { lat: 32.5015, lng: -6.6915 },
  },
  {
    id: 'crise-003',
    nom: 'Glissement terrain Khénifra',
    description: 'Glissement de terrain mineur, 3 maisons endommagées',
    niveau: 'MOYENNE',
    statut: 'resolue',
    province: 'Khénifra',
    dateDebut: '2026-03-10T09:00:00Z',
    dateFin: '2026-03-20T16:00:00Z',
    populationAffectee: 45,
    nbMenagesAffectes: 8,
    coordonnees: { lat: 32.9369, lng: -5.6685 },
  },
  {
    id: 'crise-004',
    nom: 'Pénurie eau potable Béni Mellal',
    description: 'Rupture canalisation principale, distribution d\'eau d\'urgence',
    niveau: 'HAUTE',
    statut: 'active',
    province: 'Béni Mellal',
    dateDebut: '2026-04-02T06:00:00Z',
    populationAffectee: 2500,
    nbMenagesAffectes: 450,
    coordonnees: { lat: 32.3361, lng: -6.3498 },
  },
  {
    id: 'crise-005',
    nom: 'Tempête de sable Khouribga',
    description: 'Tempête de sable ayant endommagé les abris de plusieurs familles',
    niveau: 'BASSE',
    statut: 'archivee',
    province: 'Khouribga',
    dateDebut: '2026-02-20T11:00:00Z',
    dateFin: '2026-02-22T18:00:00Z',
    populationAffectee: 120,
    nbMenagesAffectes: 22,
    coordonnees: { lat: 32.8815, lng: -6.9063 },
  },
];
