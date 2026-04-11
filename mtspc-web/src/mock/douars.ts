/**
 * MOCK DATA — Douars (villages) HCP 2024
 * ======================================
 * Données géographiques réelles des douars de Béni Mellal-Khénifra
 */

export interface Douar {
  id: string;
  codeGeo: string;
  nom: string;
  commune: string;
  province: string;
  region: string;
  nbMenages: number;
  population: number;
  coordonnees: {
    lat: number;
    lng: number;
  };
  accessibilite: 'piste_bitume' | 'piste_terre' | 'piste_difficile' | 'sentier';
  zoneVulnerable: boolean;
}

// Données douars HCP 2024 - Province d'Azilal
const DOUARS_AZILAL: Douar[] = [
  {
    id: 'douar-810301201001',
    codeGeo: '810301201001',
    nom: 'Aska',
    commune: 'Akdi n\'Lkhir',
    province: 'Azilal',
    region: 'Béni Mellal-Khénifra',
    nbMenages: 48,
    population: 264,
    coordonnees: { lat: 31.9523, lng: -6.5124 },
    accessibilite: 'piste_terre',
    zoneVulnerable: true,
  },
  {
    id: 'douar-810301202002',
    codeGeo: '810301202002',
    nom: 'Takout',
    commune: 'Akdi n\'Lkhir',
    province: 'Azilal',
    region: 'Béni Mellal-Khénifra',
    nbMenages: 36,
    population: 198,
    coordonnees: { lat: 31.9487, lng: -6.5089 },
    accessibilite: 'piste_terre',
    zoneVulnerable: true,
  },
  {
    id: 'douar-810302101003',
    codeGeo: '810302101003',
    nom: 'Ait Ouadrim',
    commune: 'Ait Abbas',
    province: 'Azilal',
    region: 'Béni Mellal-Khénifra',
    nbMenages: 42,
    population: 231,
    coordonnees: { lat: 32.0156, lng: -6.6345 },
    accessibilite: 'piste_terre',
    zoneVulnerable: false,
  },
  {
    id: 'douar-810302102004',
    codeGeo: '810302102004',
    nom: 'Tizguit',
    commune: 'Ait Abbas',
    province: 'Azilal',
    region: 'Béni Mellal-Khénifra',
    nbMenages: 28,
    population: 154,
    coordonnees: { lat: 32.0234, lng: -6.6289 },
    accessibilite: 'piste_difficile',
    zoneVulnerable: true,
  },
  {
    id: 'douar-810303101005',
    codeGeo: '810303101005',
    nom: 'Tighanimin',
    commune: 'Ait Bou Oulli',
    province: 'Azilal',
    region: 'Béni Mellal-Khénifra',
    nbMenages: 55,
    population: 302,
    coordonnees: { lat: 31.9876, lng: -6.7234 },
    accessibilite: 'sentier',
    zoneVulnerable: true,
  },
];

// Données douars HCP 2024 - Province Fquih Ben Salah
const DOUARS_FQUIH: Douar[] = [
  {
    id: 'douar-810502301006',
    codeGeo: '810502301006',
    nom: 'Ouled Bouazza',
    commune: 'Ouled Bourhmoun',
    province: 'Fquih Ben Salah',
    region: 'Béni Mellal-Khénifra',
    nbMenages: 78,
    population: 429,
    coordonnees: { lat: 32.4876, lng: -6.6789 },
    accessibilite: 'piste_terre',
    zoneVulnerable: true,
  },
  {
    id: 'douar-810502302007',
    codeGeo: '810502302007',
    nom: 'Ouled Haddou',
    commune: 'Ouled Bourhmoun',
    province: 'Fquih Ben Salah',
    region: 'Béni Mellal-Khénifra',
    nbMenages: 64,
    population: 352,
    coordonnees: { lat: 32.4934, lng: -6.6845 },
    accessibilite: 'piste_terre',
    zoneVulnerable: false,
  },
  {
    id: 'douar-810503101008',
    codeGeo: '810503101008',
    nom: 'Sidi Ameur',
    commune: 'Bni Chegdale',
    province: 'Fquih Ben Salah',
    region: 'Béni Mellal-Khénifra',
    nbMenages: 52,
    population: 286,
    coordonnees: { lat: 32.5567, lng: -6.7234 },
    accessibilite: 'piste_bitume',
    zoneVulnerable: false,
  },
  {
    id: 'douar-810503102009',
    codeGeo: '810503102009',
    nom: 'Lakhoualqa',
    commune: 'Bni Chegdale',
    province: 'Fquih Ben Salah',
    region: 'Béni Mellal-Khénifra',
    nbMenages: 45,
    population: 247,
    coordonnees: { lat: 32.5623, lng: -6.7189 },
    accessibilite: 'piste_terre',
    zoneVulnerable: true,
  },
];

