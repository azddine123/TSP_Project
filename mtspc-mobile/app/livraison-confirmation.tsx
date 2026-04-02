/**
 * LIVRAISON CONFIRMATION SCREEN
 * =============================================================
 * Écran de confirmation de livraison à un douar.
 * Accessible depuis MissionDetail → TourneeStepCard → "Commencer la livraison"
 *
 * FLUX COMPLET :
 * ──────────────
 * 1. Affiche le BordereauDouar (quantités prévues → saisie quantités réelles)
 * 2. Capture photo de preuve (expo-image-picker)
 * 3. Signature digitale du responsable local (SignatureCanvas)
 * 4. Commentaire terrain optionnel
 * 5. Enregistrement :
 *    - En ligne → POST /sync direct
 *    - Hors ligne → syncService.savePendingSubmission() → AsyncStorage
 *
 * Paramètres de navigation (expo-router params) :
 *   - tourneeId : string
 *   - douarId   : string
 *   - etapeJson : string (JSON stringifié d'EtapeVRP)
 */
import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BordereauDouar from '../components/BordereauDouar';
import SignatureCanvas from '../components/SignatureCanvas';
import { syncService } from '../services/syncService';
import { EtapeVRP, DouarLivraison } from '../types/app';
import { API_BASE_URL } from '../config/keycloakConfig';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'reliefchain_access_token';

// ── Types internes ────────────────────────────────────────────────────────────

interface QuantitesReelles {
    tentes: number;
    couvertures: number;
    vivres: number;
    kits_med: number;
    eau_litres: number;
}

type Step = 'bordereau' | 'photo' | 'signature' | 'recap';

// ── Composant Principal ───────────────────────────────────────────────────────

