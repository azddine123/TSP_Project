/**
 * ÉCRAN DÉTAIL MISSION — Itinéraire VRP + Tracking GPS
 * =======================================================
 * Accessible depuis HomeScreen via : router.push('/mission-detail?id=...')
 *
 * NOUVELLE VERSION MTSPC-2026 :
 * 1. Affiche l'itinéraire optimisé (VRP) étape par étape (TourneeStepCard).
 * 2. Active le tracking GPS WebSocket (useGpsTracking) au démarrage de la tournée.
 * 3. Propose le bouton "Commencer la livraison" sur l'étape courante
 *    → Navigue vers livraison-confirmation.tsx
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { missionService } from '../services/missionService';
import { syncService } from '../services/syncService';
import { Mission, Tournee, EtapeVRP, AuthUser } from '../types/app';
import { useGpsTracking } from '../hooks/useGpsTracking';
import { useAuth } from '../contexts/AuthContext';
import TourneeStepCard from '../components/TourneeStepCard';

const STATUT_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminée',
  annulee: 'Annulée',
  assignee: 'Assignée',
  en_cours: 'En route',
  terminee: 'Terminée',
};

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  // ── États ───────────────────────────────────────────────────────────────────

  const [mission, setMission] = useState<Mission | null>(null);
  const [tournee, setTournee] = useState<Tournee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Étape en cours (index de la tournée VRP qui n'est pas encore livrée)
  const [etapeActiveIdx, setEtapeActiveIdx] = useState<number>(0);

  // Hook GPS Tracking (Nouveau système)
  const { startTracking, stopTracking, currentPosition, isTracking } = useGpsTracking();

  // ── Chargement des données ──────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const net = await NetInfo.fetch();
        setIsOnline(!!(net.isConnected && net.isInternetReachable));

        // En ligne : on fetch via l'API. (TODO: En offline, on devrait fetch depuis un cache AsyncStorage)
        // Pour la démo, on suppose qu'on précharge ou qu'on est en ligne à l'entrepôt
        const [m, t] = await Promise.all([
          missionService.getMissionById(id),
          missionService.getTourneeByMissionId(id).catch(() => null),
        ]);

        setMission(m);
        setTournee(t);

        // Trouver la première étape non livrée
        // (En offline, on devrait vérifier dans PendingSubmission si une étape a déjà été faite)
        // Simplification pour l'instant : on commence à 0
        setEtapeActiveIdx(0);

      } catch (err) {
        Alert.alert('Erreur', 'Impossible de charger la mission.');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadData();

    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable));
    });
    return unsub;
  }, [id]);

  // Nettoyage au démontage : arrêter le GPS si la tournée est finie ou quittée
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleStartTournee = async () => {
    if (!tournee || !user?.userId) return;

    // Démarrer le tracking GPS (WebSocket vers Super Admin)
    await startTracking(tournee.id, user.userId);

    // Mettre à jour le statut
    if (isOnline) {
      await missionService.updateStatut(mission!.id, 'in_progress').catch(console.warn);
    }
  };

  const handleLivraison = (etape: EtapeVRP, index: number) => {
    if (!tournee) return;

    // Naviguer vers le module de confirmation (Bordereau + Photo + Signature)
    router.push({
      pathname: '/livraison-confirmation',
      params: {
        tourneeId: tournee.id,
        douarId: etape.douarId,
        etapeJson: JSON.stringify(etape),
      },
    });
  };

  const handleMissionFinish = async () => {
    stopTracking();
    if (isOnline) {
      await missionService.updateStatut(mission!.id, 'completed').catch(console.warn);
      Alert.alert('🎉 Mission terminée', 'Toutes les livraisons ont été effectuées avec succès.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      await syncService.savePendingSubmission({
        missionId: mission!.id,
        statut: 'completed',
        timestampLocal: new Date().toISOString(),
        tentativeSync: 0,
      });
      Alert.alert('💾 Mission terminée (Hors-ligne)', 'Les données seront synchronisées au retour du réseau.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  // ── Rendu ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  if (!mission) return null;

  // Calcul pour la polyline de la tournée
  const waypoints = tournee?.etapes.map(e => ({ latitude: e.lat, longitude: e.lng })) || [];
  const mapRegion = waypoints.length > 0
    ? {
      latitude: waypoints[0].latitude,
      longitude: waypoints[0].longitude,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    }
    : mission.destinationLat
      ? {
        latitude: mission.destinationLat,
        longitude: mission.destinationLng!,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
      : null;

  return (
    <View style={styles.flex}>
      {/* ── En-tête ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.flex1}>
          <Text style={styles.headerTitle}>{mission.numeroMission}</Text>
          <Text style={styles.headerSub}>{STATUT_LABEL[mission.statut]}</Text>
        </View>
        {!isOnline && (
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-offline" size={12} color="#fff" />
            <Text style={styles.offlineText}>Hors-ligne</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>

        {/* ── Carte Itinéraire VRP ───────────────────────────── */}
        {mapRegion ? (
          <View style={styles.mapContainer}>
            <MapView
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
              style={styles.map}
              initialRegion={mapRegion}
              showsUserLocation
            >
              {/* Marqueur position actuelle */}
              {currentPosition && (
                <Marker
                  coordinate={{ latitude: currentPosition.lat, longitude: currentPosition.lng }}
                  title="Vous êtes ici"
                  pinColor="#1565C0"
                />
              )}

              {/* Marqueurs des douars VRP */}
              {tournee?.etapes.map((e, index) => (
                <Marker
                  key={e.douarId}
                  coordinate={{ latitude: e.lat, longitude: e.lng }}
                  title={`${e.ordre} - ${e.douarNom}`}
                  description={`${e.ressources.tentes} tentes, ${e.ressources.vivres} vivres`}
                  pinColor={index < etapeActiveIdx ? '#4CAF50' : '#E53935'} // Vert si livré
                />
              ))}

              {/* Ligne d'itinéraire */}
              {waypoints.length > 1 && (
                <Polyline
                  coordinates={waypoints}
                  strokeColor="#1565C0"
                  strokeWidth={3}
                  lineDashPattern={[5, 5]}
                />
              )}
            </MapView>

            {tournee && (
              <View style={styles.tourneeResume}>
                <Ionicons name="analytics" size={16} color="#1565C0" />
                <Text style={styles.tourneeResumeText}>
                  Itinéraire VRP : {tournee.distanceTotaleKm} km • {tournee.tempsEstimeTotalMin} min
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* ── Liste des étapes VRP (TourneeStepCard) ─────────── */}
        {tournee ? (
          <View style={styles.etapesContainer}>
            <Text style={styles.sectionTitle}>
              Itinéraire Optimisé ({tournee.etapes.length} arrêts)
            </Text>

            {!isTracking && mission.statut !== 'completed' && (
              <TouchableOpacity style={styles.startTourneeBtn} onPress={handleStartTournee}>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.startTourneeText}>Démarrer la tournée et le suivi GPS</Text>
              </TouchableOpacity>
            )}

            {isTracking && (
              <View style={styles.trackingActiveBox}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.trackingActiveText}>Suivi GPS en cours vers le centre de commandement</Text>
              </View>
            )}

            {tournee.etapes.map((etape, index) => {
              // Déterminer le statut visual de l'étape
              const isLivree = index < etapeActiveIdx;
              const isActive = index === etapeActiveIdx && isTracking;
              const statut = isLivree ? 'livree' : (isActive ? 'en_cours' : 'a_faire');

              return (
                <TourneeStepCard
                  key={etape.douarId}
                  etape={etape}
                  statut={statut}
                  isActive={isActive}
                  onStartPress={() => handleLivraison(etape, index)}
                />
              );
            })}

            {etapeActiveIdx >= tournee.etapes.length && mission.statut !== 'completed' && (
              <TouchableOpacity style={styles.finishMissionBtn} onPress={handleMissionFinish}>
                <Ionicons name="checkmark-done" size={24} color="#fff" />
                <Text style={styles.finishMissionText}>Terminer la Mission Globale</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* ── Fallback Mission Classique ──────────────────── */
          <View style={styles.noTourneeBox}>
            <Text style={styles.sectionTitle}>Détails Mission (Hors VRP)</Text>
            {mission.items.map((item) => (
              <View key={item.id} style={styles.fallbackItem}>
                <Text>{item.quantitePrevue} {item.unite} - {item.materielNom}</Text>
              </View>
            ))}
            {mission.statut !== 'completed' && (
              <TouchableOpacity style={styles.finishMissionBtn} onPress={handleMissionFinish}>
                <Text style={styles.finishMissionText}>Terminer la mission</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F4F6F9' },
  flex1: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },

  // Header
  header: {
    backgroundColor: '#1565C0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  offlineBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FF7043', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, gap: 4,
  },
  offlineText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Map
  mapContainer: {
    margin: 16, borderRadius: 12, overflow: 'hidden', elevation: 3,
    backgroundColor: '#fff',
  },
  map: { height: 250, width: '100%' },
  tourneeResume: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 10, backgroundColor: '#E3F2FD', gap: 6,
  },
  tourneeResumeText: { color: '#1565C0', fontSize: 13, fontWeight: '600' },

  // Étapes
  etapesContainer: { paddingBottom: 20 },
  sectionTitle: {
    fontSize: 18, fontWeight: '800', color: '#1A1A2E',
    marginHorizontal: 16, marginBottom: 12, marginTop: 8,
  },

  // Bouton start
  startTourneeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1A237E', marginHorizontal: 16, marginBottom: 16,
    paddingVertical: 14, borderRadius: 10, gap: 8, elevation: 2,
  },
  startTourneeText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Tracking Actif
  trackingActiveBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E8F5E9', marginHorizontal: 16, marginBottom: 16,
    paddingVertical: 10, borderRadius: 8, gap: 8, borderWidth: 1, borderColor: '#C8E6C9',
  },
  trackingActiveText: { color: '#2E7D32', fontSize: 13, fontWeight: '600' },

  // Finish
  finishMissionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2E7D32', marginHorizontal: 16, marginTop: 16,
    paddingVertical: 16, borderRadius: 12, gap: 8, elevation: 4,
  },
  finishMissionText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Fallback
  noTourneeBox: { marginHorizontal: 16 },
  fallbackItem: {
    backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 8,
  },
});

