/**
 * ÉCRAN DÉTAIL MISSION — Carte + Validation Hors-Ligne
 * =====================================================
 * Accessible depuis HomeScreen via : router.push('/mission-detail?id=...')
 *
 * FONCTIONS CRITIQUES :
 * ─────────────────────
 * 1. Carte react-native-maps centrée sur la destination sinistrée
 * 2. Inventaire logistique (tentes, médicaments, eau) à livrer
 * 3. Bouton "Confirmer la Livraison" :
 *    → Si connecté  : PATCH /missions/:id/statut → completed (+ audit_log)
 *    → Si hors-ligne : syncService.savePendingSubmission() → AsyncStorage
 *      → L'entrée sera envoyée plus tard via le bouton Sync rouge de HomeScreen
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import NetInfo   from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { missionService } from './services/missionService';
import { syncService }    from './services/syncService';
import { Mission, MissionStatut } from './types/app';

const STATUT_LABEL: Record<MissionStatut, string> = {
  draft:       'Brouillon',
  pending:     'En attente',
  in_progress: 'En cours',
  completed:   'Terminée',
  annulee:     'Annulée',
};

const CATEGORIE_EMOJI: Record<string, string> = {
  TENTE:      '⛺',
  EAU:        '💧',
  MEDICAMENT: '💊',
  NOURRITURE: '🍞',
  EQUIPEMENT: '🔧',
  AUTRE:      '📦',
};

export default function MissionDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();

  const [mission,   setMission]   = useState<Mission | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [isOnline,  setIsOnline]  = useState(true);
  const [validating, setValidating] = useState(false);
  const [commentaire, setCommentaire] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!id) return;

    // Charger la mission et la connectivité en parallèle
    Promise.all([
      missionService.getMissionById(id),
      NetInfo.fetch(),
      Location.requestForegroundPermissionsAsync(),
    ]).then(async ([m, net, locPerm]) => {
      setMission(m);
      setIsOnline(!!(net.isConnected && net.isInternetReachable));

      // Récupérer la position GPS du chauffeur
      if (locPerm.status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      }
    }).catch((err) => {
      Alert.alert('Erreur', 'Impossible de charger la mission.');
      router.back();
    }).finally(() => setLoading(false));

    // Écouter les changements de connectivité
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable));
    });
    return unsub;
  }, [id]);

  // ── Valider la livraison ──────────────────────────────────────────────────

  const handleValider = async () => {
    if (!mission) return;

    Alert.alert(
      'Confirmer la livraison',
      `Êtes-vous sûr de vouloir marquer la mission ${mission.numeroMission} comme LIVRÉE ?${
        !isOnline ? '\n\n⚠️ Vous êtes hors-ligne. La confirmation sera sauvegardée localement et envoyée au serveur dès le retour du réseau.' : ''
      }`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text:  isOnline ? '✅ Confirmer' : '💾 Sauvegarder hors-ligne',
          style: 'default',
          onPress: doValidate,
        },
      ],
    );
  };

  const doValidate = async () => {
    if (!mission) return;
    setValidating(true);

    try {
      if (isOnline) {
        // ── CAS 1 : ONLINE → envoi direct à l'API ───────────────
        await missionService.updateStatut(mission.id, 'completed');
        Alert.alert(
          '✅ Livraison confirmée',
          'Le statut a été mis à jour et enregistré dans l\'audit trail.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        // ── CAS 2 : OFFLINE → sauvegarde locale (demo jury) ─────
        await syncService.savePendingSubmission({
          missionId:         mission.id,
          statut:            'completed',
          commentaireTerrain: commentaire || undefined,
          livraisonLat:      userLocation?.lat,
          livraisonLng:      userLocation?.lng,
          timestampLocal:    new Date().toISOString(),
          tentativeSync:     0,
        });

        Alert.alert(
          '💾 Sauvegardé hors-ligne',
          `La confirmation de livraison pour la mission ${mission.numeroMission} a été enregistrée localement.\n\nElle sera synchronisée automatiquement dès le retour du réseau via le bouton "Synchroniser" de l'écran d'accueil.`,
          [{ text: 'OK', onPress: () => router.back() }],
        );
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de valider la livraison.');
    } finally {
      setValidating(false);
    }
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  if (!mission) return null;

  const hasCoords = mission.destinationLat !== null && mission.destinationLng !== null;
  const destRegion = hasCoords
    ? {
        latitude:       mission.destinationLat!,
        longitude:      mission.destinationLng!,
        latitudeDelta:  0.05,
        longitudeDelta: 0.05,
      }
    : null;

  const canValidate =
    mission.statut !== 'completed' && mission.statut !== 'annulee';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>

      {/* ── En-tête ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{mission.numeroMission}</Text>
          <Text style={styles.headerSub}>{STATUT_LABEL[mission.statut]}</Text>
        </View>
        {!isOnline && (
          <View style={styles.offlineIndicator}>
            <Ionicons name="cloud-offline" size={14} color="#fff" />
            <Text style={styles.offlineText}>Hors-ligne</Text>
          </View>
        )}
      </View>

      {/* ── Carte react-native-maps ───────────────────────────── */}
      {destRegion ? (
        <View style={styles.mapContainer}>
          <MapView
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={destRegion}
            showsUserLocation
            showsMyLocationButton
          >
            {/* Marqueur destination sinistrée */}
            <Marker
              coordinate={{
                latitude:  mission.destinationLat!,
                longitude: mission.destinationLng!,
              }}
              title={mission.destinationNom}
              description="Zone sinistrée — Point de livraison"
              pinColor="#E53935"
            />

            {/* Marqueur position chauffeur */}
            {userLocation && (
              <Marker
                coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
                title="Votre position"
                pinColor="#1565C0"
              />
            )}
          </MapView>
          <Text style={styles.mapCaption}>
            📍 {mission.destinationNom}
          </Text>
        </View>
      ) : (
        <View style={styles.noMapContainer}>
          <Ionicons name="map-outline" size={32} color="#bbb" />
          <Text style={styles.noMapText}>
            Coordonnées GPS non renseignées pour cette mission.
          </Text>
        </View>
      )}

      {/* ── Détails de la mission ─────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations de livraison</Text>

        <InfoRow icon="business"     label="Entrepôt"    value={mission.entrepotNom} />
        <InfoRow icon="location"     label="Destination" value={mission.destinationNom} />
        <InfoRow icon="flag"         label="Priorité"    value={mission.priorite.toUpperCase()} />
        <InfoRow icon="calendar"     label="Échéance"
          value={new Date(mission.dateEcheance).toLocaleString('fr-MA')} />

        {mission.notes && (
          <InfoRow icon="document-text" label="Notes" value={mission.notes} />
        )}
      </View>

      {/* ── Inventaire à livrer ───────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inventaire à livrer</Text>
        {mission.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemEmoji}>
              {CATEGORIE_EMOJI[item.categorie] || '📦'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.materielNom}</Text>
              <Text style={styles.itemQty}>
                {item.quantiteLivree !== null
                  ? `${item.quantiteLivree} / ${item.quantitePrevue} ${item.unite} livrés`
                  : `${item.quantitePrevue} ${item.unite} à livrer`}
              </Text>
            </View>
            {item.quantiteLivree === item.quantitePrevue && (
              <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
            )}
          </View>
        ))}
      </View>

      {/* ── Commentaire terrain ───────────────────────────────── */}
      {canValidate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commentaire terrain (optionnel)</Text>
          <TextInput
            style={styles.commentInput}
            multiline
            numberOfLines={3}
            placeholder="Difficultés d'accès, contact sur place, remarques…"
            value={commentaire}
            onChangeText={setCommentaire}
            placeholderTextColor="#bbb"
          />
        </View>
      )}

      {/* ── Bouton de validation ──────────────────────────────── */}
      {canValidate && (
        <TouchableOpacity
          style={[
            styles.validateButton,
            !isOnline && styles.validateButtonOffline,
            validating && { opacity: 0.7 },
          ]}
          onPress={handleValider}
          disabled={validating}
          activeOpacity={0.85}
        >
          {validating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons
              name={isOnline ? 'checkmark-circle' : 'save'}
              size={22}
              color="#fff"
            />
          )}
          <Text style={styles.validateButtonText}>
            {validating
              ? 'Validation…'
              : isOnline
                ? '✅  Confirmer la Livraison'
                : '💾  Sauvegarder (Mode Hors-Ligne)'}
          </Text>
        </TouchableOpacity>
      )}

      {mission.statut === 'completed' && (
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          <Text style={styles.completedText}>Mission terminée</Text>
        </View>
      )}

    </ScrollView>
  );
}

