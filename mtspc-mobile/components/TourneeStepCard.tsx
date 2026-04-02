/**
 * TourneeStepCard — Carte d'une étape VRP dans l'itinéraire du distributeur
 * ==========================================================================
 *
 * Affiche visuellement une étape de la tournée calculée par OR-Tools :
 * - Numéro d'ordre + nom du douar
 * - Badge de priorité coloré (CRITIQUE=rouge, HAUTE=orange, MOYENNE=jaune, BASSE=vert)
 * - Distance et temps estimé depuis l'étape précédente
 * - Score TOPSIS + population
 * - Statut visuel : À faire / En cours / Livré ✅
 * - Bouton "Commencer la livraison" (navigue vers BordereauDouar)
 */
import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EtapeVRP, NiveauPriorite } from '../types/app';

type StatutEtape = 'a_faire' | 'en_cours' | 'livree';

interface TourneeStepCardProps {
    etape: EtapeVRP;
    statut: StatutEtape;
    isActive: boolean;          // Étape courante (en cours de navigation)
    onStartPress?: () => void;       // Clic "Commencer la livraison"
}

// ── Mapping Priorité → Couleur ───────────────────────────────────────────────

const PRIORITY_CONFIG: Record<NiveauPriorite, { color: string; bg: string; label: string }> = {
    CRITIQUE: { color: '#fff', bg: '#D32F2F', label: 'CRITIQUE' },
    HAUTE: { color: '#fff', bg: '#E64A19', label: 'HAUTE' },
    MOYENNE: { color: '#333', bg: '#FBC02D', label: 'MOYENNE' },
    BASSE: { color: '#fff', bg: '#388E3C', label: 'BASSE' },
};

const STATUT_CONFIG: Record<StatutEtape, { icon: string; color: string; label: string }> = {
    a_faire: { icon: 'ellipse-outline', color: '#9E9E9E', label: 'À faire' },
    en_cours: { icon: 'navigate', color: '#1565C0', label: 'En cours' },
    livree: { icon: 'checkmark-circle', color: '#388E3C', label: 'Livré ✅' },
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function TourneeStepCard({
    etape,
    statut,
    isActive,
    onStartPress,
}: TourneeStepCardProps) {
    const priority = PRIORITY_CONFIG[etape.priorite];
    const statutCfg = STATUT_CONFIG[statut];
    const totalRessources =
        etape.ressources.tentes +
        etape.ressources.couvertures +
        etape.ressources.vivres +
        etape.ressources.kits_med;

    return (
        <View style={[
            styles.card,
            isActive && styles.cardActive,
            statut === 'livree' && styles.cardDone,
        ]}>

            {/* ── En-tête : numéro + douar + badge priorité ── */}
            <View style={styles.header}>
                <View style={[styles.stepNumber, isActive && styles.stepNumberActive]}>
                    <Text style={styles.stepNumberText}>{etape.ordre}</Text>
                </View>

                <View style={styles.headerContent}>
                    <Text style={[styles.douarName, statut === 'livree' && styles.textDone]}>
                        {etape.douarNom}
                    </Text>
                    <View style={styles.row}>
                        {/* Badge Priorité */}
                        <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
                            <Text style={[styles.priorityText, { color: priority.color }]}>
                                {priority.label}
                            </Text>
                        </View>
                        {/* Statut */}
                        <View style={styles.row}>
                            <Ionicons name={statutCfg.icon as any} size={14} color={statutCfg.color} />
                            <Text style={[styles.statutText, { color: statutCfg.color }]}>
                                {statutCfg.label}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* ── Infos de déplacement ── */}
            <View style={styles.infoRow}>
                <InfoPill icon="navigate-outline" text={`${etape.distanceKm} km`} />
                <InfoPill icon="time-outline" text={`${etape.tempsEstimeMin} min`} />
                <InfoPill icon="people-outline" text={`${etape.population} hab.`} />
                <InfoPill icon="bar-chart-outline" text={`C_i: ${etape.scoreTopsis.toFixed(2)}`} />
            </View>

            {/* ── Résumé des ressources à décharger ── */}
            <View style={styles.ressourcesRow}>
                <Ionicons name="cube-outline" size={13} color="#666" />
                <Text style={styles.ressourcesText}>
                    {`${etape.ressources.tentes} tentes · ${etape.ressources.couvertures} couvertures · `}
                    {`${etape.ressources.vivres} vivres · ${etape.ressources.kits_med} kits`}
                </Text>
            </View>

            {/* ── Bouton "Commencer la livraison" (seulement si étape active) ── */}
            {isActive && statut !== 'livree' && onStartPress && (
                <TouchableOpacity
                    style={styles.startButton}
                    onPress={onStartPress}
                    activeOpacity={0.8}
                >
                    <Ionicons name="cube" size={18} color="#fff" />
                    <Text style={styles.startButtonText}>Commencer la livraison</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
            )}
        </View>
    );
}

// ── Composant interne : Pill d'info ──────────────────────────────────────────

function InfoPill({ icon, text }: { icon: string; text: string }) {
    return (
        <View style={styles.pill}>
            <Ionicons name={icon as any} size={12} color="#555" />
            <Text style={styles.pillText}>{text}</Text>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginHorizontal: 16,
        marginVertical: 6,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        borderLeftWidth: 4,
        borderLeftColor: '#E0E0E0',
    },
    cardActive: {
        borderLeftColor: '#1565C0',
        elevation: 4,
        shadowOpacity: 0.15,
    },
    cardDone: {
        opacity: 0.65,
        borderLeftColor: '#388E3C',
    },

    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
        gap: 10,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E8EAF6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNumberActive: {
        backgroundColor: '#1565C0',
    },
    stepNumberText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1565C0',
    },
    headerContent: {
        flex: 1,
        gap: 4,
    },
    douarName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1A1A2E',
    },
    textDone: {
        color: '#999',
        textDecorationLine: 'line-through',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    priorityBadge: {
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    priorityText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    statutText: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 2,
    },

    infoRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F4F6F9',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
        gap: 4,
    },
    pillText: {
        fontSize: 11,
        color: '#555',
    },

    ressourcesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 8,
        backgroundColor: '#F8F9FF',
        borderRadius: 8,
        marginBottom: 6,
    },
    ressourcesText: {
        fontSize: 12,
        color: '#555',
        flex: 1,
    },

    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1565C0',
        borderRadius: 10,
        paddingVertical: 12,
        marginTop: 8,
        gap: 8,
        elevation: 3,
        shadowColor: '#1565C0',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
