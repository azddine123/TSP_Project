import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  useSharedValue 
} from 'react-native-reanimated';
import { EtapeVRP, NiveauPriorite } from '../types/app';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../theme';

type StatutEtape = 'a_faire' | 'en_cours' | 'livree' | 'echec';

interface TourneeStepCardProps {
  etape: EtapeVRP;
  statut: StatutEtape;
  isActive: boolean;
  onStartPress?: () => void;
  index?: number;
}

const PRIORITY_CONFIG: Record<NiveauPriorite, { 
  color: string; 
  bg: string; 
  gradient: string[];
  icon: string;
}> = {
  CRITIQUE: { 
    color: '#fff', 
    bg: '#D32F2F', 
    gradient: ['#D32F2F', '#B71C1C'],
    icon: 'alert-circle',
  },
  HAUTE: { 
    color: '#fff', 
    bg: '#E64A19', 
    gradient: ['#E64A19', '#D84315'],
    icon: 'flag',
  },
  MOYENNE: { 
    color: '#333', 
    bg: '#FBC02D', 
    gradient: ['#FBC02D', '#F9A825'],
    icon: 'flag-variant',
  },
  BASSE: { 
    color: '#fff', 
    bg: '#388E3C', 
    gradient: ['#388E3C', '#2E7D32'],
    icon: 'flag-variant-outline',
  },
};

const STATUT_CONFIG: Record<StatutEtape, { 
  icon: string; 
  color: string; 
  bg: string;
  label: string;
  pulse?: boolean;
}> = {
  a_faire: { 
    icon: 'ellipse-outline', 
    color: COLORS.text.tertiary, 
    bg: COLORS.surfaceVariant,
    label: 'À faire',
  },
  en_cours: { 
    icon: 'navigate-circle', 
    color: COLORS.primary[800], 
    bg: COLORS.primary[50],
    label: 'En cours',
    pulse: true,
  },
  livree: {
    icon: 'checkmark-circle',
    color: COLORS.success.dark,
    bg: COLORS.success[50],
    label: 'Livré',
  },
  echec: {
    icon: 'warning',
    color: COLORS.error.main,
    bg: COLORS.error[50] ?? '#FFEBEE',
    label: 'Bloqué',
  },
};

const StepNumber: React.FC<{ 
  number: number; 
  isActive: boolean; 
  statut: StatutEtape;
}> = ({ number, isActive, statut }) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  React.useEffect(() => {
    if (statut === 'en_cours') {
      scale.value = withSpring(1.1, { damping: 10, stiffness: 200 });
    } else {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    }
  }, [statut]);

  const isDone = statut === 'livree';

  return (
    <Animated.View style={[
      styles.stepNumberContainer,
      isActive && styles.stepNumberActive,
      isDone && styles.stepNumberDone,
      animatedStyle,
    ]}>
      {isDone ? (
        <Ionicons name="checkmark" size={18} color="#fff" />
      ) : (
        <Text style={[
          styles.stepNumberText,
          isActive && styles.stepNumberTextActive,
        ]}>
          {number}
        </Text>
      )}
    </Animated.View>
  );
};