// ── Composant utilitaire ────────────────────────────────────────────────────

function InfoRow({
  icon, label, value,
}: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color="#666" style={{ width: 22 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F4F6F9' },
  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: '#1565C0',
    flexDirection:   'row',
    alignItems:      'center',
    paddingTop:      52,
    paddingBottom:   16,
    paddingHorizontal: 16,
    gap:             12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color:      '#fff',
    fontSize:   18,
    fontWeight: '700',
  },
  headerSub: {
    color:    'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  offlineIndicator: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: 'rgba(229,57,53,0.8)',
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:    12,
    gap:             4,
  },
  offlineText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  mapContainer: {
    margin:       16,
    borderRadius: 12,
    overflow:     'hidden',
    elevation:    3,
  },
  map: { height: 250, width: '100%' },
  mapCaption: {
    backgroundColor: '#fff',
    padding:         10,
    fontSize:        13,
    color:           '#555',
    textAlign:       'center',
  },
  noMapContainer: {
    alignItems:     'center',
    justifyContent: 'center',
    margin:         16,
    padding:        30,
    backgroundColor: '#fff',
    borderRadius:   12,
    gap:            8,
  },
  noMapText: { color: '#bbb', fontSize: 13, textAlign: 'center' },

  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom:    12,
    borderRadius:    12,
    padding:         16,
  },
  sectionTitle: {
    fontSize:     15,
    fontWeight:   '700',
    color:        '#1A237E',
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    marginBottom:   8,
    gap:            6,
  },
  infoLabel: { width: 80, fontSize: 13, color: '#888', fontWeight: '500' },
  infoValue: { flex: 1, fontSize: 13, color: '#333', fontWeight: '600' },

  itemRow: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 10,
  },
  itemEmoji: { fontSize: 22 },
  itemName:  { fontSize: 14, fontWeight: '600', color: '#333' },
  itemQty:   { fontSize: 12, color: '#888', marginTop: 2 },

  commentInput: {
    borderWidth:  1,
    borderColor:  '#E0E0E0',
    borderRadius: 8,
    padding:      12,
    fontSize:     14,
    color:        '#333',
    textAlignVertical: 'top',
    minHeight:    80,
  },

  validateButton: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#2E7D32',
    marginHorizontal: 16,
    marginBottom:    16,
    paddingVertical: 16,
    borderRadius:    12,
    gap:             10,
    elevation:       4,
  },
  validateButtonOffline: {
    backgroundColor: '#E65100',  // Orange pour le mode hors-ligne
  },
  validateButtonText: {
    color:      '#fff',
    fontSize:   16,
    fontWeight: '700',
  },

  completedBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#E8F5E9',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius:    12,
    gap:             8,
  },
  completedText: {
    color:      '#2E7D32',
    fontSize:   16,
    fontWeight: '700',
  },
});
