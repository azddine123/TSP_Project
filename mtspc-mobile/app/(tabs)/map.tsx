/**
 * MAP SCREEN — Carte des tournées actives
 * ========================================
 * Affiche toutes les missions en cours/assignées avec leurs douars
 * et l'itinéraire réel calculé via OSRM.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MapView, Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Region } from '../../components/MapViewWrapper';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { missionService } from '../../services/missionService';
import { Mission, Tournee, EtapeVRP } from '../../types/app';

// ── Couleurs par statut ───────────────────────────────────────────────────────

const STATUT_CFG: Record<string, { color: string; bg: string; label: string }> = {
  assignee:    { color: '#1565C0', bg: '#E3F2FD', label: 'Assignée' },
  en_cours:    { color: '#E65100', bg: '#FFF3E0', label: 'En cours' },
  in_progress: { color: '#E65100', bg: '#FFF3E0', label: 'En cours' },
  pending:     { color: '#6A1B9A', bg: '#F3E5F5', label: 'En attente' },
  completed:   { color: '#2E7D32', bg: '#E8F5E9', label: 'Terminée' },
};

const MARKER_COLORS = ['#E53935', '#8E24AA', '#1E88E5', '#00897B', '#F4511E'];

const REGION_BML: Region = {
  latitude: 32.33,
  longitude: -6.36,
  latitudeDelta: 1.8,
  longitudeDelta: 1.8,
};

// ── Types internes ────────────────────────────────────────────────────────────

interface MissionWithTournee {
  mission: Mission;
  tournee: Tournee | null;
  routeCoords: { latitude: number; longitude: number }[];
  color: string;
}

// ── Fetch OSRM ────────────────────────────────────────────────────────────────

async function fetchOsrmRoute(
  wps: { latitude: number; longitude: number }[],
): Promise<{ latitude: number; longitude: number }[]> {
  if (wps.length < 2) return wps;
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 10_000);
  try {
    const coordsStr = wps.map(w => `${w.longitude},${w.latitude}`).join(';');
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`,
      { signal: controller.signal },
    );
    clearTimeout(tid);
    if (!res.ok) throw new Error('OSRM error');
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('no route');
    return data.routes[0].geometry.coordinates.map(
      ([lon, lat]: [number, number]) => ({ latitude: lat, longitude: lon }),
    );
  } catch {
    clearTimeout(tid);
    return wps; // fallback lignes droites
  }
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<any>(null);

  const [items, setItems]               = useState<MissionWithTournee[]>([]);
  const [selected, setSelected]         = useState<MissionWithTournee | null>(null);
  const [loading, setLoading]           = useState(true);
  const [locationGranted, setLocation]  = useState(false);
  const [userCoords, setUserCoords]     = useState<{ latitude: number; longitude: number } | null>(null);

  // ── GPS ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocation(true);
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } catch {}
      }
    })();
  }, []);

  // ── Chargement missions + tournées ───────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const missions = await missionService.getAllMissions();
      // Garder seulement les missions actives (pas terminées)
      const actives = missions.filter(m =>
        ['assignee', 'pending', 'in_progress', 'en_cours'].includes(m.statut),
      );

      const results: MissionWithTournee[] = await Promise.all(
        actives.map(async (mission, i) => {
          const color = MARKER_COLORS[i % MARKER_COLORS.length];
          try {
            const tournee = await missionService.getTourneeByMissionId(mission.id);
            let routeCoords: { latitude: number; longitude: number }[] = [];
            if (tournee?.etapes?.length >= 2) {
              const wps = tournee.etapes.map((e: EtapeVRP) => ({ latitude: e.lat, longitude: e.lng }));
              routeCoords = await fetchOsrmRoute(wps);
            }
            return { mission, tournee, routeCoords, color };
          } catch {
            return { mission, tournee: null, routeCoords: [], color };
          }
        }),
      );

      setItems(results);

      // Centrer la carte sur la première mission active
      if (results[0]?.tournee?.etapes?.length) {
        const first = results[0].tournee.etapes[0];
        mapRef.current?.animateToRegion({
          latitude: first.lat,
          longitude: first.lng,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }, 800);
      }
    } catch (e) {
      console.warn('[MapScreen] loadData error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Carte ──────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={REGION_BML}
        showsUserLocation={locationGranted}
        showsMyLocationButton={false}
        onPress={() => setSelected(null)}
      >
        {items.map(({ mission, tournee, routeCoords, color }) => {
          if (!tournee?.etapes?.length) return null;
          return (
            <React.Fragment key={mission.id}>
              {/* Itinéraire OSRM */}
              {routeCoords.length > 1 && (
                <Polyline
                  coordinates={routeCoords}
                  strokeColor={color}
                  strokeWidth={3}
                  lineDashPattern={mission.statut === 'completed' ? [6, 4] : []}
                />
              )}

              {/* Marqueurs des douars */}
              {tournee.etapes.map((etape: EtapeVRP, idx: number) => (
                <Marker
                  key={`${mission.id}-${etape.douarId}`}
                  coordinate={{ latitude: etape.lat, longitude: etape.lng }}
                  title={`${etape.ordre}. ${etape.douarNom}`}
                  description={mission.numeroMission}
                  onPress={() => setSelected({ mission, tournee, routeCoords, color })}
                >
                  <View style={[styles.marker, { backgroundColor: color }]}>
                    <Text style={styles.markerText}>{etape.ordre}</Text>
                  </View>
                </Marker>
              ))}
            </React.Fragment>
          );
        })}
      </MapView>

      {/* ── Indicateur chargement ──────────────────────────────── */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#1565C0" />
          <Text style={styles.loadingText}>Chargement des tournées…</Text>
        </View>
      )}

      {/* ── FAB Ma position ────────────────────────────────────── */}
      {locationGranted && userCoords && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => mapRef.current?.animateToRegion({ ...userCoords, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 800)}
        >
          <Ionicons name="navigate" size={22} color="#1565C0" />
        </TouchableOpacity>
      )}

      {/* ── FAB Vue globale ────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.fab, styles.fabGlobe]}
        onPress={() => { mapRef.current?.animateToRegion(REGION_BML, 800); setSelected(null); }}
      >
        <Ionicons name="globe-outline" size={22} color="#1565C0" />
      </TouchableOpacity>

      {/* ── Légende couleurs missions ──────────────────────────── */}
      {!selected && items.length > 0 && (
        <View style={styles.legend}>
          {items.map(({ mission, color }) => {
            const cfg = STATUT_CFG[mission.statut] ?? STATUT_CFG.assignee;
            return (
              <TouchableOpacity
                key={mission.id}
                style={styles.legendItem}
                onPress={() => setSelected(items.find(i => i.mission.id === mission.id) ?? null)}
              >
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <View>
                  <Text style={styles.legendMission}>{mission.numeroMission}</Text>
                  <Text style={[styles.legendStatut, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Fiche mission sélectionnée ─────────────────────────── */}
      {selected && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardDot, { backgroundColor: selected.color }]} />
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>{selected.mission.numeroMission}</Text>
              <Text style={styles.cardSub}>{selected.mission.destinationNom}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.cardClose}>
              <Ionicons name="close" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Étapes */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stepsScroll}>
            {selected.tournee?.etapes.map((e: EtapeVRP) => (
              <View key={e.douarId} style={[styles.stepChip, { borderColor: selected.color }]}>
                <Text style={[styles.stepChipNum, { color: selected.color }]}>{e.ordre}</Text>
                <Text style={styles.stepChipName} numberOfLines={1}>{e.douarNom}</Text>
                <Text style={styles.stepChipDist}>{e.distanceKm} km</Text>
              </View>
            ))}
          </ScrollView>

          {/* Bouton ouvrir */}
          <TouchableOpacity
            style={[styles.openBtn, { backgroundColor: selected.color }]}
            onPress={() => router.push({ pathname: '/mission-detail', params: { id: selected.mission.id } })}
          >
            <Ionicons name="map" size={18} color="#fff" />
            <Text style={styles.openBtnText}>Voir la mission</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Message si aucune mission active ──────────────────── */}
      {!loading && items.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="map-outline" size={40} color="#BDBDBD" />
          <Text style={styles.emptyText}>Aucune mission active</Text>
          <Text style={styles.emptySub}>Les tournées assignées apparaîtront ici</Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  loadingOverlay: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  loadingText: { fontSize: 12, color: '#1565C0', fontWeight: '600' },

  fab: {
    position: 'absolute',
    right: 14,
    bottom: 220,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabGlobe: { bottom: 278 },

  // Légende
  legend: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    maxWidth: 200,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendMission: { fontSize: 12, fontWeight: '700', color: '#212121' },
  legendStatut: { fontSize: 11, fontWeight: '500' },

  // Marqueur
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  markerText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Fiche mission
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 32,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  cardDot: { width: 14, height: 14, borderRadius: 7 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  cardSub: { fontSize: 13, color: '#757575', marginTop: 2 },
  cardClose: { padding: 4 },

  stepsScroll: { marginBottom: 14 },
  stepChip: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    minWidth: 72,
    backgroundColor: '#FAFAFA',
  },
  stepChipNum: { fontSize: 16, fontWeight: '800' },
  stepChipName: { fontSize: 11, color: '#333', fontWeight: '600', maxWidth: 80 },
  stepChipDist: { fontSize: 10, color: '#999', marginTop: 2 },

  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    gap: 8,
  },
  openBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Vide
  emptyCard: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#424242' },
  emptySub: { fontSize: 12, color: '#9E9E9E' },
});
