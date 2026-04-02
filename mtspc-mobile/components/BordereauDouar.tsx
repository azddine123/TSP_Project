/**
 * BordereauDouar — Bordereau de livraison détaillé pour un douar
 * ==============================================================
 *
 * Affiché juste avant la confirmation de livraison.
 * Montre les quantités PRÉVUES (calculées par TOPSIS) et permet
 * de saisir les quantités RÉELLES (en cas d'écart sur le terrain).
 *
 * Données affichées :
 *  - Nom du douar + niveau de priorité + population + score TOPSIS
 *  - Tableau des ressources : prévues → champ de saisie quantité réelle
 *  - Total des unités à décharger
 */
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EtapeVRP, NiveauPriorite } from '../types/app';

interface QuantitesReelles {
    tentes: number;
    couvertures: number;
    vivres: number;
    kits_med: number;
    eau_litres: number;
}

interface BordereauDouarProps {
    etape: EtapeVRP;
    onQuantitesChange: (quantites: QuantitesReelles) => void;
}

// ── Icônes et labels des ressources ─────────────────────────────────────────

const RESSOURCES_META = [
    { key: 'tentes', label: 'Tentes', icon: 'home-outline', unite: 'unités', color: '#1565C0' },
    { key: 'couvertures', label: 'Couvertures', icon: 'layers-outline', unite: 'unités', color: '#6A1B9A' },
    { key: 'vivres', label: 'Kits vivres', icon: 'fast-food-outline', unite: 'kits', color: '#E65100' },
    { key: 'kits_med', label: 'Kits médicaux', icon: 'medkit-outline', unite: 'kits', color: '#B71C1C' },
    { key: 'eau_litres', label: 'Eau potable', icon: 'water-outline', unite: 'litres', color: '#00838F' },
] as const;

