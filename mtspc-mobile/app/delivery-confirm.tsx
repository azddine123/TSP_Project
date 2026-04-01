/**
 * DELIVERY CONFIRM SCREEN — Preuve de Livraison Terrain
 * ======================================================
 *
 * Accessible depuis TourScreen via :
 *   router.push({ pathname: '/delivery-confirm', params: { etapeId } })
 *
 * PROTOCOLE EN 4 ÉTAPES :
 *  1. Saisie des quantités réellement livrées (avec écart vs plan TOPSIS)
 *  2. Capture photo via expo-camera (preuve visuelle du déchargement)
 *  3. Signature digitale du responsable local (react-native-signature-canvas)
 *  4. Confirmation → tourSyncEngine.confirmDelivery() → AsyncStorage + SyncQueue
 *
 * TOUT FONCTIONNE HORS-LIGNE : la confirmation est sauvegardée immédiatement
 * en local et synchronisée automatiquement dès le retour du réseau.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
  SafeAreaView, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import SignatureCanvas from 'react-native-signature-canvas';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { tourSyncEngine }  from './services/tourSyncEngine';
import { useNetworkSync }  from './hooks/useNetworkSync';
import { OfflineBanner }   from './components/OfflineBanner';
import {
  EtapeLivraison, ArticleLivraison,
  PRIORITE_CONFIG, StatutEtape,
} from './types/tour';

// ── Types locaux ───────────────────────────────────────────────────────────────

interface LigneEditable extends ArticleLivraison {
  livree: number;
}

type EtapeStep = 'quantites' | 'photo' | 'signature' | 'recap';

// ── Composant principal ───────────────────────────────────────────────────────

export default function DeliveryConfirmScreen() {
  const { etapeId } = useLocalSearchParams<{ etapeId: string }>();
  const router      = useRouter();
  const { isOnline, isSyncing, pendingCount } = useNetworkSync();

  // État principal
  const [etape,     setEtape]     = useState<EtapeLivraison | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [step,      setStep]      = useState<EtapeStep>('quantites');
  const [saving,    setSaving]    = useState(false);

  // Données de confirmation
  const [lignes,       setLignes]       = useState<LigneEditable[]>([]);
  const [photoUri,     setPhotoUri]     = useState<string | null>(null);
  const [signatureB64, setSignatureB64] = useState<string | null>(null);
  const [note,         setNote]         = useState('');

  // Caméra
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showCamera,  setShowCamera]  = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Signature
  const sigRef = useRef<any>(null);

  // ── Chargement de l'étape ──────────────────────────────────────────────────

  useEffect(() => {
    if (!etapeId) { router.back(); return; }

    (async () => {
      try {
        const tour = await tourSyncEngine.getTourLocal();
        const e    = tour?.etapes.find((x) => x.id === etapeId) ?? null;
        if (!e) { Alert.alert('Étape introuvable'); router.back(); return; }

        setEtape(e);
        setLignes(
          e.articlesPlanifies.map((a) => ({
            item:    a.item,
            quantite: a.quantite,
            livree:  a.quantite,   // Pré-remplir avec la quantité planifiée
          })),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [etapeId]);

  // ── Caméra ────────────────────────────────────────────────────────────────

  const openCamera = useCallback(async () => {
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        Alert.alert('Caméra refusée', 'Activez l\'accès à la caméra dans les paramètres.');
        return;
      }
    }
    setShowCamera(true);
  }, [cameraPermission, requestCameraPermission]);

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      setPhotoUri(photo?.uri ?? null);
      setShowCamera(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de prendre la photo.');
    }
  }, []);

  // ── Confirmation finale ───────────────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    if (!etape) return;

    // Vérifications minimales
    if (!photoUri) {
      Alert.alert('Photo requise', 'Prenez une photo du déchargement avant de confirmer.');
      setStep('photo');
      return;
    }
    if (!signatureB64) {
      Alert.alert('Signature requise', 'Faites signer le responsable local du douar.');
      setStep('signature');
      return;
    }

    setSaving(true);
    try {
      // Géolocalisation de la confirmation
      let gpsLat: number | undefined;
      let gpsLng: number | undefined;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        gpsLat = loc.coords.latitude;
        gpsLng = loc.coords.longitude;
      }

      // Détecter l'écart (livraison partielle)
      const articlesLivres: ArticleLivraison[] = lignes.map((l) => ({
        item:     l.item,
        quantite: l.livree,
      }));

      const planTotal   = lignes.reduce((s, l) => s + l.quantite, 0);
      const livreTotale = lignes.reduce((s, l) => s + l.livree, 0);
      const statutFinal: StatutEtape =
        livreTotale === 0     ? 'skipped'  :
        livreTotale < planTotal ? 'partial' : 'delivered';

      // Sauvegarde + enqueue
      await tourSyncEngine.confirmDelivery({
        etapeId:        etape.id,
        statut:         statutFinal,
        articlesLivres,
        photoUri,
        signatureB64,
        noteChaufeur:   note.trim() || undefined,
        gpsLat,
        gpsLng,
      });

      Alert.alert(
        '✅ Livraison confirmée',
        isOnline
          ? 'Données envoyées au serveur.'
          : 'Données sauvegardées localement.\nElles seront synchronisées dès le retour du réseau.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Impossible de confirmer la livraison.');
    } finally {
      setSaving(false);
    }
  }, [etape, photoUri, signatureB64, lignes, note, isOnline, router]);

  // ── Rendu : états de chargement ───────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }
  if (!etape) return null;

  // ── Rendu : mode caméra ────────────────────────────────────────────────────

  if (showCamera) {
    return (
      <View style={styles.fullScreen}>
        <CameraView ref={cameraRef} style={styles.fullScreen} facing="back" />

        <View style={styles.cameraOverlay}>
          <TouchableOpacity style={styles.cameraClose} onPress={() => setShowCamera(false)}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.cameraGuide}>
            <Text style={styles.cameraGuideText}>
              Cadrez le déchargement complet du véhicule
            </Text>
          </View>
          <TouchableOpacity style={styles.captureBtn} onPress={capturePhoto}>
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Rendu : mode signature ─────────────────────────────────────────────────

  if (step === 'signature' && !signatureB64) {
    return (
      <SafeAreaView style={styles.fullScreen}>
        <View style={styles.sigHeader}>
          <TouchableOpacity onPress={() => setStep('photo')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.sigTitle}>Signature du responsable de {etape.douarNom}</Text>
        </View>
        <SignatureCanvas
          ref={sigRef}
          onOK={(sig: string) => {
            setSignatureB64(sig);
            setStep('recap');
          }}
          onEmpty={() => Alert.alert('Signature vide', 'Tracez la signature avant de valider.')}
          descriptionText="Signez ici pour attester la réception des aides"
          clearText="Effacer"
          confirmText="Valider la signature"
          webStyle={SIG_WEBSTYLE}
        />
      </SafeAreaView>
    );
  }

  // ── Rendu : écran principal (formulaire multi-étapes) ────────────────────

  const cfg         = PRIORITE_CONFIG[etape.priorite] ?? PRIORITE_CONFIG.MEDIUM;
  const planTotal   = lignes.reduce((s, l) => s + l.quantite, 0);
  const livreTotale = lignes.reduce((s, l) => s + l.livree, 0);
  const hasEcart    = livreTotale < planTotal;

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner isOnline={isOnline} isSyncing={isSyncing} pendingCount={pendingCount} />

      {/* ── En-tête ────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: cfg.color }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{etape.douarNom}</Text>
          <View style={[styles.prioriteBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.prioriteText, { color: cfg.color }]}>
              {cfg.emoji} Priorité {cfg.label}
            </Text>
          </View>
        </View>
        <Text style={styles.stepIndicator}>
          {step === 'quantites' ? '1/3' : step === 'photo' ? '2/3' : '3/3'}
        </Text>
      </View>

      {/* ── Stepper ────────────────────────────────────────────── */}
      <View style={styles.stepper}>
        {(['quantites', 'photo', 'recap'] as EtapeStep[]).map((s, i) => (
          <React.Fragment key={s}>
            <View style={[
              styles.stepDot,
              step === s && styles.stepDotActive,
              (step === 'photo' && i === 0) ||
              (step === 'recap' && i < 2) ? styles.stepDotDone : null,
            ]}>
              <Text style={styles.stepDotText}>{i + 1}</Text>
            </View>
            {i < 2 && <View style={styles.stepLine} />}
          </React.Fragment>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* ════════════════════════════════════════════════════════
            ÉTAPE 1 : Quantités livrées
            ════════════════════════════════════════════════════ */}
        {step === 'quantites' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bordereau de livraison</Text>
            <Text style={styles.sectionSub}>
              Ajustez les quantités si nécessaire (stock insuffisant, refus…)
            </Text>

            {/* Table */}
            <View style={styles.tableHead}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Article</Text>
              <Text style={styles.tableCell}>Prévu</Text>
              <Text style={styles.tableCell}>Livré</Text>
            </View>

            {lignes.map((ligne, idx) => (
              <View key={ligne.item} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2, fontWeight: '500' }]}>
                  {ligne.item}
                </Text>
                <Text style={[styles.tableCell, { color: '#64748B' }]}>
                  {ligne.quantite}
                </Text>
                <TextInput
                  style={[
                    styles.qtyInput,
                    ligne.livree < ligne.quantite && styles.qtyInputEcart,
                  ]}
                  value={String(ligne.livree)}
                  keyboardType="numeric"
                  selectTextOnFocus
                  onChangeText={(v) => {
                    const n = Math.max(0, parseInt(v, 10) || 0);
                    setLignes((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, livree: n } : x)),
                    );
                  }}
                />
              </View>
            ))}

            {/* Résumé */}
            <View style={[styles.summary, hasEcart && styles.summaryWarning]}>
              <Ionicons
                name={hasEcart ? 'warning-outline' : 'checkmark-circle-outline'}
                size={16}
                color={hasEcart ? '#D97706' : '#16A34A'}
              />
              <Text style={[styles.summaryText, { color: hasEcart ? '#D97706' : '#16A34A' }]}>
                {livreTotale}/{planTotal} unités livrées
                {hasEcart ? ' — Livraison partielle' : ' — Livraison complète'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => setStep('photo')}
            >
              <Text style={styles.nextBtnText}>Suivant — Photo</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════
            ÉTAPE 2 : Photo de preuve
            ════════════════════════════════════════════════════ */}
        {step === 'photo' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preuve photo du déchargement</Text>
            <Text style={styles.sectionSub}>
              Prenez une photo montrant le matériel déchargé sur site.
            </Text>

            {photoUri ? (
              <View>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={() => setPhotoUri(null)}
                >
                  <Ionicons name="camera-outline" size={16} color="#3B82F6" />
                  <Text style={styles.retakeText}>Reprendre la photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.photoPlaceholder} onPress={openCamera}>
                <Ionicons name="camera" size={40} color="#94A3B8" />
                <Text style={styles.photoPlaceholderText}>
                  Appuyez pour prendre une photo
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.rowBtns}>
              <TouchableOpacity
                style={styles.prevBtn}
                onPress={() => setStep('quantites')}
              >
                <Ionicons name="arrow-back" size={16} color="#64748B" />
                <Text style={styles.prevBtnText}>Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { flex: 1 }, !photoUri && styles.btnDisabled]}
                onPress={() => setStep('signature')}
                disabled={!photoUri}
              >
                <Text style={styles.nextBtnText}>Suivant — Signature</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════
            ÉTAPE 3 : Récap + Note + Confirmation
            ════════════════════════════════════════════════════ */}
        {step === 'recap' && (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Récapitulatif</Text>

              <View style={styles.recapRow}>
                <Ionicons name="camera-outline" size={18} color="#16A34A" />
                <Text style={styles.recapText}>Photo de preuve ✓</Text>
              </View>

              {signatureB64 ? (
                <>
                  <View style={styles.recapRow}>
                    <Ionicons name="create-outline" size={18} color="#16A34A" />
                    <Text style={styles.recapText}>Signature obtenue ✓</Text>
                  </View>
                  <Image source={{ uri: signatureB64 }} style={styles.sigPreview} />
                  <TouchableOpacity onPress={() => { setSignatureB64(null); setStep('signature'); }}>
                    <Text style={styles.retakeText}>↺ Resigner</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.sigBtn}
                  onPress={() => setStep('signature')}
                >
                  <Ionicons name="create-outline" size={18} color="#7C3AED" />
                  <Text style={styles.sigBtnText}>Ouvrir le pad de signature</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Note optionnelle */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Note terrain (optionnel)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Difficultés d'accès, contact local, incidents…"
                multiline
                numberOfLines={3}
                value={note}
                onChangeText={setNote}
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Bouton de confirmation final */}
            <TouchableOpacity
              style={[styles.confirmBtn, (!signatureB64 || saving) && styles.btnDisabled]}
              onPress={handleConfirm}
              disabled={!signatureB64 || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.confirmBtnText}>
                    {isOnline ? 'Confirmer et envoyer' : 'Confirmer (hors-ligne)'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const SIG_WEBSTYLE = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { border: 1px solid #E2E8F0; border-radius: 12px; }
  .m-signature-pad--footer { background: #F8FAFC; padding: 8px; }
  .button { border-radius: 8px; padding: 10px 20px; font-size: 15px; font-weight: 600; }
  .button.clear { background: #F1F5F9; color: #64748B; }
  .button.save  { background: #16A34A; color: #fff; }
`;

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F8FAFC' },
  fullScreen: { flex: 1 },
  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // En-tête
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    padding:          16,
    paddingTop:       Platform.OS === 'android' ? 40 : 16,
    backgroundColor:  '#fff',
    borderBottomWidth: 3,
    gap:              10,
  },
  backBtn:       { padding: 4 },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  prioriteBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  prioriteText:  { fontSize: 11, fontWeight: '700' },
  stepIndicator: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },

  // Stepper
  stepper: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap:             8,
  },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: { backgroundColor: '#1565C0' },
  stepDotDone:   { backgroundColor: '#16A34A' },
  stepDotText:   { fontSize: 12, fontWeight: '700', color: '#fff' },
  stepLine:      { flex: 0.3, height: 2, backgroundColor: '#E2E8F0' },

  scrollContent: { padding: 16, paddingBottom: 60 },

  // Sections
  section: {
    backgroundColor: '#fff',
    borderRadius:    12,
    padding:         14,
    marginBottom:    12,
    elevation:       2,
    shadowColor:     '#000',
    shadowOpacity:   0.05,
    shadowRadius:    4,
    shadowOffset:    { width: 0, height: 1 },
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  sectionSub:   { fontSize: 13, color: '#64748B', marginBottom: 12 },

  // Tableau des quantités
  tableHead: {
    flexDirection:    'row',
    paddingBottom:    8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom:     4,
  },
  tableRow: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingVertical:  8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  tableCell:     { flex: 1, fontSize: 13, color: '#374151' },
  qtyInput: {
    flex:          1,
    borderWidth:   1,
    borderColor:   '#CBD5E1',
    borderRadius:  6,
    paddingVertical:  6,
    paddingHorizontal: 8,
    fontSize:      14,
    fontWeight:    '700',
    color:         '#1E293B',
    textAlign:     'center',
  },
  qtyInputEcart: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },

  summary: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    marginTop:       10,
    padding:         10,
    backgroundColor: '#F0FDF4',
    borderRadius:    8,
  },
  summaryWarning: { backgroundColor: '#FFFBEB' },
  summaryText:    { fontSize: 13, fontWeight: '600' },

  // Boutons navigation
  nextBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#1565C0',
    borderRadius:    10,
    padding:         14,
    marginTop:       14,
    gap:             8,
  },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  prevBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#F1F5F9',
    borderRadius:    10,
    padding:         14,
    gap:             6,
    marginTop:       14,
    flex:            0.45,
  },
  prevBtnText:   { color: '#64748B', fontWeight: '600' },
  rowBtns:       { flexDirection: 'row', gap: 10 },
  btnDisabled:   { opacity: 0.45 },

  // Photo
  photoPlaceholder: {
    height:          200,
    borderRadius:    12,
    borderWidth:     2,
    borderColor:     '#CBD5E1',
    borderStyle:     'dashed',
    justifyContent:  'center',
    alignItems:      'center',
    gap:             8,
    backgroundColor: '#F8FAFC',
  },
  photoPlaceholderText: { color: '#94A3B8', fontSize: 14 },
  photoPreview:  { width: '100%', height: 220, borderRadius: 12 },
  retakeBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            5,
    marginTop:      8,
  },
  retakeText:    { color: '#3B82F6', fontSize: 13, textAlign: 'center' },

  // Caméra
  cameraOverlay: {
    position:       'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-between',
    padding:        20,
  },
  cameraClose: {
    alignSelf:       'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
    width:           40, height: 40, borderRadius: 20,
    justifyContent:  'center', alignItems: 'center',
  },
  cameraGuide: {
    alignSelf:       'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius:    12,
    padding:         12,
  },
  cameraGuideText: { color: '#fff', fontSize: 13 },
  captureBtn: {
    alignSelf:       'center',
    width:           72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent:  'center', alignItems: 'center',
    borderWidth:     3, borderColor: '#fff',
  },
  captureBtnInner: {
    width:         56, height: 56, borderRadius: 28,
    backgroundColor: '#fff',
  },

  // Signature
  sigHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    padding:        16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap:            10,
  },
  sigTitle:  { flex: 1, fontSize: 16, fontWeight: '700', color: '#1E293B' },
  sigBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#F5F3FF',
    borderRadius:    10,
    padding:         14,
    marginTop:       10,
    gap:             8,
    borderWidth:     2,
    borderColor:     '#DDD6FE',
    borderStyle:     'dashed',
  },
  sigBtnText:  { color: '#7C3AED', fontSize: 14, fontWeight: '600' },
  sigPreview:  { width: '100%', height: 100, borderRadius: 10, marginTop: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },

  // Récap
  recapRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  recapText:   { fontSize: 14, color: '#16A34A', fontWeight: '500' },

  // Note
  noteInput: {
    borderWidth:       1,
    borderColor:       '#CBD5E1',
    borderRadius:      10,
    padding:           12,
    fontSize:          14,
    color:             '#374151',
    textAlignVertical: 'top',
    minHeight:         80,
  },

  // Bouton confirmation final
  confirmBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#16A34A',
    borderRadius:    14,
    padding:         18,
    margin:          16,
    marginTop:       4,
    gap:             10,
    elevation:       4,
    shadowColor:     '#16A34A',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.3,
    shadowRadius:    6,
  },
  confirmBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