const InfoChip: React.FC<{ 
  icon: string; 
  value: string; 
  label: string;
  color?: string;
}> = ({ icon, value, label, color = COLORS.text.secondary }) => (
  <View style={styles.infoChip}>
    <View style={[styles.infoChipIcon, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon as any} size={14} color={color} />
    </View>
    <View>
      <Text style={styles.infoChipValue}>{value}</Text>
      <Text style={styles.infoChipLabel}>{label}</Text>
    </View>
  </View>
);

const ResourceItem: React.FC<{ 
  icon: string; 
  value: number; 
  label: string;
  color: string;
}> = ({ icon, value, label, color }) => (
  <View style={styles.resourceItem}>
    <MaterialCommunityIcons name={icon as any} size={16} color={color} />
    <Text style={styles.resourceValue}>{value}</Text>
    <Text style={styles.resourceLabel}>{label}</Text>
  </View>
);

export default function TourneeStepCard({
  etape,
  statut,
  isActive,
  onStartPress,
  index = 0,
}: TourneeStepCardProps) {
  const priority = PRIORITY_CONFIG[etape.priorite];
  const statutCfg = STATUT_CONFIG[statut];
  
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 + index * 100 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const totalRessources =
    etape.ressources.tentes +
    etape.ressources.couvertures +
    etape.ressources.vivres +
    etape.ressources.kits_med;

  return (
    <Animated.View style={[
      styles.container,
      isActive && styles.containerActive,
      statut === 'livree' && styles.containerDone,
      animatedStyle,
    ]}>
      <View style={[styles.priorityBar, { backgroundColor: priority.bg }]} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <StepNumber 
            number={etape.ordre} 
            isActive={isActive} 
            statut={statut}
          />
          
          <View style={styles.headerContent}>
            <Text style={[
              styles.douarName,
              statut === 'livree' && styles.textDone,
            ]}>
              {etape.douarNom}
            </Text>
            
            <View style={styles.badgesRow}>
              <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
                <MaterialCommunityIcons name={priority.icon as any} size={12} color={priority.color} />
                <Text style={[styles.priorityText, { color: priority.color }]}>
                  {etape.priorite}
                </Text>
              </View>
              
              <View style={[styles.statusBadge, { backgroundColor: statutCfg.bg }]}>
                <Ionicons name={statutCfg.icon as any} size={12} color={statutCfg.color} />
                <Text style={[styles.statusText, { color: statutCfg.color }]}>
                  {statutCfg.label}
                </Text>
                {statutCfg.pulse && <View style={styles.pulseIndicator} />}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.topsisContainer}>
          <View style={styles.topsisBar}>
            <View 
              style={[
                styles.topsisFill, 
                { width: `${Math.min(etape.scoreTopsis * 100, 100)}%` },
                etape.scoreTopsis > 0.7 && styles.topsisFillHigh,
                etape.scoreTopsis > 0.4 && etape.scoreTopsis <= 0.7 && styles.topsisFillMedium,
              ]} 
            />
          </View>
          <Text style={styles.topsisText}>
            Score priorité: <Text style={styles.topsisValue}>{etape.scoreTopsis.toFixed(3)}</Text>
          </Text>
        </View>

        <View style={styles.infoRow}>
          <InfoChip 
            icon="navigate-outline" 
            value={`${etape.distanceKm}`}
            label="km"
          />
          <InfoChip 
            icon="time-outline" 
            value={`${etape.tempsEstimeMin}`}
            label="min"
          />
          <InfoChip 
            icon="people-outline" 
            value={`${etape.population}`}
            label="hab."
          />
        </View>

        <View style={styles.ressourcesContainer}>
          <View style={styles.ressourcesHeader}>
            <Ionicons name="cube-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.ressourcesTitle}>Ressources à livrer</Text>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>{totalRessources} unités</Text>
            </View>
          </View>
          
          <View style={styles.ressourcesGrid}>
            <ResourceItem 
              icon="tent" 
              value={etape.ressources.tentes}
              label="Tentes"
              color={COLORS.primary[800]}
            />
            <ResourceItem 
              icon="bed-blank" 
              value={etape.ressources.couvertures}
              label="Couvertures"
              color={COLORS.secondary[700]}
            />
            <ResourceItem 
              icon="food-apple" 
              value={etape.ressources.vivres}
              label="Vivres"
              color={COLORS.warning.dark}
            />
            <ResourceItem 
              icon="medical-bag" 
              value={etape.ressources.kits_med}
              label="Kits méd."
              color={COLORS.error.dark}
            />
          </View>
        </View>

        {isActive && statut !== 'livree' && onStartPress && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={onStartPress}
            activeOpacity={0.85}
          >
            <View style={styles.startButtonIcon}>
              <Ionicons name="cube" size={20} color={COLORS.primary[800]} />
            </View>
            <Text style={styles.startButtonText}>Commencer la livraison</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.primary[800]} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
    ...SHADOWS.sm,
    overflow: 'hidden',
  },
  containerActive: {
    ...SHADOWS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary[200],
  },
  containerDone: {
    opacity: 0.75,
    backgroundColor: COLORS.gray[50],
  },
  
  priorityBar: {
    width: 6,
  },
  
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  stepNumberContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.xs,
  },
  stepNumberActive: {
    backgroundColor: COLORS.primary[800],
    ...SHADOWS.primary,
  },
  stepNumberDone: {
    backgroundColor: COLORS.success.main,
  },
  stepNumberText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '800',
    color: COLORS.text.secondary,
  },
  stepNumberTextActive: {
    color: COLORS.text.inverse,
  },
  headerContent: {
    flex: 1,
    gap: SPACING.xs,
  },
  douarName: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '800',
    color: COLORS.text.primary,
    lineHeight: 24,
  },
  textDone: {
    color: COLORS.text.tertiary,
    textDecorationLine: 'line-through',
  },
  
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
    position: 'relative',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pulseIndicator: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 6,
    height: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary[800],
  },
  
  topsisContainer: {
    marginBottom: SPACING.md,
  },
  topsisBar: {
    height: 6,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  topsisFill: {
    height: '100%',
    backgroundColor: COLORS.success.main,
    borderRadius: BORDER_RADIUS.full,
  },
  topsisFillHigh: {
    backgroundColor: COLORS.error.main,
  },
  topsisFillMedium: {
    backgroundColor: COLORS.warning.main,
  },
  topsisText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  topsisValue: {
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  
  infoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
    flex: 1,
  },
  infoChipIcon: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoChipValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  infoChipLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.secondary,
  },
  
  ressourcesContainer: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  ressourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  ressourcesTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  totalBadge: {
    backgroundColor: COLORS.primary[100],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  totalBadgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: COLORS.primary[800],
  },
  ressourcesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
    minWidth: 80,
  },
  resourceValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  resourceLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.secondary,
  },
  
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary[200],
  },
  startButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  startButtonText: {
    flex: 1,
    marginHorizontal: SPACING.md,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '800',
    color: COLORS.primary[800],
  },
});