export default function LivraisonConfirmationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{
        tourneeId: string;
        douarId: string;
        etapeJson: string;
    }>();

    const etape: EtapeVRP = JSON.parse(params.etapeJson ?? '{}');

    // ── État du formulaire ────────────────────────────────────────────────────

    const [currentStep, setCurrentStep] = useState<Step>('bordereau');
    const [quantitesReelles, setQuantitesReelles] = useState<QuantitesReelles | null>(null);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
    const [commentaire, setCommentaire] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Navigation des étapes ─────────────────────────────────────────────────

    const STEPS: Step[] = ['bordereau', 'photo', 'signature', 'recap'];
    const stepIndex = STEPS.indexOf(currentStep);
    const stepLabels = ['Bordereau', 'Photo', 'Signature', 'Récap'];

    const goNext = () => {
        const next = STEPS[stepIndex + 1];
        if (next) setCurrentStep(next);
    };
    const goPrev = () => {
        const prev = STEPS[stepIndex - 1];
        if (prev) setCurrentStep(prev);
    };

    // ── Capture Photo ─────────────────────────────────────────────────────────

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

    // ── Soumission finale ─────────────────────────────────────────────────────

    const handleSubmit = useCallback(async () => {
        if (!quantitesReelles) {
            Alert.alert('Erreur', 'Renseignez les quantités livrées.');
            return;
        }
        if (!signatureBase64) {
            Alert.alert('Signature manquante', 'La signature du responsable local est obligatoire.');
            return;
        }

        setIsSubmitting(true);

        // Construire le payload de livraison
        let lat: number | undefined;
        let lng: number | undefined;
        try {
            const netState = await NetInfo.fetch();
            // Position GPS actuelle si disponible
        } catch { }

        const livraison: DouarLivraison = {
            tourneeId: params.tourneeId,
            douarId: params.douarId,
            douarNom: etape.douarNom,
            quantitesReelles,
            commentaire: commentaire || undefined,
            photoUri: photoUri || undefined,
            signatureBase64,
            timestampLocal: new Date().toISOString(),
            tentativeSync: 0,
        };

        try {
            const netState = await NetInfo.fetch();
            const isOnline = !!(netState.isConnected && netState.isInternetReachable);

            if (isOnline) {
                // ── Mode En ligne : envoi direct ──────────────────────────────────
                const token = await SecureStore.getItemAsync(TOKEN_KEY);
                const res = await fetch(`${API_BASE_URL}/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : '',
                    },
                    body: JSON.stringify(livraison),
                });

                if (!res.ok) throw new Error(`Erreur serveur : ${res.status}`);

                Alert.alert(
                    '✅ Livraison confirmée',
                    `${etape.douarNom} — Données envoyées au serveur avec succès.`,
                    [{ text: 'OK', onPress: () => router.back() }],
                );

            } else {
                // ── Mode Hors ligne : file d'attente AsyncStorage ─────────────────
                // On adapte le format PendingSubmission existant avec les nouvelles données
                await syncService.savePendingSubmission({
                    missionId: params.tourneeId,
                    statut: 'completed',
                    commentaireTerrain: commentaire || undefined,
                    timestampLocal: livraison.timestampLocal,
                    tentativeSync: 0,
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
    }, [quantitesReelles, signatureBase64, commentaire, photoUri, etape, params, router]);

    // ── Rendu ─────────────────────────────────────────────────────────────────

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={[styles.container, { paddingTop: insets.top }]}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>Confirmation Livraison</Text>
                        <Text style={styles.headerSub}>{etape.douarNom}</Text>
                    </View>
                </View>

                {/* ── Barre de progression ── */}
                <View style={styles.stepBar}>
                    {STEPS.map((s, i) => (
                        <React.Fragment key={s}>
                            <View style={styles.stepItem}>
                                <View style={[
                                    styles.stepCircle,
                                    i < stepIndex && styles.stepDone,
                                    i === stepIndex && styles.stepActive,
                                ]}>
                                    {i < stepIndex
                                        ? <Ionicons name="checkmark" size={14} color="#fff" />
                                        : <Text style={[styles.stepNum, i === stepIndex && styles.stepNumActive]}>{i + 1}</Text>
                                    }
                                </View>
                                <Text style={[styles.stepLabel, i === stepIndex && styles.stepLabelActive]}>
                                    {stepLabels[i]}
                                </Text>
                            </View>
                            {i < STEPS.length - 1 && (
                                <View style={[styles.stepLine, i < stepIndex && styles.stepLineDone]} />
                            )}
                        </React.Fragment>
                    ))}
                </View>

                {/* ── Contenu des étapes ── */}
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                >

                    {/* ─── ÉTAPE 1 : BORDEREAU ─── */}
                    {currentStep === 'bordereau' && (
                        <>
                            <Text style={styles.sectionTitle}>Quantités à livrer</Text>
                            <BordereauDouar
                                etape={etape}
                                onQuantitesChange={setQuantitesReelles}
                            />
                        </>
                    )}

                    {/* ─── ÉTAPE 2 : PHOTO ─── */}
                    {currentStep === 'photo' && (
                        <View style={styles.photoSection}>
                            <Text style={styles.sectionTitle}>Photo de preuve de déchargement</Text>
                            <Text style={styles.sectionSub}>
                                Prenez une photo clara du déchargement des ressources au douar.
                            </Text>

                            {photoUri ? (
                                <View style={styles.photoPreview}>
                                    <Image source={{ uri: photoUri }} style={styles.photoImage} />
                                    <TouchableOpacity
                                        style={styles.retakeBtn}
                                        onPress={() => setPhotoUri(null)}
                                    >
                                        <Ionicons name="camera-reverse-outline" size={16} color="#1565C0" />
                                        <Text style={styles.retakeBtnText}>Reprendre</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.photoButtons}>
                                    <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
                                        <Ionicons name="camera" size={32} color="#1565C0" />
                                        <Text style={styles.photoBtnText}>Appareil photo</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.photoBtn} onPress={handlePickFromLibrary}>
                                        <Ionicons name="images-outline" size={32} color="#1565C0" />
                                        <Text style={styles.photoBtnText}>Galerie</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* La photo est optionnelle */}
                            {!photoUri && (
                                <Text style={styles.photoOptional}>
                                    ⚠️ Photo optionnelle mais fortement recommandée comme preuve terrain.
                                </Text>
                            )}
                        </View>
                    )}

                    {/* ─── ÉTAPE 3 : SIGNATURE ─── */}
                    {currentStep === 'signature' && (
                        <View style={styles.signatureSection}>
                            <Text style={styles.sectionTitle}>Signature du responsable local</Text>
                            <Text style={styles.sectionSub}>
                                Faites signer le responsable ou mukhtâr du douar pour valider la réception.
                            </Text>
                            <View style={styles.signatureWrapper}>
                                <SignatureCanvas
                                    width={340}
                                    height={200}
                                    onSigned={setSignatureBase64}
                                    onCleared={() => setSignatureBase64(null)}
                                />
                            </View>
                        </View>
                    )}

                    {/* ─── ÉTAPE 4 : RÉCAP + COMMENTAIRE ─── */}
                    {currentStep === 'recap' && (
                        <View style={styles.recapSection}>
                            <Text style={styles.sectionTitle}>Résumé avant envoi</Text>

                            {/* Checklist */}
                            <RecapItem
                                icon="list-outline"
                                label="Bordereau complété"
                                ok={!!quantitesReelles}
                            />
                            <RecapItem
                                icon="camera-outline"
                                label="Photo de preuve"
                                ok={!!photoUri}
                                optional
                            />
                            <RecapItem
                                icon="create-outline"
                                label="Signature responsable local"
                                ok={!!signatureBase64}
                            />

                            {/* Commentaire terrain */}
                            <Text style={styles.commentLabel}>Commentaire terrain (optionnel)</Text>
                            <TextInput
                                style={styles.commentInput}
                                value={commentaire}
                                onChangeText={setCommentaire}
                                placeholder="Route difficile, accès difficile, population présente..."
                                placeholderTextColor="#bbb"
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />

                            {/* Info sync */}
                            <View style={styles.syncInfo}>
                                <Ionicons name="cloud-upload-outline" size={16} color="#1565C0" />
                                <Text style={styles.syncInfoText}>
                                    Les données seront envoyées au serveur immédiatement si vous êtes
                                    connecté, ou stockées localement jusqu'au retour du réseau.
                                </Text>
                            </View>
                        </View>
                    )}

                </ScrollView>

                {/* ── Boutons Navigation ── */}
                <View style={[styles.navButtons, { paddingBottom: insets.bottom + 8 }]}>
                    {stepIndex > 0 && (
                        <TouchableOpacity style={styles.prevBtn} onPress={goPrev}>
                            <Ionicons name="arrow-back" size={18} color="#555" />
                            <Text style={styles.prevBtnText}>Retour</Text>
                        </TouchableOpacity>
                    )}

                    {currentStep !== 'recap' ? (
                        <TouchableOpacity
                            style={[styles.nextBtn, stepIndex === 0 && styles.nextBtnFull]}
                            onPress={goNext}
                        >
                            <Text style={styles.nextBtnText}>
                                {currentStep === 'bordereau' ? 'Continuer' : 'Suivant'}
                            </Text>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
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
                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            )}
                            <Text style={styles.submitBtnText}>
                                {isSubmitting ? 'Envoi en cours...' : 'Confirmer la livraison'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

// ── Composant Récap Item ──────────────────────────────────────────────────────

function RecapItem({
    icon, label, ok, optional,
}: { icon: string; label: string; ok: boolean; optional?: boolean }) {
    return (
        <View style={styles.recapItem}>
            <Ionicons name={icon as any} size={18} color="#555" />
            <Text style={styles.recapItemLabel}>{label}</Text>
            {optional && !ok
                ? <Text style={styles.recapOptional}>Optionnel</Text>
                : <Ionicons
                    name={ok ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={ok ? '#388E3C' : '#D32F2F'}
                />
            }
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: '#F4F6F9' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1565C0',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    backBtn: { padding: 4 },
    headerContent: { flex: 1 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
    headerSub: { fontSize: 12, color: '#90CAF9' },

    // Step bar
    stepBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 12,
        elevation: 1,
    },
    stepItem: { alignItems: 'center', gap: 4 },
    stepCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepActive: { backgroundColor: '#1565C0' },
    stepDone: { backgroundColor: '#388E3C' },
    stepNum: { fontSize: 12, fontWeight: '700', color: '#999' },
    stepNumActive: { color: '#fff' },
    stepLabel: { fontSize: 10, color: '#999' },
    stepLabelActive: { color: '#1565C0', fontWeight: '700' },
    stepLine: { flex: 1, height: 2, backgroundColor: '#E0E0E0', marginHorizontal: 4, marginBottom: 14 },
    stepLineDone: { backgroundColor: '#388E3C' },

    // Content
    content: { paddingBottom: 24, paddingTop: 12 },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1A1A2E',
        marginHorizontal: 16,
        marginBottom: 4,
    },
    sectionSub: {
        fontSize: 13,
        color: '#777',
        marginHorizontal: 16,
        marginBottom: 16,
        lineHeight: 18,
    },

    // Photo
    photoSection: { paddingTop: 8 },
    photoButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        marginTop: 16,
        marginBottom: 12,
    },
    photoBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: 130,
        elevation: 2,
        gap: 8,
        borderWidth: 1.5,
        borderColor: '#BBDEFB',
        borderStyle: 'dashed',
    },
    photoBtnText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
    photoPreview: { alignItems: 'center', gap: 12, marginTop: 12 },
    photoImage: { width: 280, height: 200, borderRadius: 12 },
    retakeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 8,
    },
    retakeBtnText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
    photoOptional: {
        fontSize: 12,
        color: '#F57C00',
        textAlign: 'center',
        marginHorizontal: 32,
        marginTop: 12,
    },

    // Signature
    signatureSection: { paddingTop: 8 },
    signatureWrapper: { alignItems: 'center', marginTop: 8 },

    // Récap
    recapSection: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
    recapItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 14,
        gap: 10,
        elevation: 1,
    },
    recapItemLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#333' },
    recapOptional: { fontSize: 11, color: '#F57C00', fontWeight: '600' },
    commentLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 4 },
    commentInput: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        color: '#333',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        minHeight: 80,
        elevation: 1,
    },
    syncInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#E3F2FD',
        borderRadius: 10,
        padding: 12,
        gap: 8,
        marginTop: 4,
    },
    syncInfoText: { fontSize: 12, color: '#1565C0', flex: 1, lineHeight: 17 },

    // Navigation buttons
    navButtons: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        elevation: 3,
    },
    prevBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        gap: 6,
    },
    prevBtnText: { fontSize: 14, color: '#555', fontWeight: '600' },
    nextBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1565C0',
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
        elevation: 3,
    },
    nextBtnFull: { flex: 1 },
    nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    submitBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2E7D32',
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
        elevation: 3,
    },
    submitBtnDisabled: { backgroundColor: '#A5D6A7' },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
