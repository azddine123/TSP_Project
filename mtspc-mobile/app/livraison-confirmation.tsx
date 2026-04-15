/**
 * LIVRAISON CONFIRMATION SCREEN v2.0
 * ==================================
 * Écran de confirmation avec design premium et navigation
 * fluide en 4 étapes : Bordereau → Photo → Signature → Récap
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGpsTracking } from './hooks/useGpsTracking';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeInRight, Layout } from 'react-native-reanimated';

import BordereauDouar from '../components/BordereauDouar';
import SignatureCanvas from '../components/SignatureCanvas';
import { syncService } from '../services/syncService';
import { EtapeVRP, DouarLivraison } from '../types/app';
import { API_BASE_URL } from '../config/keycloakConfig';
import * as SecureStore from 'expo-secure-store';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../theme';

const TOKEN_KEY = 'reliefchain_access_token';

interface QuantitesReelles {
  tentes: number;
  couvertures: number;
  vivres: number;
  kits_med: number;
  eau_litres: number;
}

type Step = 'bordereau' | 'photo' | 'signature' | 'recap';

const STEPS: Step[] = ['bordereau', 'photo', 'signature', 'recap'];
const stepLabels = ['Bordereau', 'Photo', 'Signature', 'Récap'];
const stepIcons = ['document-text', 'camera', 'create', 'checkmark-circle'];

// ═══════════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ═══════════════════════════════════════════════════════════════════════════════

const StepIndicator: React.FC<{ 
  steps: Step[]; 
  currentStep: Step; 
  labels: string[];
  icons: string[];
}> = ({ steps, currentStep, labels, icons }) => {
  const currentIndex = steps.indexOf(currentStep);
  
  return (
    <View style={styles.stepBar}>
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isPending = i > currentIndex;
        
        return (
          <React.Fragment key={step}>
            <View style={styles.stepItem}>
              <Animated.View style={[
                styles.stepCircle,
                isCompleted && styles.stepCircleCompleted,
                isCurrent && styles.stepCircleCurrent,
                isPending && styles.stepCirclePending,
              ]}>
                {isCompleted ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Ionicons 
                    name={icons[i] as any} 
                    size={16} 
                    color={isCurrent ? COLORS.primary[800] : COLORS.text.tertiary} 
                  />
                )}
              </Animated.View>
              <Text style={[
                styles.stepLabel,
                isCurrent && styles.stepLabelCurrent,
                isCompleted && styles.stepLabelCompleted,
              ]}>
                {labels[i]}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[
                styles.stepLine,
                isCompleted && styles.stepLineCompleted,
              ]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const RecapItem: React.FC<{ icon: string; label: string; ok: boolean; optional?: boolean }> = ({ 
  icon, label, ok, optional 
}) => (
  <View style={styles.recapItem}>
    <View style={[styles.recapIconContainer, { backgroundColor: ok ? COLORS.success[50] : COLORS.surfaceVariant }]}>
      <Ionicons name={icon as any} size={18} color={ok ? COLORS.success.dark : COLORS.text.tertiary} />
    </View>
    <Text style={styles.recapItemLabel}>{label}</Text>
    {optional && !ok ? (
      <View style={styles.optionalBadge}>
        <Text style={styles.optionalText}>Optionnel</Text>
      </View>
    ) : (
      <Ionicons
        name={ok ? 'checkmark-circle' : 'close-circle'}
        size={22}
        color={ok ? COLORS.success.main : COLORS.error.main}
      />
    )}
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function LivraisonConfirmationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    tourneeId: string;
    douarId: string;
    etapeJson: string;
  }>();

  const etape: EtapeVRP = JSON.parse(params.etapeJson ?? '{}');
  
  // Lire la position GPS courante (tracking déjà démarré depuis mission-detail)
  const { currentPosition } = useGpsTracking({ enabled: false });

  const [currentStep, setCurrentStep] = useState<Step>('bordereau');
  const currentIndex = STEPS.indexOf(currentStep);
  const [quantitesReelles, setQuantitesReelles] = useState<QuantitesReelles | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goNext = () => {
    const next = STEPS[currentIndex + 1];
    if (next) setCurrentStep(next);
  };
  
  const goPrev = () => {
    const prev = STEPS[currentIndex - 1];
    if (prev) setCurrentStep(prev);
  };

  const handlePickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission caméra refusée', 'Accordez l\'accès à la caméra pour prendre la photo de preuve.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const handlePickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!quantitesReelles) {
      Alert.alert('Erreur', 'Renseignez les quantités livrées.');
      return;
    }

    // Vérifier que toutes les quantités sont >= 0
    const hasNegative = Object.values(quantitesReelles).some(v => v < 0);
    if (hasNegative) {
      Alert.alert('Erreur', 'Toutes les quantités doivent être positives ou nulles.');
      return;
    }

    if (!signatureBase64) {
      Alert.alert('Signature manquante', 'La signature du responsable local est obligatoire.');
      return;
    }

    // Vérifier livraison < 50 % pour certains items
    const LABEL_MAP: Record<string, string> = {
      tentes: 'Tentes', couvertures: 'Couvertures', vivres: 'Vivres alimentaires',
      kits_med: 'Kits médicaux', eau_litres: 'Eau (litres)',
    };
    const prevues = etape.ressources ?? {};
    const lowItems: string[] = Object.entries(quantitesReelles)
      .filter(([key, val]) => {
        const prevue = (prevues as Record<string, number>)[key] ?? 0;
        return prevue > 0 && val < prevue * 0.5;
      })
      .map(([key]) => LABEL_MAP[key] ?? key);

    if (lowItems.length > 0) {
      const confirmed = await new Promise<boolean>(resolve => {
        Alert.alert(
          'Livraison partielle',
          `Vous délivrez moins de 50 % :\n${lowItems.join(', ')}.\nConfirmer ?`,
          [
            { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Confirmer', onPress: () => resolve(true) },
          ],
        );
      });
      if (!confirmed) return;
    }

    setIsSubmitting(true);

    const livraison: DouarLivraison = {
      tourneeId: params.tourneeId,
      douarId: params.douarId,
      douarNom: etape.douarNom,
      quantitesReelles,
      commentaire: commentaire || undefined,
      photoUri: photoUri || undefined,
      signatureBase64,
      timestampLocal: new Date().toISOString(),
      lat: currentPosition?.lat ?? undefined,
      lng: currentPosition?.lng ?? undefined,
      tentativeSync: 0,
    };

    try {
      const netState = await NetInfo.fetch();
      const isOnline = !!(netState.isConnected && netState.isInternetReachable);

      if (isOnline) {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const res = await fetch(`${API_BASE_URL}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({ submissions: [{ missionId: params.tourneeId, douarId: params.douarId, livraison, statut: 'completed', timestampLocal: livraison.timestampLocal, tentativeSync: 0 }] }),
        });

        if (!res.ok) throw new Error(`Erreur serveur : ${res.status}`);

        Alert.alert(
          '✅ Livraison confirmée',
          `${etape.douarNom} — Données envoyées au serveur avec succès.`,
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        await syncService.savePendingSubmission({
          missionId: params.tourneeId,
          douarId: params.douarId,
          statut: 'completed',
          commentaireTerrain: commentaire || undefined,
          livraisonLat: livraison.lat,
          livraisonLng: livraison.lng,
          timestampLocal: livraison.timestampLocal,
          tentativeSync: 0,
          livraison,
        });

        Alert.alert(
          '📦 Livraison sauvegardée hors-ligne',
          'Les données seront envoyées automatiquement dès le retour du réseau.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de confirmer la livraison.');
    } finally {
      setIsSubmitting(false);
    }
  }, [quantitesReelles, signatureBase64, commentaire, photoUri, etape, params, router, currentPosition]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Confirmation Livraison</Text>
            <Text style={styles.headerSub}>{etape.douarNom}</Text>
          </View>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Étape {currentIndex + 1}/4</Text>
          </View>
        </View>

        {/* Step Indicator */}
        <StepIndicator 
          steps={STEPS} 
          currentStep={currentStep} 
          labels={stepLabels}
          icons={stepIcons}
        />

        {/* Content */}
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          
          {/* ÉTAPE 1: BORDEREAU */}
          {currentStep === 'bordereau' && (
            <Animated.View entering={FadeInRight.duration(300)}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="document-text" size={20} color={COLORS.primary[800]} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Quantités à livrer</Text>
                  <Text style={styles.sectionSubtitle}>Vérifiez et ajustez si nécessaire</Text>
                </View>
              </View>
              <BordereauDouar etape={etape} onQuantitesChange={setQuantitesReelles} />
            </Animated.View>
          )}

          {/* ÉTAPE 2: PHOTO */}
          {currentStep === 'photo' && (
            <Animated.View entering={FadeInRight.duration(300)} style={styles.photoSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="camera" size={20} color={COLORS.primary[800]} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Photo de preuve</Text>
                  <Text style={styles.sectionSubtitle}>Documentez le déchargement</Text>
                </View>
              </View>

              {photoUri ? (
                <Animated.View entering={FadeInUp.duration(400)} style={styles.photoPreview}>
                  <Image source={{ uri: photoUri }} style={styles.photoImage} />
                  <TouchableOpacity style={styles.retakeBtn} onPress={() => setPhotoUri(null)}>
                    <Ionicons name="camera-reverse" size={18} color={COLORS.primary[800]} />
                    <Text style={styles.retakeBtnText}>Reprendre</Text>
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <View style={styles.photoButtons}>
                  <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
                    <View style={styles.photoBtnIconContainer}>
                      <Ionicons name="camera" size={32} color={COLORS.primary[800]} />
                    </View>
                    <Text style={styles.photoBtnText}>Appareil photo</Text>
                    <Text style={styles.photoBtnSubtext}>Recommandé</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoBtn} onPress={handlePickFromLibrary}>
                    <View style={styles.photoBtnIconContainer}>
                      <Ionicons name="images" size={32} color={COLORS.primary[800]} />
                    </View>
                    <Text style={styles.photoBtnText}>Galerie</Text>
                    <Text style={styles.photoBtnSubtext}>Photo existante</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!photoUri && (
                <View style={styles.photoWarning}>
                  <Ionicons name="information-circle" size={16} color={COLORS.warning.dark} />
                  <Text style={styles.photoWarningText}>
                    Photo optionnelle mais fortement recommandée comme preuve terrain
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* ÉTAPE 3: SIGNATURE */}
          {currentStep === 'signature' && (
            <Animated.View entering={FadeInRight.duration(300)} style={styles.signatureSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="create" size={20} color={COLORS.primary[800]} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Signature obligatoire</Text>
                  <Text style={styles.sectionSubtitle}>Du responsable ou mukhtâr local</Text>
                </View>
              </View>

              <View style={styles.signatureWrapper}>
                <SignatureCanvas
                  width={340}
                  height={200}
                  onSigned={setSignatureBase64}
                  onCleared={() => setSignatureBase64(null)}
                />
              </View>
              
              {signatureBase64 && (
                <Animated.View entering={FadeInUp.duration(300)} style={styles.signatureSuccess}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success.main} />
                  <Text style={styles.signatureSuccessText}>Signature enregistrée</Text>
                </Animated.View>
              )}
            </Animated.View>
          )}

          {/* ÉTAPE 4: RÉCAP */}
          {currentStep === 'recap' && (
            <Animated.View entering={FadeInRight.duration(300)} style={styles.recapSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary[800]} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Résumé avant envoi</Text>
                  <Text style={styles.sectionSubtitle}>Vérifiez toutes les informations</Text>
                </View>
              </View>

              <View style={styles.recapCard}>
                <RecapItem icon="document-text-outline" label="Bordereau complété" ok={!!quantitesReelles} />
                <RecapItem icon="camera-outline" label="Photo de preuve" ok={!!photoUri} optional />
                <RecapItem icon="create-outline" label="Signature responsable" ok={!!signatureBase64} />
              </View>

              <Text style={styles.commentLabel}>Commentaire terrain (optionnel)</Text>
              <TextInput
                style={styles.commentInput}
                value={commentaire}
                onChangeText={setCommentaire}
                placeholder="Route difficile, accès restreint, population présente..."
                placeholderTextColor={COLORS.text.tertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View style={styles.syncInfo}>
                <View style={styles.syncIconContainer}>
                  <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary[800]} />
                </View>
                <Text style={styles.syncInfoText}>
                  Les données seront envoyées immédiatement en ligne, ou stockées localement en mode hors-ligne.
                </Text>
              </View>
            </Animated.View>
          )}

          <View style={{ height: SPACING.xl }} />
        </ScrollView>

        {/* Navigation */}
        <View style={[styles.navButtons, { paddingBottom: insets.bottom + SPACING.md }]}>
          {currentIndex > 0 ? (
            <TouchableOpacity style={styles.prevBtn} onPress={goPrev}>
              <Ionicons name="arrow-back" size={20} color={COLORS.text.secondary} />
              <Text style={styles.prevBtnText}>Retour</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 100 }} />
          )}

          {currentStep !== 'recap' ? (
            <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
              <Text style={styles.nextBtnText}>Continuer</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
              )}
              <Text style={styles.submitBtnText}>
                {isSubmitting ? 'Envoi...' : 'Confirmer'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[800],
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  backBtn: { 
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: `${COLORS.text.inverse}15`,
  },
  headerContent: { 
    flex: 1 
  },
  headerTitle: { 
    fontSize: TYPOGRAPHY.size.lg, 
    fontWeight: '800', 
    color: COLORS.text.inverse 
  },
  headerSub: { 
    fontSize: TYPOGRAPHY.size.sm, 
    color: `${COLORS.text.inverse}80` 
  },
  stepBadge: {
    backgroundColor: `${COLORS.text.inverse}20`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  stepBadgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: COLORS.text.inverse,
  },

  // Step Bar
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    ...SHADOWS.xs,
  },
  stepItem: { 
    alignItems: 'center', 
    gap: SPACING.xs 
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border.light,
  },
  stepCircleCompleted: { 
    backgroundColor: COLORS.success.main,
    borderColor: COLORS.success.main,
  },
  stepCircleCurrent: { 
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[800],
  },
  stepCirclePending: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border.light,
  },
  stepLabel: { 
    fontSize: TYPOGRAPHY.size.xs, 
    fontWeight: '600',
    color: COLORS.text.tertiary,
  },
  stepLabelCurrent: { 
    color: COLORS.primary[800],
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: COLORS.success.dark,
  },
  stepLine: { 
    flex: 1, 
    height: 2, 
    backgroundColor: COLORS.border.light, 
    marginHorizontal: 4, 
    marginBottom: 18 
  },
  stepLineCompleted: { 
    backgroundColor: COLORS.success.main 
  },

  // Content
  content: { 
    paddingTop: SPACING.md 
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  sectionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
  },

  // Photo
  photoSection: { 
    paddingTop: SPACING.sm 
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.lg,
  },
  photoBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    flex: 1,
    ...SHADOWS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary[100],
  },
  photoBtnIconContainer: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS['2xl'],
    backgroundColor: COLORS.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  photoBtnText: { 
    fontSize: TYPOGRAPHY.size.base, 
    color: COLORS.text.primary, 
    fontWeight: '700',
    marginBottom: 2,
  },
  photoBtnSubtext: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.tertiary,
  },
  photoPreview: { 
    alignItems: 'center', 
    gap: SPACING.md, 
    marginTop: SPACING.md 
  },
  photoImage: { 
    width: 280, 
    height: 200, 
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.md,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  retakeBtnText: { 
    fontSize: TYPOGRAPHY.size.base, 
    color: COLORS.primary[800], 
    fontWeight: '700' 
  },
  photoWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning[50],
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.warning.light,
  },
  photoWarningText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.warning.dark,
    fontWeight: '500',
  },

  // Signature
  signatureSection: { 
    paddingTop: SPACING.sm 
  },
  signatureWrapper: { 
    alignItems: 'center', 
    marginTop: SPACING.md 
  },
  signatureSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.success[50],
    borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.lg,
  },
  signatureSuccessText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: '700',
    color: COLORS.success.dark,
  },

  // Récap
  recapSection: { 
    paddingTop: SPACING.sm 
  },
  recapCard: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.sm,
    gap: SPACING.sm,
  },
  recapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
  },
  recapIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recapItemLabel: { 
    flex: 1, 
    fontSize: TYPOGRAPHY.size.base, 
    fontWeight: '700', 
    color: COLORS.text.primary 
  },
  optionalBadge: {
    backgroundColor: COLORS.warning[50],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  optionalText: { 
    fontSize: TYPOGRAPHY.size.xs, 
    color: COLORS.warning.dark, 
    fontWeight: '700' 
  },
  commentLabel: { 
    fontSize: TYPOGRAPHY.size.base, 
    fontWeight: '700', 
    color: COLORS.text.primary,
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  commentInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    minHeight: 100,
    ...SHADOWS.xs,
    marginHorizontal: SPACING.lg,
  },
  syncInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary[100],
  },
  syncIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncInfoText: { 
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm, 
    color: COLORS.text.secondary, 
    lineHeight: 20 
  },

  // Navigation
  navButtons: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    ...SHADOWS.lg,
  },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  prevBtnText: { 
    fontSize: TYPOGRAPHY.size.base, 
    color: COLORS.text.secondary, 
    fontWeight: '700' 
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[800],
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.primary,
  },
  nextBtnText: { 
    color: COLORS.text.inverse, 
    fontSize: TYPOGRAPHY.size.base, 
    fontWeight: '800' 
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success.dark,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.success,
  },
  submitBtnDisabled: { 
    backgroundColor: COLORS.success.light,
    ...SHADOWS.none,
  },
  submitBtnText: { 
    color: COLORS.text.inverse, 
    fontSize: TYPOGRAPHY.size.base, 
    fontWeight: '800' 
  },
});