const PRIORITY_COLOR: Record<NiveauPriorite, string> = {
    CRITIQUE: '#D32F2F',
    HAUTE: '#E64A19',
    MOYENNE: '#FBC02D',
    BASSE: '#388E3C',
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function BordereauDouar({
    etape,
    onQuantitesChange,
}: BordereauDouarProps) {
    // Initialiser avec les quantités prévues par l'algo
    const [quantites, setQuantites] = useState<QuantitesReelles>({
        tentes: etape.ressources.tentes,
        couvertures: etape.ressources.couvertures,
        vivres: etape.ressources.vivres,
        kits_med: etape.ressources.kits_med,
        eau_litres: etape.ressources.eau_litres,
    });

    // Notifier le parent à chaque changement
    useEffect(() => {
        onQuantitesChange(quantites);
    }, [quantites, onQuantitesChange]);

    const handleChange = (key: keyof QuantitesReelles, value: string) => {
        const num = parseInt(value, 10);
        setQuantites((prev) => ({
            ...prev,
            [key]: isNaN(num) || num < 0 ? 0 : num,
        }));
    };

    const totalPrevu =
        etape.ressources.tentes +
        etape.ressources.couvertures +
        etape.ressources.vivres +
        etape.ressources.kits_med;

    const totalReel =
        quantites.tentes +
        quantites.couvertures +
        quantites.vivres +
        quantites.kits_med;

    const hasEcart = totalReel !== totalPrevu;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

            {/* ── En-tête douar ── */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.douarName}>{etape.douarNom}</Text>
                    <Text style={styles.douarMeta}>
                        {etape.population} habitants · Score TOPSIS : {etape.scoreTopsis.toFixed(3)}
                    </Text>
                </View>
                <View style={[styles.priorityChip, { backgroundColor: PRIORITY_COLOR[etape.priorite] }]}>
                    <Text style={styles.priorityText}>{etape.priorite}</Text>
                </View>
            </View>

            {/* ── Indication saisie ── */}
            <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color="#1565C0" />
                <Text style={styles.infoText}>
                    Quantités prévues par l'algorithme. Modifiez si les quantités réelles diffèrent.
                </Text>
            </View>

            {/* ── Tableau des ressources ── */}
            <View style={styles.table}>
                {/* En-tête tableau */}
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Ressource</Text>
                    <Text style={[styles.tableCell, styles.tableHeaderText, styles.textRight]}>Prévu</Text>
                    <Text style={[styles.tableCell, styles.tableHeaderText, styles.textRight]}>Réel</Text>
                </View>

                {/* Lignes ressources */}
                {RESSOURCES_META.map(({ key, label, icon, unite, color }) => {
                    const prevu = etape.ressources[key];
                    const reel = quantites[key];
                    const ecart = reel - prevu;
                    return (
                        <View key={key} style={styles.tableRow}>
                            {/* Label + icône */}
                            <View style={[styles.tableCell, styles.row, { flex: 2, gap: 6 }]}>
                                <Ionicons name={icon as any} size={16} color={color} />
                                <View>
                                    <Text style={styles.ressourceLabel}>{label}</Text>
                                    <Text style={styles.ressourceUnite}>{unite}</Text>
                                </View>
                            </View>

                            {/* Quantité prévue */}
                            <Text style={[styles.tableCell, styles.textRight, styles.prevuText]}>
                                {prevu}
                            </Text>

                            {/* Champ saisie quantité réelle */}
                            <View style={[styles.tableCell, styles.inputWrapper]}>
                                <TextInput
                                    style={[
                                        styles.input,
                                        ecart < 0 && styles.inputDeficit,
                                        ecart > 0 && styles.inputExcedent,
                                    ]}
                                    value={String(reel)}
                                    onChangeText={(val) => handleChange(key as keyof QuantitesReelles, val)}
                                    keyboardType="number-pad"
                                    selectTextOnFocus
                                />
                                {ecart !== 0 && (
                                    <Text style={[styles.ecartText, { color: ecart < 0 ? '#D32F2F' : '#388E3C' }]}>
                                        {ecart > 0 ? `+${ecart}` : ecart}
                                    </Text>
                                )}
                            </View>
                        </View>
                    );
                })}

                {/* Ligne totaux */}
                <View style={[styles.tableRow, styles.totalRow]}>
                    <Text style={[styles.tableCell, styles.totalLabel, { flex: 2 }]}>TOTAL</Text>
                    <Text style={[styles.tableCell, styles.textRight, styles.totalValue]}>{totalPrevu}</Text>
                    <Text style={[styles.tableCell, styles.textRight, styles.totalValue, hasEcart && styles.totalEcart]}>
                        {totalReel}
                    </Text>
                </View>
            </View>

            {/* ── Alerte si écart ── */}
            {hasEcart && (
                <View style={[styles.ecartBox, totalReel < totalPrevu ? styles.ecartDeficit : styles.ecartExcedent]}>
                    <Ionicons
                        name={totalReel < totalPrevu ? 'warning-outline' : 'checkmark-circle-outline'}
                        size={16}
                        color={totalReel < totalPrevu ? '#D32F2F' : '#388E3C'}
                    />
                    <Text style={[styles.ecartBoxText, { color: totalReel < totalPrevu ? '#D32F2F' : '#388E3C' }]}>
                        {totalReel < totalPrevu
                            ? `Déficit de ${totalPrevu - totalReel} unités — Justification requise`
                            : `Excédent de ${totalReel - totalPrevu} unités livré`}
                    </Text>
                </View>
            )}
        </ScrollView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 8,
        elevation: 2,
    },
    headerLeft: { flex: 1, marginRight: 10 },
    douarName: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', marginBottom: 2 },
    douarMeta: { fontSize: 12, color: '#777' },
    priorityChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
    priorityText: { color: '#fff', fontSize: 11, fontWeight: '800' },

    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 10,
        borderRadius: 8,
        gap: 6,
    },
    infoText: { fontSize: 12, color: '#1565C0', flex: 1, lineHeight: 16 },

    table: {
        marginHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        marginBottom: 12,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    tableHeader: { backgroundColor: '#F4F6F9' },
    tableHeaderText: { fontSize: 11, fontWeight: '700', color: '#555', textTransform: 'uppercase' },
    tableCell: { flex: 1 },
    textRight: { textAlign: 'right' },
    row: { flexDirection: 'row', alignItems: 'center' },
    ressourceLabel: { fontSize: 13, fontWeight: '600', color: '#333' },
    ressourceUnite: { fontSize: 10, color: '#999' },
    prevuText: { fontSize: 14, fontWeight: '600', color: '#555', textAlign: 'right' },

    inputWrapper: { alignItems: 'flex-end' },
    input: {
        borderWidth: 1.5,
        borderColor: '#DDD',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A2E',
        textAlign: 'center',
        width: 60,
        backgroundColor: '#FAFAFA',
    },
    inputDeficit: { borderColor: '#D32F2F', backgroundColor: '#FFEBEE' },
    inputExcedent: { borderColor: '#388E3C', backgroundColor: '#E8F5E9' },
    ecartText: { fontSize: 10, fontWeight: '700', marginTop: 2 },

    totalRow: { backgroundColor: '#F4F6F9', borderBottomWidth: 0 },
    totalLabel: { fontSize: 13, fontWeight: '800', color: '#333', textTransform: 'uppercase' },
    totalValue: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', textAlign: 'right' },
    totalEcart: { color: '#D32F2F' },

    ecartBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        padding: 10,
        borderRadius: 8,
        gap: 6,
        marginBottom: 16,
    },
    ecartDeficit: { backgroundColor: '#FFEBEE' },
    ecartExcedent: { backgroundColor: '#E8F5E9' },
    ecartBoxText: { fontSize: 13, fontWeight: '600', flex: 1 },
});
