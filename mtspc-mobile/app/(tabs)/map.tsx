/**
 * MAP SCREEN — Carte Régionale des Entrepôts Humanitaires
 * =========================================================
 *
 * Onglet CARTE du distributeur. Affiche :
 * - Les 3 entrepôts de la région Béni Mellal-Khénifra (données statiques du schéma SQL)
 * - La position GPS du distributeur (expo-location)
 * - Une fiche détail par entrepôt au tap sur le marqueur
 * - Deux boutons flottants : "Vue région" et "Ma position"
 *
 * Coordonnées issues de database/migrations/schema.sql (seed data) :
 *   ENT-KHN-01 → 32.9436, -5.6686  (Khénifra)
 *   ENT-BML-01 → 32.3372, -6.3498  (Béni Mellal)
 *   ENT-AZL-01 → 31.9670, -6.5728  (Azilal)
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import MapView, {
  Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Region,
} from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EntrepotStatique {
  id:          string;
  code:        string;
  nom:         string;
  province:    string;
  wilaya:      string;
  latitude:    number;
  longitude:   number;
  capaciteM3:  number;
  statut:      'actif' | 'surcharge' | 'inactif';
}

// ── Données statiques (schema.sql seed) ──────────────────────────────────────

const ENTREPOTS: EntrepotStatique[] = [
  {
    id:         'ENT-BML-01',
    code:       'ENT-BML-01',
    nom:        'Entrepôt Régional de Béni Mellal',
    province:   'Béni Mellal',
    wilaya:     'Béni Mellal-Khénifra',
    latitude:   32.3372,
    longitude:  -6.3498,
    capaciteM3: 5000,
    statut:     'actif',
  },
  {
    id:         'ENT-KHN-01',
    code:       'ENT-KHN-01',
    nom:        'Entrepôt Provincial de Khénifra',
    province:   'Khénifra',
    wilaya:     'Béni Mellal-Khénifra',
    latitude:   32.9436,
    longitude:  -5.6686,
    capaciteM3: 2000,
    statut:     'actif',
  },
  {
    id:         'ENT-AZL-01',
    code:       'ENT-AZL-01',
    nom:        "Entrepôt Provincial d'Azilal",
    province:   'Azilal',
    wilaya:     'Béni Mellal-Khénifra',
    latitude:   31.9670,
    longitude:  -6.5728,
    capaciteM3: 1500,
    statut:     'actif',
  },
];

// ── Configuration visuelle par statut ─────────────────────────────────────────

const STATUT: Record<string, { couleur: string; fond: string; label: string }> = {
  actif:     { couleur: '#2E7D32', fond: '#E8F5E9', label: 'Actif'        },
  surcharge: { couleur: '#E53935', fond: '#FFEBEE', label: 'En surcharge' },
  inactif:   { couleur: '#9E9E9E', fond: '#F5F5F5', label: 'Inactif'      },
};

// ── Région initiale : vue sur toute la zone Béni Mellal-Khénifra ─────────────

const REGION_INITIALE: Region = {
  latitude:       32.32,
  longitude:      -6.12,
  latitudeDelta:  1.6,
  longitudeDelta: 1.6,
};

// ── Composant marqueur personnalisé ───────────────────────────────────────────

/**
 * Marqueur en forme de pin avec icône "business" et couleur selon le statut.
 * tracksViewChanges doit être géré dans le <Marker> parent.
 */
function EntrepotPin({
  statut,
  selected,
}: {
  statut: string;
  selected: boolean;
}) {
  const cfg  = STATUT[statut] ?? STATUT.actif;
  const size = selected ? 46 : 38;

  return (
    <View style={styles.pinWrapper}>
      {/* Bulle */}
      <View
        style={[
          styles.pinBubble,
          {
            width:           size,
            height:          size,
            borderRadius:    size / 2,
            backgroundColor: cfg.couleur,
          },
          selected && styles.pinSelected,
        ]}
      >
        <Ionicons name="business" size={selected ? 24 : 20} color="#fff" />
      </View>
      {/* Pointe */}
      <View style={[styles.pinTip, { borderTopColor: cfg.couleur }]} />
    </View>
  );
}

// ── Composant fiche d'information ─────────────────────────────────────────────

