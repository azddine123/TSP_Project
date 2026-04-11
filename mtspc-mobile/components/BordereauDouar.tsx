/**
 * BORDEREAU DOUAR v2.0 — Design modernisé pour MTSPC
 * ==================================================
 * Bordereau de livraison avec design premium, animations
 * et meilleure UX pour la saisie des quantités réelles.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { EtapeVRP, NiveauPriorite } from '../types/app';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../theme';

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

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION DES RESSOURCES
// ═══════════════════════════════════════════════════════════════════════════════

const RESSOURCES_META = [
  { key: 'tentes', label: 'Tentes', icon: 'tent', unite: 'unités', color: COLORS.primary[800] },
  { key: 'couvertures', label: 'Couvertures', icon: 'bed-blank', unite: 'unités', color: COLORS.secondary[700] },
  { key: 'vivres', label: 'Kits vivres', icon: 'food-apple', unite: 'kits', color: COLORS.warning.dark },
  { key: 'kits_med', label: 'Kits médicaux', icon: 'medical-bag', unite: 'kits', color: COLORS.error.dark },
  { key: 'eau_litres', label: 'Eau potable', icon: 'water', unite: 'litres', color: '#00838F' },
] as const;

const PRIORITY_CONFIG: Record<NiveauPriorite, { color: string; bg: string; label: string }> = {
  CRITIQUE: { color: '#fff', bg: '#D32F2F', label: 'CRITIQUE' },
  HAUTE: { color: '#fff', bg: '#E64A19', label: 'HAUTE' },
  MOYENNE: { color: '#333', bg: '#FBC02D', label: 'MOYENNE' },
  BASSE: { color: '#fff', bg: '#388E3C', label: 'BASSE' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ═══════════════════════════════════════════════════════════════════════════════

const HeaderCard: React.FC<{ etape: EtapeVRP }> = ({ etape }) => {
  const priority = PRIORITY_CONFIG[etape.priorite];
  
  return (
    <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.douarName}>{etape.douarNom}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={COLORS.text.secondary} />
            <Text style={styles.metaText}>{etape.population} habitants</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Ionicons name="analytics-outline" size={14} color={COLORS.text.secondary} />
            <Text style={styles.metaText}>Score: {etape.scoreTopsis.toFixed(3)}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
        <Text style={[styles.priorityText, { color: priority.color }]}>
          {priority.label}
        </Text>
      </View>
    </Animated.View>
  );
};

const InfoAlert: React.FC = () => (
  <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.infoBox}>
    <View style={styles.infoIconContainer}>
      <Ionicons name="information-circle" size={20} color={COLORS.primary[800]} />
    </View>
    <Text style={styles.infoText}>
      Quantités prévues par l'algorithme. Modifiez si les quantités réelles diffèrent.
    </Text>
  </Animated.View>
);

interface ResourceMeta {
  key: string;
  label: string;
  icon: string;
  unite: string;
  color: string;
}

const ResourceRow: React.FC<{
  meta: ResourceMeta;
  prevu: number;
  reel: number;
  onChange: (val: string) => void;
  delay: number;
}> = ({ meta, prevu, reel, onChange, delay }) => {
  const ecart = reel - prevu;
  
  return (
    <Animated.View 
      entering={FadeInUp.delay(delay).duration(400)}
      layout={Layout.springify()}
      style={styles.tableRow}
    >
      {/* Resource label */}
      <View style={styles.resourceLabelContainer}>
        <View style={[styles.resourceIconContainer, { backgroundColor: `${meta.color}15` }]}>
          <MaterialCommunityIcons name={meta.icon as any} size={18} color={meta.color} />
        </View>
        <View>
          <Text style={styles.resourceLabel}>{meta.label}</Text>
          <Text style={styles.resourceUnit}>{meta.unite}</Text>
        </View>
      </View>

      {/* Quantité prévue */}
      <View style={styles.prevuContainer}>
        <Text style={styles.prevuLabel}>Prévu</Text>
        <Text style={styles.prevuValue}>{prevu}</Text>
      </View>

      {/* Champ saisie */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Réel</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.input,
              ecart < 0 && styles.inputDeficit,
              ecart > 0 && styles.inputExcedent,
            ]}
            value={String(reel)}
            onChangeText={onChange}
            keyboardType="number-pad"
            selectTextOnFocus
          />
          {ecart !== 0 && (
            <View style={[
              styles.ecartBadge,
              { backgroundColor: ecart < 0 ? COLORS.error[50] : COLORS.success[50] }
            ]}>
              <Text style={[
                styles.ecartText,
                { color: ecart < 0 ? COLORS.error.main : COLORS.success.dark }
              ]}>
                {ecart > 0 ? `+${ecart}` : ecart}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const TotalRow: React.FC<{ prevu: number; reel: number; hasEcart: boolean }> = ({ 
  prevu, reel, hasEcart 
}) => (
  <View style={styles.totalRow}>
    <Text style={styles.totalLabel}>TOTAL À LIVRER</Text>
    <View style={styles.totalValues}>
      <View style={styles.totalItem}>
        <Text style={styles.totalSublabel}>Prévu</Text>
        <Text style={styles.totalPrevu}>{prevu}</Text>
      </View>
      <Ionicons name="arrow-forward" size={16} color={COLORS.text.tertiary} />
      <View style={styles.totalItem}>
        <Text style={styles.totalSublabel}>Réel</Text>
        <Text style={[styles.totalReel, hasEcart && (reel < prevu ? styles.totalDeficit : styles.totalExcedent)]}>
          {reel}
        </Text>
      </View>
    </View>
  </View>
);

const EcartAlert: React.FC<{ prevu: number; reel: number }> = ({ prevu, reel }) => {
  const isDeficit = reel < prevu;
  const difference = Math.abs(prevu - reel);
  
  return (
    <Animated.View 
      entering={FadeInUp.duration(400)}
      style={[
        styles.ecartBox,
        { backgroundColor: isDeficit ? COLORS.error[50] : COLORS.success[50] },
        { borderColor: isDeficit ? COLORS.error.light : COLORS.success.light }
      ]}
    >
      <View style={[
        styles.ecartIconContainer,
        { backgroundColor: isDeficit ? COLORS.error.main : COLORS.success.main }
      ]}>
        <Ionicons
          name={isDeficit ? 'warning' : 'checkmark-circle'}
          size={20}
          color="#fff"
        />
      </View>
      <View style={styles.ecartContent}>
        <Text style={[
          styles.ecartTitle,
          { color: isDeficit ? COLORS.error.dark : COLORS.success.dark }
        ]}>
          {isDeficit ? 'Déficit détecté' : 'Excédent détecté'}
        </Text>
        <Text style={styles.ecartBoxText}>
          {isDeficit
            ? `${difference} unités en moins — Une justification sera requise`
            : `${difference} unités supplémentaires livrées`}
        </Text>
      </View>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function BordereauDouar({
  etape,
  onQuantitesChange,
}: BordereauDouarProps) {
  const [quantites, setQuantites] = useState<QuantitesReelles>({
    tentes: etape.ressources.tentes,
    couvertures: etape.ressources.couvertures,
    vivres: etape.ressources.vivres,
    kits_med: etape.ressources.kits_med,
    eau_litres: etape.ressources.eau_litres,
  });

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
      <HeaderCard etape={etape} />
      <InfoAlert />
      
      {/* Tableau des ressources */}
      <View style={styles.table}>
        {RESSOURCES_META.map(({ key, ...meta }, index) => (
          <ResourceRow
            key={key}
            meta={{ key, ...meta }}
            prevu={etape.ressources[key]}
            reel={quantites[key]}
            onChange={(val) => handleChange(key as keyof QuantitesReelles, val)}
            delay={150 + index * 50}
          />
        ))}
        
        <TotalRow prevu={totalPrevu} reel={totalReel} hasEcart={hasEcart} />
      </View>

      {/* Alerte si écart */}
      {hasEcart && <EcartAlert prevu={totalPrevu} reel={totalReel} />}
      
      {/* Bottom padding */}
      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.md,
  },
  headerContent: {
    flex: 1,
    marginRight: SPACING.md,
  },
  douarName: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.text.tertiary,
  },
  priorityBadge: {
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary[100],
    gap: SPACING.sm,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },

  // Table
  table: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceVariant,
  },

  // Resource Row
  resourceLabelContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  resourceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceLabel: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  resourceUnit: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.tertiary,
  },

  // Prévu
  prevuContainer: {
    alignItems: 'center',
    minWidth: 60,
  },
  prevuLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  prevuValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '700',
    color: COLORS.text.secondary,
  },

  // Input
  inputContainer: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  inputWrapper: {
    alignItems: 'center',
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border.light,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '800',
    color: COLORS.text.primary,
    textAlign: 'center',
    width: 70,
    backgroundColor: COLORS.surfaceVariant,
  },
  inputDeficit: {
    borderColor: COLORS.error.main,
    backgroundColor: COLORS.error[50],
    color: COLORS.error.dark,
  },
  inputExcedent: {
    borderColor: COLORS.success.main,
    backgroundColor: COLORS.success[50],
    color: COLORS.success.dark,
  },
  ecartBadge: {
    marginTop: 4,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  ecartText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '800',
  },

  // Total Row
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surfaceVariant,
    borderTopWidth: 2,
    borderTopColor: COLORS.border.light,
  },
  totalLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '800',
    color: COLORS.text.primary,
    letterSpacing: 0.5,
  },
  totalValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  totalItem: {
    alignItems: 'center',
  },
  totalSublabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    marginBottom: 2,
  },
  totalPrevu: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: '800',
    color: COLORS.text.secondary,
  },
  totalReel: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  totalDeficit: {
    color: COLORS.error.main,
  },
  totalExcedent: {
    color: COLORS.success.dark,
  },

  // Ecart Alert
  ecartBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    gap: SPACING.md,
  },
  ecartIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ecartContent: {
    flex: 1,
  },
  ecartTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: '800',
    marginBottom: 2,
  },
  ecartBoxText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
  },
});
