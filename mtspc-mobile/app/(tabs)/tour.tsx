/**
 * TOUR SCREEN — Itinéraire VRP Étape par Étape
 * =============================================
 *
 * Affiche la séquence optimisée des douars à desservir,
 * calculée par OR-Tools (PATH_CHEAPEST_ARC + GUIDED_LOCAL_SEARCH).
 *
 * FONCTIONNALITÉS :
 *  - Chargement de la tournée depuis AsyncStorage (mode offline)
 *  - Bouton "Pré-charger" pour télécharger le manifest au dépôt (Wi-Fi)
 *  - Timeline verticale des étapes avec code couleur TOPSIS
 *  - Barre de progression de la livraison
 *  - Suivi GPS background via useGPSTracking
 *  - Sync automatique via useNetworkSync
 *  - Bouton alerte terrain (signalement obstacle)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { tourSyncEngine }   from '../services/tourSyncEngine';
import { useGPSTracking }   from '../hooks/useGPSTracking';
import { useNetworkSync }   from '../hooks/useNetworkSync';
import { OfflineBanner }    from '../components/OfflineBanner';
import { RouteStepCard }    from '../components/RouteStepCard';
import { Tour, EtapeLivraison, PayloadAlerte, TypeAlerte } from '../types/tour';

// ── Écran principal ───────────────────────────────────────────────────────────

export default function TourScreen() {
  const router = useRouter();

  const [tour,        setTour]        = useState<Tour | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [prefetching, setPrefetching] = useState(false);
  const [tourIdInput, setTourIdInput] = useState('');
  const [alertModal,  setAlertModal]  = useState(false);
  const [alertDesc,   setAlertDesc]   = useState('');
  const [alertType,   setAlertType]   = useState<TypeAlerte>('ROAD_BLOCKED');

  const { isOnline, isSyncing, pendingCount, forceSync } = useNetworkSync();

  // Suivi GPS actif uniquement quand une tournée est active
  useGPSTracking(tour?.tourId ?? null);

  // ── Chargement depuis le stockage local ─────────────────────────────────────

  const loadTour = useCallback(async () => {
    try {
      const t = await tourSyncEngine.getTourLocal();
      setTour(t);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTour();
    }, [loadTour]),
  );

  // ── Pré-chargement du manifest (au dépôt, Wi-Fi) ────────────────────────────

  const handlePrefetch = async () => {
    const id = tourIdInput.trim();
    if (!id) {
      Alert.alert('ID requis', 'Entrez l\'identifiant de la tournée fourni par le dispatcher.');
      return;
    }
    if (!isOnline) {
      Alert.alert('Hors-ligne', 'Connectez-vous au Wi-Fi du dépôt avant de pré-charger.');
      return;
    }

    setPrefetching(true);
    try {
      const t = await tourSyncEngine.prefetchTour(id);
      setTour(t);
      setTourIdInput('');
      Alert.alert(
        '✅ Tournée chargée',
        `${t.etapes.length} douars téléchargés.\nVous pouvez maintenant partir en zone sans réseau.`,
      );
    } catch (err: any) {
      Alert.alert('Erreur de chargement', err.message ?? 'Impossible de contacter le serveur.');
    } finally {
      setPrefetching(false);
    }
  };

  // ── Signalement d'un obstacle ────────────────────────────────────────────────

  const handleSendAlert = async () => {
    if (!alertDesc.trim()) {
      Alert.alert('Description requise');
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let gps = { lat: 0, lng: 0 };

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        gps = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }

      const payload: PayloadAlerte = {
        type:        alertType,
        description: alertDesc.trim(),
        gps,
        reported_at: Date.now(),
      };

      await tourSyncEngine.reportRoadAlert(payload);
      setAlertModal(false);
      setAlertDesc('');

      Alert.alert(
        '⚠ Alerte envoyée',
        isOnline
          ? 'Le Super Admin a été notifié. Un recalcul d\'itinéraire va être lancé.'
          : 'Alerte sauvegardée. Elle sera transmise dès le retour du réseau.',
      );
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    }
  };

  // ── Calculs de progression ───────────────────────────────────────────────────

  const etapesSorted = tour
    ? [...tour.etapes].sort((a, b) => a.ordreSequence - b.ordreSequence)
    : [];

  const totalEtapes     = etapesSorted.length;
  const etapesTerminees = etapesSorted.filter((e) => e.statut !== 'pending').length;
  const distanceTotale  = etapesSorted.reduce((s, e) => s + e.distanceKm, 0);
  const etaTotal        = etapesSorted.reduce((s, e) => s + e.etaMinutes, 0);
  const progression     = totalEtapes > 0 ? etapesTerminees / totalEtapes : 0;

  // ── Rendu : pas de tournée chargée ──────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.loadingText}>Chargement de la tournée…</Text>
      </View>
    );
  }

  if (!tour) {
    return (
      <SafeAreaView style={styles.container}>
        <OfflineBanner isOnline={isOnline} isSyncing={isSyncing} pendingCount={pendingCount} />

        <View style={styles.emptyContainer}>
          <Ionicons name="map-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Aucune tournée chargée</Text>
          <Text style={styles.emptySubtitle}>
            Connectez-vous au Wi-Fi du dépôt et entrez l'identifiant de votre tournée.
          </Text>

          <View style={styles.prefetchBox}>
            <TextInput
              style={styles.tourIdInput}
              placeholder="Ex : TOUR-2026-001"
              value={tourIdInput}
              onChangeText={setTourIdInput}
              autoCapitalize="characters"
              placeholderTextColor="#94A3B8"
            />
            <TouchableOpacity
              style={[styles.prefetchBtn, (!isOnline || prefetching) && styles.btnDisabled]}
              onPress={handlePrefetch}
              disabled={!isOnline || prefetching}
            >
              {prefetching ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="cloud-download-outline" size={18} color="#fff" />
              )}
              <Text style={styles.prefetchBtnText}>
                {prefetching ? 'Téléchargement…' : 'Pré-charger la tournée'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Rendu : tournée active ───────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner isOnline={isOnline} isSyncing={isSyncing} pendingCount={pendingCount} />

      {/* ── En-tête tournée ───────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Tournée {tour.tourId}</Text>
            <Text style={styles.headerSub}>
              {etapesTerminees}/{totalEtapes} douars · {distanceTotale.toFixed(0)} km · {etaTotal} min
            </Text>
          </View>

          {/* Bouton alerte terrain */}
          <TouchableOpacity
            style={styles.alertFab}
            onPress={() => setAlertModal(true)}
          >
            <Ionicons name="warning" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Barre de progression */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progression * 100}%` }]} />
        </View>

        {/* Sync manuel si pendingCount > 0 et en ligne */}
        {pendingCount > 0 && isOnline && (
          <TouchableOpacity
            style={[styles.syncBtn, isSyncing && styles.btnDisabled]}
            onPress={forceSync}
            disabled={isSyncing}
          >
            <Ionicons name="sync" size={14} color="#fff" />
            <Text style={styles.syncBtnText}>
              {isSyncing
                ? 'Synchronisation…'
                : `Synchroniser (${pendingCount})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Liste des étapes ──────────────────────────────────── */}
      <FlatList
        data={etapesSorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadTour(); }}
            colors={['#1565C0']}
            tintColor="#1565C0"
          />
        }
        renderItem={({ item, index }) => (
          <RouteStepCard
            etape={item}
            index={index}
            isLast={index === etapesSorted.length - 1}
            onPress={() =>
              router.push({
                pathname: '/delivery-confirm',
                params:   { etapeId: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyList}>Aucune étape dans cette tournée.</Text>
        }
      />

      {/* ── Modal signalement obstacle ────────────────────────── */}
      <Modal
        visible={alertModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAlertModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>⚠ Signaler un obstacle</Text>

            {/* Type d'alerte */}
            <View style={styles.alertTypes}>
              {([
                { type: 'ROAD_BLOCKED',    label: '🚧 Route bloquée'  },
                { type: 'LANDSLIDE',       label: '⛰ Éboulement'      },
                { type: 'BRIDGE_DAMAGED',  label: '🌉 Pont endommagé' },
                { type: 'OTHER',           label: '📌 Autre'           },
              ] as { type: TypeAlerte; label: string }[]).map(({ type, label }) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.alertTypeChip, alertType === type && styles.alertTypeActive]}
                  onPress={() => setAlertType(type)}
                >
                  <Text style={[
                    styles.alertTypeText,
                    alertType === type && styles.alertTypeTextActive,
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.alertInput}
              placeholder="Décrivez la situation (lieu, gravité…)"
              multiline
              numberOfLines={3}
              value={alertDesc}
              onChangeText={setAlertDesc}
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAlertModal(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSendBtn} onPress={handleSendAlert}>
                <Text style={styles.modalSendText}>Envoyer l'alerte</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F8FAFC' },
  centered:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:   { color: '#64748B', fontSize: 14 },

  // En-tête
  header: {
    backgroundColor: '#1565C0',
    padding:         16,
    paddingTop:      20,
  },
  headerRow:     { flexDirection: 'row', alignItems: 'center' },
  headerTitle:   { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub:     { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  alertFab: {
    backgroundColor: '#E53935',
    width:           40,
    height:          40,
    borderRadius:    20,
    justifyContent:  'center',
    alignItems:      'center',
  },
  progressTrack: {
    height:          6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius:    3,
    marginTop:       12,
    overflow:        'hidden',
  },
  progressFill: {
    height:          6,
    backgroundColor: '#4ADE80',
    borderRadius:    3,
  },
  syncBtn: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius:     8,
    paddingVertical:  7,
    marginTop:        10,
    gap:              6,
  },
  syncBtnText:   { color: '#fff', fontSize: 13, fontWeight: '600' },
  btnDisabled:   { opacity: 0.5 },

  // Liste
  list:          { padding: 12, paddingBottom: 80 },
  emptyList:     { textAlign: 'center', color: '#94A3B8', marginTop: 40 },

  // Écran vide (pas de tournée)
  emptyContainer: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
    padding:        32,
    gap:            12,
  },
  emptyTitle:    { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  prefetchBox:   { width: '100%', gap: 10, marginTop: 8 },
  tourIdInput: {
    backgroundColor: '#fff',
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     '#CBD5E1',
    padding:         14,
    fontSize:        15,
    fontWeight:      '600',
    color:           '#1E293B',
    letterSpacing:   1,
  },
  prefetchBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#1565C0',
    borderRadius:    12,
    padding:         15,
    gap:             8,
  },
  prefetchBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Modal alerte
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent:  'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    padding:         24,
    paddingBottom:   40,
    gap:             14,
  },
  modalTitle:    { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  alertTypes:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  alertTypeChip: {
    borderRadius:    20,
    paddingHorizontal: 12,
    paddingVertical:   8,
    backgroundColor: '#F1F5F9',
  },
  alertTypeActive:     { backgroundColor: '#1565C0' },
  alertTypeText:       { fontSize: 13, color: '#64748B', fontWeight: '500' },
  alertTypeTextActive: { color: '#fff' },
  alertInput: {
    borderWidth:     1,
    borderColor:     '#CBD5E1',
    borderRadius:    10,
    padding:         12,
    fontSize:        14,
    color:           '#1E293B',
    textAlignVertical: 'top',
    minHeight:       80,
  },
  modalButtons:    { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex:            1,
    padding:         14,
    borderRadius:    10,
    backgroundColor: '#F1F5F9',
    alignItems:      'center',
  },
  modalCancelText: { color: '#64748B', fontWeight: '600' },
  modalSendBtn: {
    flex:            2,
    padding:         14,
    borderRadius:    10,
    backgroundColor: '#DC2626',
    alignItems:      'center',
  },
  modalSendText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