function EntrepotInfoCard({
  entrepot,
  onClose,
}: {
  entrepot: EntrepotStatique;
  onClose: () => void;
}) {
  const cfg = STATUT[entrepot.statut] ?? STATUT.actif;

  return (
    <View style={styles.infoCard}>
      {/* En-tête */}
      <View style={styles.infoHeader}>
        <View style={[styles.statutBadge, { backgroundColor: cfg.fond }]}>
          <View style={[styles.statutDot, { backgroundColor: cfg.couleur }]} />
          <Text style={[styles.statutLabel, { color: cfg.couleur }]}>
            {cfg.label.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.infoCode}>{entrepot.code}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Nom */}
      <Text style={styles.infoNom}>{entrepot.nom}</Text>

      {/* Métadonnées */}
      <View style={styles.infoRows}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={15} color="#888" style={styles.infoIcon} />
          <Text style={styles.infoMeta}>{entrepot.province} · {entrepot.wilaya}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="navigate-outline" size={15} color="#888" style={styles.infoIcon} />
          <Text style={styles.infoMeta}>
            {entrepot.latitude.toFixed(4)}°N, {Math.abs(entrepot.longitude).toFixed(4)}°O
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="cube-outline" size={15} color="#888" style={styles.infoIcon} />
          <Text style={styles.infoMeta}>
            Capacité : {entrepot.capaciteM3.toLocaleString('fr-MA')} m³
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);

  const [selectedId,      setSelectedId]      = useState<string | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [userCoords,      setUserCoords]      = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // ── Demande de permission GPS ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === 'granted') {
          setLocationGranted(true);
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserCoords({
            latitude:  loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch {
        // Pas de GPS → la carte fonctionne quand même
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  // ── Contrôles de navigation carte ──────────────────────────────────────────

  const vueRegionComplete = () => {
    mapRef.current?.animateToRegion(REGION_INITIALE, 800);
    setSelectedId(null);
  };

  const centrerSurMaPosition = () => {
    if (!userCoords) return;
    mapRef.current?.animateToRegion(
      { ...userCoords, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      800,
    );
  };

  const selectedEntrepot = ENTREPOTS.find((e) => e.id === selectedId) ?? null;

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1565C0" />

      {/* ── Carte principale ───────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        /**
         * PROVIDER_GOOGLE sur Android (Expo Go le supporte nativement).
         * Sur iOS → PROVIDER_DEFAULT (Apple Maps) — pas de clé API requise.
         */
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={REGION_INITIALE}
        showsUserLocation={locationGranted}
        showsMyLocationButton={false}
        showsCompass
        showsScale
        mapType="standard"
        // Tap sur le fond de carte → désélectionner l'entrepôt
        onPress={() => setSelectedId(null)}
      >
        {/* ── Marqueurs entrepôts ──────────────────────────────────── */}
        {ENTREPOTS.map((e) => (
          <Marker
            key={e.id}
            coordinate={{ latitude: e.latitude, longitude: e.longitude }}
            /**
             * tracksViewChanges={true} uniquement pour le marqueur sélectionné,
             * afin que son apparence se mette à jour (taille + ombre).
             * Sur les non-sélectionnés → false pour les performances.
             */
            tracksViewChanges={selectedId === e.id}
            onPress={() => setSelectedId(e.id)}
          >
            <EntrepotPin
              statut={e.statut}
              selected={selectedId === e.id}
            />
          </Marker>
        ))}
      </MapView>

      {/* ── Badge compteur (coin haut-gauche) ─────────────────────── */}
      <View style={styles.counterBadge}>
        <Ionicons name="business" size={13} color="#1565C0" />
        <Text style={styles.counterText}>
          {ENTREPOTS.length} entrepôts · Béni Mellal-Khénifra
        </Text>
      </View>

      {/* ── Indicateur GPS en cours de chargement ─────────────────── */}
      {locationLoading && (
        <View style={styles.gpsLoading}>
          <ActivityIndicator size="small" color="#1565C0" />
          <Text style={styles.gpsLoadingText}>Localisation…</Text>
        </View>
      )}

      {/* ── Boutons flottants (coin bas-droit) ────────────────────── */}
      <View style={styles.fabGroup}>
        {/* Centrer sur ma position (affiché uniquement si GPS accordé) */}
        {locationGranted && (
          <TouchableOpacity
            style={styles.fab}
            onPress={centrerSurMaPosition}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate" size={22} color="#1565C0" />
          </TouchableOpacity>
        )}
        {/* Vue de toute la région */}
        <TouchableOpacity
          style={styles.fab}
          onPress={vueRegionComplete}
          activeOpacity={0.85}
        >
          <Ionicons name="globe-outline" size={22} color="#1565C0" />
        </TouchableOpacity>
      </View>

      {/* ── Légende (coin bas-gauche) ──────────────────────────────── */}
      <View style={styles.legend}>
        {Object.entries(STATUT).map(([key, cfg]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: cfg.couleur }]} />
            <Text style={styles.legendText}>{cfg.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Fiche info entrepôt sélectionné ───────────────────────── */}
      {selectedEntrepot && (
        <EntrepotInfoCard
          entrepot={selectedEntrepot}
          onClose={() => setSelectedId(null)}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },

  // ── Carte ────────────────────────────────────────────────────────────────
  map: {
    flex: 1,
  },

  // ── Marqueur ─────────────────────────────────────────────────────────────
  pinWrapper: {
    alignItems: 'center',
  },
  pinBubble: {
    alignItems:      'center',
    justifyContent:  'center',
    elevation:       4,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.25,
    shadowRadius:    4,
  },
  pinSelected: {
    // Halo blanc autour du marqueur sélectionné
    borderWidth:  3,
    borderColor:  '#fff',
    elevation:    8,
    shadowOpacity: 0.4,
  },
  pinTip: {
    width:               0,
    height:              0,
    borderLeftWidth:     7,
    borderRightWidth:    7,
    borderTopWidth:      10,
    borderLeftColor:     'transparent',
    borderRightColor:    'transparent',
    // borderTopColor est défini inline
  },

  // ── Badge compteur ────────────────────────────────────────────────────────
  counterBadge: {
    position:        'absolute',
    top:             12,
    left:            12,
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#fff',
    borderRadius:    20,
    paddingVertical:   6,
    paddingHorizontal: 12,
    gap:              6,
    elevation:        4,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.15,
    shadowRadius:    4,
  },
  counterText: {
    fontSize:   12,
    color:      '#1565C0',
    fontWeight: '600',
  },

  // ── GPS loading ───────────────────────────────────────────────────────────
  gpsLoading: {
    position:        'absolute',
    top:             12,
    right:           12,
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#fff',
    borderRadius:    20,
    paddingVertical:   6,
    paddingHorizontal: 12,
    gap:              6,
    elevation:        3,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.1,
    shadowRadius:    3,
  },
  gpsLoadingText: {
    fontSize: 12,
    color:    '#666',
  },

  // ── Boutons flottants ────────────────────────────────────────────────────
  fabGroup: {
    position: 'absolute',
    right:    14,
    bottom:   140,   // Au-dessus de la légende
    gap:       10,
  },
  fab: {
    width:           48,
    height:          48,
    borderRadius:    24,
    backgroundColor: '#fff',
    alignItems:      'center',
    justifyContent:  'center',
    elevation:       5,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.2,
    shadowRadius:    4,
  },

  // ── Légende ───────────────────────────────────────────────────────────────
  legend: {
    position:        'absolute',
    bottom:          16,
    left:            14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius:    12,
    padding:         10,
    gap:              6,
    elevation:        3,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.12,
    shadowRadius:    3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           7,
  },
  legendDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color:    '#444',
    fontWeight: '500',
  },

  // ── Fiche info entrepôt ───────────────────────────────────────────────────
  infoCard: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    backgroundColor: '#fff',
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    padding:         20,
    paddingBottom:   32,
    elevation:       12,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -3 },
    shadowOpacity:   0.12,
    shadowRadius:    10,
  },
  infoHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:             8,
    marginBottom:   10,
  },
  statutBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 10,
    paddingVertical:    4,
    borderRadius:      20,
    gap:                5,
  },
  statutDot: {
    width:        7,
    height:       7,
    borderRadius: 4,
  },
  statutLabel: {
    fontSize:   11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoCode: {
    flex:       1,
    fontSize:   12,
    color:      '#aaa',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  closeBtn: {
    padding: 4,
  },
  infoNom: {
    fontSize:     17,
    fontWeight:   '700',
    color:        '#1A237E',
    marginBottom: 12,
    lineHeight:   23,
  },
  infoRows: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           8,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoMeta: {
    flex:       1,
    fontSize:   13,
    color:      '#555',
    lineHeight: 20,
  },
});
