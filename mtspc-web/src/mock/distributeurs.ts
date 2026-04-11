/**
 * MOCK DATA — Distributeurs
 * =========================
 */

export interface Distributeur {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  statut: 'disponible' | 'en_mission' | 'inactif';
  entrepotId: string;
  vehiculeAssigneId?: string;
  missionsCompletes: number;
}

export const MOCK_DISTRIBUTEURS: Distributeur[] = [
  {
    id: 'dist-001',
    prenom: 'Ahmed',
    nom: 'Benali',
    email: 'ahmed.benali@najda.ma',
    telephone: '+212 612 345 678',
    statut: 'en_mission',
    entrepotId: 'entrepot-1',
    vehiculeAssigneId: 'veh-001',
    missionsCompletes: 12,
  },
  {
    id: 'dist-002',
    prenom: 'Karim',
    nom: 'Idrissi',
    email: 'karim.idrissi@najda.ma',
    telephone: '+212 623 456 789',
    statut: 'en_mission',
    entrepotId: 'entrepot-2',
    vehiculeAssigneId: 'veh-004',
    missionsCompletes: 8,
  },
  {
    id: 'dist-003',
    prenom: 'Youssef',
    nom: 'Alaoui',
    email: 'youssef.alaoui@najda.ma',
    telephone: '+212 634 567 890',
    statut: 'disponible',
    entrepotId: 'entrepot-1',
    vehiculeAssigneId: 'veh-002',
    missionsCompletes: 15,
  },
  {
    id: 'dist-004',
    prenom: 'Mohammed',
    nom: 'Tazi',
    email: 'mohammed.tazi@najda.ma',
    telephone: '+212 645 678 901',
    statut: 'disponible',
    entrepotId: 'entrepot-2',
    vehiculeAssigneId: 'veh-003',
    missionsCompletes: 6,
  },
  {
    id: 'dist-005',
    prenom: 'Omar',
    nom: 'Fassi',
    email: 'omar.fassi@najda.ma',
    telephone: '+212 656 789 012',
    statut: 'inactif',
    entrepotId: 'entrepot-3',
    missionsCompletes: 3,
  },
];