// Données douars HCP 2024 - Province Béni Mellal
const DOUARS_BENI_MELLAL: Douar[] = [
  {
    id: 'douar-810103101010',
    codeGeo: '810103101010',
    nom: 'Ait Said Ichou',
    commune: 'Foum Oudi',
    province: 'Béni Mellal',
    region: 'Béni Mellal-Khénifra',
    nbMenages: 68,
    population: 374,
    coordonnees: { lat: 32.2987, lng: -6.4234 },
    accessibilite: 'piste_terre',
    zoneVulnerable: true,
  },
  {
    id: 'douar-810103102011',
    codeGeo: '810103102011',
    nom: 'Ait Lahcen',
    commune: 'Foum Oudi',
    province: 'Béni Mellal',
    region: 'Béni Mellal-Khénifra',
    nbMenages: 42,
    population: 231,
    coordonnees: { lat: 32.3034, lng: -6.4189 },
    accessibilite: 'piste_terre',
    zoneVulnerable: false,
  },
  {
    id: 'douar-810104201012',
    codeGeo: '810104201012',
    nom: 'Tizi n\'Dra',
    commune: 'Foum Jemaa',
    province: 'Béni Mellal',
    region: 'Béni Mellal-Khénifra',
    nbMenages: 35,
    population: 192,
    coordonnees: { lat: 32.1567, lng: -6.5234 },
    accessibilite: 'sentier',
    zoneVulnerable: true,
  },
];

// Données douars HCP 2024 - Province Khouribga
const DOUARS_KHOURIBGA: Douar[] = [
  {
    id: 'douar-810801101013',
    codeGeo: '810801101013',
    nom: 'Ait Jilali',
    commune: 'Ain Kaicher',
    province: 'Khouribga',
    region: 'Béni Mellal-Khénifra',
    nbMenages: 56,
    population: 308,
    coordonnees: { lat: 32.8678, lng: -6.9123 },
    accessibilite: 'piste_bitume',
    zoneVulnerable: false,
  },
  {
    id: 'douar-810801102014',
    codeGeo: '810801102014',
    nom: 'Sidi Moussa',
    commune: 'Ain Kaicher',
    province: 'Khouribga',
    region: 'Béni Mellal-Khénifra',
    nbMenages: 38,
    population: 209,
    coordonnees: { lat: 32.8734, lng: -6.9078 },
    accessibilite: 'piste_terre',
    zoneVulnerable: true,
  },
];

// Données douars HCP 2024 - Province Khénifra
const DOUARS_KHENIFRA: Douar[] = [
  {
    id: 'douar-810901101015',
    codeGeo: '810901101015',
    nom: 'Ait Mhand',
    commune: 'Ait Ishaq',
    province: 'Khénifra',
    region: 'Béni Mellal-Khénifra',
    nbMenages: 72,
    population: 396,
    coordonnees: { lat: 32.9234, lng: -5.6789 },
    accessibilite: 'piste_terre',
    zoneVulnerable: true,
  },
  {
    id: 'douar-810901102016',
    codeGeo: '810901102016',
    nom: 'Tizgui',
    commune: 'Ait Ishaq',
    province: 'Khénifra',
    region: 'Béni Mellal-Khénifra',
    nbMenages: 48,
    population: 264,
    coordonnees: { lat: 32.9289, lng: -5.6734 },
    accessibilite: 'piste_difficile',
    zoneVulnerable: true,
  },
];

// Export combiné
export const MOCK_DOUBLES: Douar[] = [
  ...DOUARS_AZILAL,
  ...DOUARS_FQUIH,
  ...DOUARS_BENI_MELLAL,
  ...DOUARS_KHOURIBGA,
  ...DOUARS_KHENIFRA,
];
