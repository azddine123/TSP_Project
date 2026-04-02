/**
 * SignatureCanvas — Signature digitale tactile du responsable local
 * =================================================================
 *
 * Ce composant permet au responsable du douar de signer sur l'écran tactile
 * pour confirmer la réception des ressources. La signature est exportée
 * en base64 PNG et stockée dans le bordereau de livraison.
 *
 * IMPLÉMENTATION SANS DÉPENDANCE EXTERNE :
 * Utilise un PanResponder React Native natif sur un View pour capturer
 * les gestes tactiles et dessiner via une SVG simplifiée par lignes.
 * Compatible Expo Go sans éjection (pas besoin de react-native-signature-canvas
 * qui nécessite une config native supplémentaire).
 *
 * Fonctionnalités :
 *  - Zone de dessin délimitée par un cadre pointillé
 *  - Trait bleu doux (couleur encre)
 *  - Bouton "Effacer" pour recommencer
 *  - Export en base64 simulé via un hash de la signature
 *    (pour intégration avec expo-image / canvas futur)
 *  - Callback onSigned(base64) quand l'utilisateur lève le doigt après avoir signé
 */
import React, { useRef, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, PanResponder, GestureResponderEvent,
    TouchableOpacity, Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

interface SignatureCanvasProps {
    onSigned: (signatureBase64: string) => void;
    onCleared?: () => void;
    width?: number;
    height?: number;
}

interface Point { x: number; y: number; }

export default function SignatureCanvas({
    onSigned,
    onCleared,
    width = 340,
    height = 180,
}: SignatureCanvasProps) {
    // Chaque élément = un trait (séquence de points d'un geste continu)
    const [paths, setPaths] = useState<Point[][]>([]);
    const [isSigned, setIsSigned] = useState(false);

    // Trait en cours de dessin
    const currentPath = useRef<Point[]>([]);
    // Layout réel du View (pour calculer les coordonnées relatives)
    const containerRef = useRef<View>(null);
    const containerLayout = useRef({ x: 0, y: 0 });

    // ── Convertir les points en attribut "d" SVG ──────────────────────────────

    const pointsToSvgPath = (points: Point[]): string => {
        if (points.length < 2) return '';
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i].x} ${points[i].y}`;
        }
        return d;
    };

    // ── Générer un "base64" représentatif de la signature ────────────────────
    // En production, on utiliserait expo-gl ou une librairie canvas pour un vrai PNG.
    // Ici : on encode les points en JSON base64 comme preuve de signature.

    const generateSignatureData = useCallback((allPaths: Point[][]): string => {
        const data = {
            points: allPaths.map(path => path.length).reduce((a, b) => a + b, 0),
            strokes: allPaths.length,
            timestamp: new Date().toISOString(),
            // Simple hash des coordonnées pour identifier la signature unique
            hash: allPaths
                .flat()
                .reduce((acc, p) => acc + p.x * 31 + p.y * 17, 0)
                .toString(16),
        };
        return `data:signature/json;base64,${btoa(JSON.stringify(data))}`;
    }, []);

    // ── PanResponder — Capture des gestes ────────────────────────────────────

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt: GestureResponderEvent) => {
                // Début d'un nouveau trait
                const { locationX, locationY } = evt.nativeEvent;
                currentPath.current = [{ x: locationX, y: locationY }];
            },
            onPanResponderMove: (evt: GestureResponderEvent) => {
                const { locationX, locationY } = evt.nativeEvent;
                currentPath.current.push({ x: locationX, y: locationY });
                // Forcer le re-render pour afficher le trait en cours
                setPaths((prev) => [...prev.slice(0, -1), [...currentPath.current]]);
            },
            onPanResponderRelease: () => {
                // Fin du geste → sauvegarder le trait et notifier
                const completedPath = [...currentPath.current];
                if (completedPath.length > 1) {
                    setPaths((prev) => {
                        const newPaths = [...prev.slice(0, -1), completedPath];
                        // Signature détectée si au moins 3 traits ou 20 points
                        const totalPoints = newPaths.flat().length;
                        if (totalPoints > 20) {
                            setIsSigned(true);
                            onSigned(generateSignatureData(newPaths));
                        }
                        return newPaths;
                    });
                }
                currentPath.current = [];
            },
        })
    ).current;

    // ── Effacer ───────────────────────────────────────────────────────────────

    const handleClear = () => {
        setPaths([]);
        currentPath.current = [];
        setIsSigned(false);
        onCleared?.();
    };

    return (
        <View style={styles.wrapper}>
            {/* Étiquette */}
            <View style={styles.labelRow}>
                <Ionicons name="create-outline" size={16} color="#1565C0" />
                <Text style={styles.label}>Signature du responsable local</Text>
                {isSigned && (
                    <View style={styles.validatedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#388E3C" />
                        <Text style={styles.validatedText}>Signée</Text>
                    </View>
                )}
            </View>

            {/* Zone de dessin */}
            <View
                ref={containerRef}
                style={[styles.canvas, { width, height }]}
                {...panResponder.panHandlers}
            >
                {/* SVG pour le rendu des traits */}
                <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
                    {paths.map((path, index) => (
                        <Path
                            key={index}
                            d={pointsToSvgPath(path)}
                            stroke="#1A3A6B"
                            strokeWidth={2.5}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    ))}
                </Svg>

                {/* Placeholder centré si vide */}
                {paths.length === 0 && (
                    <View style={styles.placeholder}>
                        <Ionicons name="pencil-outline" size={28} color="#C5CAE9" />
                        <Text style={styles.placeholderText}>Signez ici</Text>
                    </View>
                )}

                {/* Ligne de base (comme un formulaire papier) */}
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLineLabel}>Signature</Text>
            </View>

            {/* Bouton Effacer */}
            <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClear}
                activeOpacity={0.7}
            >
                <Ionicons name="refresh-outline" size={15} color="#666" />
                <Text style={styles.clearButtonText}>Effacer et recommencer</Text>
            </TouchableOpacity>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    wrapper: {
        marginVertical: 8,
        alignItems: 'center',
    },

    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginLeft: 16,
        marginBottom: 8,
        gap: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    validatedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        gap: 3,
    },
    validatedText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#388E3C',
    },

    canvas: {
        backgroundColor: '#FAFCFF',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#90CAF9',
        borderStyle: 'dashed',
        overflow: 'hidden',
        position: 'relative',
    },

    placeholder: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    placeholderText: {
        fontSize: 13,
        color: '#C5CAE9',
        fontStyle: 'italic',
    },

    signatureLine: {
        position: 'absolute',
        bottom: 28,
        left: 20,
        right: 20,
        height: 1,
        backgroundColor: '#BBDEFB',
    },
    signatureLineLabel: {
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 10,
        color: '#BBDEFB',
    },

    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 5,
        paddingVertical: 6,
        paddingHorizontal: 14,
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
    },
    clearButtonText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
});
