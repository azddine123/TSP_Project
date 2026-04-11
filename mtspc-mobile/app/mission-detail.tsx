/**
 * ÉCRAN DÉTAIL MISSION — Itinéraire VRP + Tracking GPS
 * =======================================================
 * Accessible depuis HomeScreen via : router.push('/mission-detail?id=...')
 *
 * Fonctionnalités :
 * 1. Affiche la liste des 7 douars à visiter (ordre AHP-TOPSIS-VRP)
 * 2. Bouton "Commencer la mission" → ouvre carte plein écran avec itinéraire
 * 3. Tracking GPS au démarrage de la tournée
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, Modal, Dimensions,
} from 'react-native';
import { MapView, Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from '../components/MapViewWrapper';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { missionService } from '../services/missionService';
import { syncService } from '../services/syncService';
import { Mission, Tournee, EtapeVRP } from '../types/app';
import { useGpsTracking } from './hooks/useGpsTracking';
import { useAuth } from '../contexts/AuthContext';
import TourneeStepCard from '../components/TourneeStepCard';
import { formatTempsEstime } from '../mock/tournees';

const { width, height } = Dimensions.get('window');

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

  const [mission, setMission] = useState<Mission | null>(null);
  const [tournee, setTournee] = useState<Tournee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [etapeActiveIdx, setEtapeActiveIdx] = useState<number>(0);
  const [showMapModal, setShowMapModal] = useState(false);

  const { startTracking, stopTracking, currentPosition, isTracking } = useGpsTracking();

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const net = await NetInfo.fetch();
        setIsOnline(!!(net.isConnected && net.isInternetReachable));

        const [m, t] = await Promise.all([
          missionService.getMissionById(id),
          missionService.getTourneeByMissionId(id).catch(() => null),
        ]);

        setMission(m);
        setTournee(t);
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

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  const handleStartTournee = async () => {
    if (!tournee || !user?.userId) return;
    await startTracking(tournee.id, user.userId);
    if (isOnline) {
      await missionService.updateStatut(mission!.id, 'in_progress').catch(console.warn);
    }
  };

  const handleLivraison = (etape: EtapeVRP, index: number) => {
    if (!tournee) return;
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
      Alert.alert('🎉 Mission terminée', 'Toutes les livraisons ont été effectuées.', [
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

  const openMapModal = () => {
    setShowMapModal(true);
  };

  const closeMapModal = () => {
    setShowMapModal(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  if (!mission) return null;

  const waypoints = tournee?.etapes.map(e => ({ latitude: e.lat, longitude: e.lng })) || [];
  
  const getMapRegion = () => {
    if (waypoints.length > 0) {
      return {
        latitude: waypoints[0].latitude,
        longitude: waypoints[0].longitude,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      };
    }
    return mission.destinationLat ? {
      latitude: mission.destinationLat,
      longitude: mission.destinationLng!,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    } : null;
  };

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
        {/* ── Bouton Commencer la Mission ─────────────────────── */}
        {tournee && mission.statut !== 'completed' && (
          <TouchableOpacity style={styles.startMissionBtn} onPress={openMapModal}>
            <Ionicons name="map" size={24} color="#fff" />
            <View style={styles.startMissionTextContainer}>
              <Text style={styles.startMissionTitle}>Commencer la mission</Text>
              <Text style={styles.startMissionSubtitle}>
                {tournee.etapes.length} douars · {tournee.distanceTotaleKm} km · {formatTempsEstime(tournee.tempsEstimeTotalMin)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        {/* ── Statut Tracking ─────────────────────────────────── */}
        {isTracking && (
          <View style={styles.trackingBox}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.trackingText}>Suivi GPS actif</Text>
          </View>
        )}

        {/* ── Mini Carte Aperçu ──────────────────────────────── */}
        {waypoints.length > 0 && (
          <TouchableOpacity style={styles.mapPreviewContainer} onPress={openMapModal}>
            <MapView
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
              style={styles.mapPreview}
              initialRegion={getMapRegion() || undefined}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              {waypoints.map((wp, index) => (
                <Marker
                  key={index}
                  coordinate={wp}
                  title={`${index + 1}`}
                  pinColor={index === 0 ? '#4CAF50' : '#1565C0'}
                />
              ))}
              <Polyline
                coordinates={waypoints}
                strokeColor="#1565C0"
                strokeWidth={3}
              />
            </MapView>
            <View style={styles.mapOverlay}>
              <Ionicons name="expand" size={24} color="#fff" />
              <Text style={styles.mapOverlayText}>Taper pour agrandir</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Liste des étapes VRP ───────────────────────────── */}
        {tournee && tournee.etapes.length > 0 ? (
          <View style={styles.etapesContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={20} color="#1565C0" />
              <Text style={styles.sectionTitle}>
                Itinéraire optimisé ({tournee.etapes.length} arrêts)
              </Text>
            </View>

            <Text style={styles.algoNote}>
              Ordre calculé par AHP → TOPSIS → VRP
            </Text>

            {!isTracking && mission.statut !== 'completed' && etapeActiveIdx === 0 && (
              <TouchableOpacity style={styles.startTourneeBtn} onPress={handleStartTournee}>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.startTourneeText}>Démarrer le suivi GPS</Text>
              </TouchableOpacity>
            )}

            {tournee.etapes.map((etape, index) => {
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
                <Text style={styles.finishMissionText}>Terminer la Mission</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.noTourneeBox}>
            <Text style={styles.sectionTitle}>Détails Mission</Text>
            {mission.items.map((item) => (
              <View key={item.id} style={styles.fallbackItem}>
                <Text>{item.quantitePrevue} {item.unite} - {item.materielNom}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Modal Carte Plein Écran ──────────────────────────── */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.modalContainer}>
          {/* Header Modal */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeMapModal} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>{mission.numeroMission}</Text>
              <Text style={styles.modalSubtitle}>
                {tournee?.etapes.length} douars à visiter
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.modalActionBtn}
              onPress={() => {
                closeMapModal();
                if (!isTracking) handleStartTournee();
              }}
            >
              <Ionicons name={isTracking ? "navigate" : "play"} size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Carte Plein Écran */}
          {waypoints.length > 0 && tournee && (
            <MapView
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
              style={styles.fullMap}
              initialRegion={getMapRegion() || undefined}
              showsUserLocation
              showsMyLocationButton
            >
              {/* Position actuelle */}
              {currentPosition && (
                <Marker
                  coordinate={{ latitude: currentPosition.lat, longitude: currentPosition.lng }}
                  title="Vous êtes ici"
                  pinColor="#1565C0"
                />
              )}

              {/* Chemin parcouru (vert) */}
              {etapeActiveIdx > 0 && (
                <Polyline
                  coordinates={waypoints.slice(0, etapeActiveIdx + 1)}
                  strokeColor="#4CAF50"
                  strokeWidth={5}
                  lineCap="round"
                  lineJoin="round"
                />
              )}

              {/* Chemin restant (bleu avec flèches) */}
              {etapeActiveIdx < waypoints.length - 1 && (
                <Polyline
                  coordinates={waypoints.slice(etapeActiveIdx)}
                  strokeColor="#1565C0"
                  strokeWidth={5}
                  lineCap="round"
                  lineJoin="round"
                />
              )}

              {/* Segments entre chaque douar avec couleur selon statut */}
              {tournee.etapes.map((e, index) => {
                if (index === 0) return null;
                const prev = tournee.etapes[index - 1];
                const isParcouru = index <= etapeActiveIdx;
                return (
                  <Polyline
                    key={`segment-${e.douarId}`}
                    coordinates={[
                      { latitude: prev.lat, longitude: prev.lng },
                      { latitude: e.lat, longitude: e.lng }
                    ]}
                    strokeColor={isParcouru ? '#4CAF50' : '#1565C0'}
                    strokeWidth={isParcouru ? 6 : 4}
                    lineDashPattern={isParcouru ? [] : [10, 5]}
                    lineCap="round"
                    lineJoin="round"
                  />
                );
              })}

              {/* Marqueurs des douars avec numéros */}
              {tournee.etapes.map((e, index) => {
                const isParcouru = index < etapeActiveIdx;
                const isActif = index === etapeActiveIdx;
                return (
                  <Marker
                    key={e.douarId}
                    coordinate={{ latitude: e.lat, longitude: e.lng }}
                    title={`${e.ordre}. ${e.douarNom}`}
                    description={`${e.distanceKm}km · Priorité: ${e.priorite}`}
                  >
                    <View style={[
                      styles.markerContainer,
                      isParcouru && styles.markerParcouru,
                      isActif && styles.markerActif,
                    ]}>
                      <Text style={[
                        styles.markerText,
                        (isParcouru || isActif) && styles.markerTextActive,
                      ]}>
                        {isParcouru ? '✓' : e.ordre}
                      </Text>
                    </View>
                  </Marker>
                );
              })}

              {/* Point de départ (entrepôt) */}
              <Marker
                coordinate={waypoints[0]}
                title="Point de départ"
                description={tournee.entrepotId || 'Entrepôt'}
              >
                <View style={styles.markerEntrepot}>
                  <Ionicons name="business" size={16} color="#fff" />
                </View>
              </Marker>
            </MapView>
          )}

          {/* Légende du chemin */}
          <View style={styles.legendeContainer}>
            <View style={styles.legendeItem}>
              <View style={[styles.legendeLine, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendeText}>Parcouru</Text>
            </View>
            <View style={styles.legendeItem}>
              <View style={[styles.legendeLine, { backgroundColor: '#1565C0' }]} />
              <Text style={styles.legendeText}>À venir</Text>
            </View>
            <View style={styles.legendeItem}>
              <View style={styles.legendeLineDashed} />
              <Text style={styles.legendeText}>Prochain</Text>
            </View>
          </View>

          {/* Bottom Panel avec liste des étapes */}
          <View style={styles.modalBottomPanel}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {tournee?.etapes.map((etape, index) => (
                <TouchableOpacity 
                  key={etape.douarId} 
                  style={[
                    styles.modalStepItem,
                    index === etapeActiveIdx && styles.modalStepItemActive,
                    index < etapeActiveIdx && styles.modalStepItemDone,
                  ]}
                  onPress={() => {
                    // Centrer la carte sur cette étape
                  }}
                >
                  <View style={[
                    styles.modalStepNumber,
                    index === etapeActiveIdx && styles.modalStepNumberActive,
                    index < etapeActiveIdx && styles.modalStepNumberDone,
                  ]}>
                    <Text style={[
                      styles.modalStepNumberText,
                      (index === etapeActiveIdx || index < etapeActiveIdx) && styles.modalStepNumberTextActive,
                    ]}>
                      {index < etapeActiveIdx ? '✓' : etape.ordre}
                    </Text>
                  </View>
                  <Text style={styles.modalStepName} numberOfLines={1}>
                    {etape.douarNom}
                  </Text>
                  <Text style={styles.modalStepDistance}>{etape.distanceKm} km</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  // Bouton Commencer Mission
  startMissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
    elevation: 4,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  startMissionTextContainer: { flex: 1 },
  startMissionTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  startMissionSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },

  // Tracking
  trackingBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E8F5E9', marginHorizontal: 16, marginBottom: 8,
    paddingVertical: 8, borderRadius: 8, gap: 8,
  },
  trackingText: { color: '#2E7D32', fontSize: 14, fontWeight: '600' },

  // Mini carte
  mapPreviewContainer: {
    margin: 16, borderRadius: 12, overflow: 'hidden', elevation: 3,
    backgroundColor: '#fff', height: 180,
  },
  mapPreview: { flex: 1 },
  mapOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 6,
  },
  mapOverlayText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Section étapes
  etapesContainer: { paddingBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8, marginTop: 8, gap: 8,
  },
  sectionTitle: {
    fontSize: 17, fontWeight: '700', color: '#1A1A2E',
  },
  algoNote: {
    fontSize: 12, color: '#666', fontStyle: 'italic',
    marginHorizontal: 16, marginBottom: 12,
  },

  // Boutons
  startTourneeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1565C0', marginHorizontal: 16, marginBottom: 16,
    paddingVertical: 12, borderRadius: 10, gap: 8, elevation: 2,
  },
  startTourneeText: { color: '#fff', fontSize: 15, fontWeight: '700' },
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

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#000' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1565C0', paddingTop: 50,
    paddingBottom: 12, paddingHorizontal: 16, gap: 12,
  },
  modalCloseBtn: { padding: 4 },
  modalTitleContainer: { flex: 1 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  modalSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  modalActionBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 },
  fullMap: { flex: 1 },
  modalBottomPanel: {
    backgroundColor: '#fff', paddingVertical: 12,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  modalStepItem: {
    alignItems: 'center', paddingHorizontal: 12, minWidth: 80,
  },
  modalStepItemActive: { opacity: 1 },
  modalStepItemDone: { opacity: 0.6 },
  modalStepNumber: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  modalStepNumberActive: { backgroundColor: '#FF9800' },
  modalStepNumberDone: { backgroundColor: '#4CAF50' },
  modalStepNumberText: { fontSize: 14, fontWeight: '700', color: '#666' },
  modalStepNumberTextActive: { color: '#fff' },
  modalStepName: { fontSize: 12, fontWeight: '600', color: '#333', maxWidth: 80 },
  modalStepDistance: { fontSize: 10, color: '#888' },

  // Légende
  legendeContainer: {
    position: 'absolute',
    top: 110,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    padding: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  legendeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendeLine: {
    width: 20,
    height: 4,
    borderRadius: 2,
  },
  legendeLineDashed: {
    width: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1565C0',
    borderWidth: 1,
    borderColor: '#1565C0',
    borderStyle: 'dashed',
  },
  legendeText: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
  },

  // Marqueurs personnalisés sur la carte
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E53935',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerParcouru: {
    backgroundColor: '#4CAF50',
  },
  markerActif: {
    backgroundColor: '#FF9800',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 4,
  },
  markerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  markerTextActive: {
    fontSize: 18,
  },
  markerEntrepot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1565C0',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
