/**
 * MTSPC MOBILE - Design System v2.0
 * ================================
 * Système de design moderne, accessible et cohérent pour l'application
 * de distribution humanitaire NAJDA/MTSPC.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// COULEURS
// ═══════════════════════════════════════════════════════════════════════════════

export const COLORS = {
  // Primary - Bleu professionnel (conservé mais enrichi)
  primary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0', // Main brand color
    900: '#0D47A1',
  },

  // Secondary - Teal pour complémentarité
  secondary: {
    50: '#E0F2F1',
    100: '#B2DFDB',
    200: '#80CBC4',
    300: '#4DB6AC',
    400: '#26A69A',
    500: '#009688',
    600: '#00897B',
    700: '#00796B',
    800: '#00695C',
    900: '#004D40',
  },

  // Semantic Colors
  success: {
    light: '#81C784',
    main: '#4CAF50',
    dark: '#388E3C',
    50: '#E8F5E9',
  },
  warning: {
    light: '#FFB74D',
    main: '#FF9800',
    dark: '#F57C00',
    50: '#FFF3E0',
  },
  error: {
    light: '#E57373',
    main: '#F44336',
    dark: '#D32F2F',
    50: '#FFEBEE',
  },
  info: {
    light: '#64B5F6',
    main: '#2196F3',
    dark: '#1976D2',
    50: '#E3F2FD',
  },

  // Status Colors spécifiques aux missions
  status: {
    draft: {
      bg: '#F5F5F5',
      text: '#616161',
      border: '#E0E0E0',
    },
    pending: {
      bg: '#FFF3E0',
      text: '#E65100',
      border: '#FFCC80',
    },
    in_progress: {
      bg: '#E3F2FD',
      text: '#1565C0',
      border: '#90CAF9',
    },
    completed: {
      bg: '#E8F5E9',
      text: '#2E7D32',
      border: '#A5D6A7',
    },
    cancelled: {
      bg: '#FFEBEE',
      text: '#C62828',
      border: '#EF9A9A',
    },
  },

  // Priority Colors
  priority: {
    low: {
      bg: '#F5F5F5',
      text: '#757575',
    },
    medium: {
      bg: '#FFF8E1',
      text: '#F9A825',
    },
    high: {
      bg: '#FFEBEE',
      text: '#D32F2F',
    },
    critical: {
      bg: '#D32F2F',
      text: '#FFFFFF',
    },
  },

  // Grayscale
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // Background & Surface
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',

  // Text
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    tertiary: '#94A3B8',
    disabled: '#CBD5E1',
    inverse: '#FFFFFF',
  },

  // Border
  border: {
    light: '#E2E8F0',
    default: '#CBD5E1',
    dark: '#94A3B8',
  },

  // Gradient presets
  gradient: {
    primary: ['#1565C0', '#1976D2', '#1E88E5'],
    success: ['#2E7D32', '#388E3C', '#43A047'],
    header: ['#1565C0', '#1976D2'],
    card: ['#FFFFFF', '#FAFAFA'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ESPACEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHIE
// ═══════════════════════════════════════════════════════════════════════════════

export const TYPOGRAPHY = {
  // Font families
  fontFamily: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
    mono: 'RobotoMono-Regular',
  },

  // Sizes
  size: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Presets
  h1: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: COLORS.text.primary,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.text.primary,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: COLORS.text.primary,
    lineHeight: 24,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: COLORS.text.secondary,
  },
  overline: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: COLORS.text.secondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  button: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.text.inverse,
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.text.secondary,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// RAYONS DE BORDURE
// ═══════════════════════════════════════════════════════════════════════════════

export const BORDER_RADIUS = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

// ═══════════════════════════════════════════════════════════════════════════════
// OMBRES (améliorées avec plus de profondeur)
// ═══════════════════════════════════════════════════════════════════════════════

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  // Ombres colorées pour éléments spéciaux
  primary: {
    shadowColor: COLORS.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  success: {
    shadowColor: COLORS.success.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  error: {
    shadowColor: COLORS.error.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  // Ombre intérieure (pour inputs)
  inner: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const ANIMATION = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    default: 'ease-out',
    bounce: 'spring',
    smooth: 'ease-in-out',
  },
  spring: {
    gentle: { damping: 20, stiffness: 180 },
    bouncy: { damping: 12, stiffness: 200 },
    stiff: { damping: 30, stiffness: 300 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS PRÉDÉFINIS (Styles réutilisables)
// ═══════════════════════════════════════════════════════════════════════════════

export const COMPONENTS = {
  // Cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  cardElevated: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  cardInteractive: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
    // État pressé géré dans le composant
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: COLORS.primary[800],
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: SPACING.sm,
    ...SHADOWS.primary,
  },
  buttonSecondary: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary[800],
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: SPACING.sm,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: SPACING.sm,
  },
  buttonSuccess: {
    backgroundColor: COLORS.success.dark,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: SPACING.sm,
    ...SHADOWS.success,
  },

  // Inputs
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.primary,
  },
  inputFocused: {
    borderColor: COLORS.primary[600],
    borderWidth: 2,
    ...SHADOWS.inner,
  },

  // Badges
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

export const getStatusColors = (status: string) => {
  switch (status) {
    case 'completed':
    case 'terminee':
      return COLORS.status.completed;
    case 'in_progress':
    case 'en_cours':
      return COLORS.status.in_progress;
    case 'pending':
    case 'planifiee':
      return COLORS.status.pending;
    case 'cancelled':
    case 'annulee':
      return COLORS.status.cancelled;
    case 'draft':
    default:
      return COLORS.status.draft;
  }
};

export const getPriorityColors = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case 'critique':
    case 'critical':
      return COLORS.priority.critical;
    case 'haute':
    case 'high':
      return COLORS.priority.high;
    case 'moyenne':
    case 'medium':
      return COLORS.priority.medium;
    case 'basse':
    case 'low':
    default:
      return COLORS.priority.low;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT PAR DÉFAUT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  BORDER_RADIUS,
  SHADOWS,
  ANIMATION,
  COMPONENTS,
  getStatusColors,
  getPriorityColors,
};
