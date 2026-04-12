/**
 * MOCK DATA — Douars (villages) HCP 2024
 * ======================================
 * Données géographiques réelles des douars de Béni Mellal-Khénifra
 */

import type { Douar } from '../types';

// Province d'Azilal
const DOUARS_AZILAL: Douar[] = [
  {
    id: 'douar-810301201001',
    nom: 'Aska',
    commune: "Akdi n'Lkhir",
    province: 'Azilal',
    wilaya: 'Béni Mellal-Khénifra',
    latitude: 31.9523,
    longitude: -6.5124,
    population: 264,
    zoneVulnerable: true,
    servi: false,
  },
  {
    id: 'douar-810301202002',
    nom: 'Takout',
    commune: "Akdi n'Lkhir",
    province: 'Azilal',
    wilaya: 'Béni Mellal-Khénifra',
    latitude: 31.9487,
    longitude: -6.5089,
    population: 198,
    zoneVulnerable: true,
    servi: true,
  },
  {
    id: 'douar-810302101003',
    nom: 'Ait Ouadrim',
    commune: 'Ait Abbas',
    province: 'Azilal',
    wilaya: 'Béni Mellal-Khénifra',
    latitude: 32.0156,
    longitude: -6.6345,
    population: 231,
    zoneVulnerable: false,
    servi: true,
  },
  {
    id: 'douar-810302102004',
    nom: 'Tizguit',
    commune: 'Ait Abbas',
    province: 'Azilal',
    wilaya: 'Béni Mellal-Khénifra',
    latitude: 32.0234,
    longitude: -6.6289,
    population: 154,
    zoneVulnerable: true,
    servi: false,
  },
  {
    id: 'douar-810303101005',
    nom: 'Tighanimin',
    commune: 'Ait Bou Oulli',
    province: 'Azilal',
    wilaya: 'Béni Mellal-Khénifra',
    latitude: 31.9876,
    longitude: -6.7234,
    population: 302,
    zoneVulnerable: true,
    servi: true,
  },
];

// Province Fquih Ben Salah
const DOUARS_FQUIH: Douar[] = [
  {
    id: 'douar-810502301006',
    nom: 'Ouled Bouazza',
    commune: 'Ouled Bourhmoun',
    province: 'Fquih Ben Salah',
    wilaya: 'Béni Mellal-Khénifra',
    latitude: 32.4876,
    longitude: -6.6789,
    population: 429,
    zoneVulnerable: true,
    servi: false,
  },
  {
    id: 'douar-810502302007',
    nom: 'Ouled Haddou',
    commune: 'Ouled Bourhmoun',
    province: 'Fquih Ben Salah',
    wilaya: 'Béni Mellal-Khénifra',
    latitude: 32.4934,
    longitude: -6.6845,
    population: 352,
    zoneVulnerable: false,
    servi: true,
  },
  {
    id: 'douar-810503101008',
    nom: 'Sidi Ameur',
    commune: 'Bni Chegdale',
    province: 'Fquih Ben Salah',
    wilaya: 'Béni Mellal-Khénifra',
    latitude: 32.5567,
    longitude: -6.7234,
    population: 286,
    zoneVulnerable: false,
    servi: true,
  },
  {
    id: 'douar-810503102009',
    nom: 'Lakhoualqa',
    commune: 'Bni Chegdale',
    province: 'Fquih Ben Salah',
    wilaya: 'Béni Mellal-Khénifra',
    latitude: 32.5623,
    longitude: -6.7189,
    population: 247,
    zoneVulnerable: true,
    servi: false,
  },
];

// Province Béni Mellal
const DOUARS_BENI_MELLAL: Douar[] = [
  {
    id: 'douar-810103101010',
    nom: 'Ait Said Ichou',
    commune: 'Foum Oudi',
    province: 'Béni Mellal',
    wilaya: 'Béni Mellal-Khénifra',
    latitude: 32.2987,
    longitude: -6.4234,
    population: 374,
    zoneVulnerable: true,
    servi: false,
  },
  {
    id: 'douar-810103102011',
    nom: 'Ait Lahcen',
    commune: 'Foum Oudi',
    province: 'Béni Mellal',
    wilaya: 'Béni Mellal-Khénifra',
    latitude: 32.3034,
    longitude: -6.4189,
    population: 231,
    zoneVulnerable: false,
    servi: true,
  },
  {
    id: 'douar-810104201012',
    nom: "Tizi n'Dra",
    commune: 'Foum Jemaa',
    province: 'Béni Mellal',
    wilaya: 'Béni Mellal-Khénifra',
    latitude: 32.1567,
    longitude: -6.5234,
    population: 192,
    zoneVulnerable: true,
    servi: false,
  },
];

// Province Khouribga
const DOUARS_KHOURIBGA: Douar[] = [
  {
    id: 'douar-810801101013',
    nom: 'Ait Jilali',
    commune: 'Ain Kaicher',
    province: 'Khouribga',
    wilaya: 'Béni Mellal-Khénifra',
    latitude: 32.8678,
    longitude: -6.9123,
    population: 308,
    zoneVulnerable: false,
    servi: true,
  },
  {
    id: 'douar-810801102014',
    nom: 'Sidi Moussa',
    commune: 'Ain Kaicher',
    province: 'Khouribga',
    wilaya: 'Béni Mellal-Khénifra',
    latitude: 32.8734,
    longitude: -6.9078,
    population: 209,
    zoneVulnerable: true,
    servi: false,
  },
];

// Province Khénifra
const DOUARS_KHENIFRA: Douar[] = [
  {
    id: 'douar-810901101015',
    nom: 'Ait Mhand',
    commune: 'Ait Ishaq',
    province: 'Khénifra',
    wilaya: 'Béni Mellal-Khénifra',
    latitude: 32.9234,
    longitude: -5.6789,
    population: 396,
    zoneVulnerable: true,
    servi: true,
  },
  {
    id: 'douar-810901102016',
    nom: 'Tizgui',
    commune: 'Ait Ishaq',
    province: 'Khénifra',
    wilaya: 'Béni Mellal-Khénifra',
    latitude: 32.9289,
    longitude: -5.6734,
    population: 264,
    zoneVulnerable: true,
    servi: false,
  },
];

export const MOCK_DOUBLES: Douar[] = [
  ...DOUARS_AZILAL,
  ...DOUARS_FQUIH,
  ...DOUARS_BENI_MELLAL,
  ...DOUARS_KHOURIBGA,
  ...DOUARS_KHENIFRA,
];
