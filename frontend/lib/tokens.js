/**
 * AudioFlow Design Tokens - JavaScript/TypeScript
 * Central export for all design tokens
 */

export const colors = {
  // Primary Brand
  primary: {
    500: '#007AFF',
    hover: '#0056CC',
    active: '#0044A8',
  },

  // Dark Mode Backgrounds
  background: {
    dark: '#000000',
    surface: '#1C1C1E',
    elevated: '#2C2C2E',
  },

  // Surface Aliases
  surface: {
    dark: '#1C1C1E',
    elevated: '#2C2C2E',
  },

  // Neutral Grays
  neutral: {
    100: '#8E8E93',
    200: '#999999',
  },

  // Text Colors
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.8)',
    tertiary: 'rgba(255, 255, 255, 0.6)',
    disabled: '#8E8E93',
    label: '#999999',
  },

  // Border Colors
  border: {
    subtle: 'rgba(255, 255, 255, 0.05)',
    default: 'rgba(255, 255, 255, 0.10)',
    strong: 'rgba(255, 255, 255, 0.20)',
  },

  // Destructive Colors
  destructive: {
    default: '#F43F5E',
    hover: '#E11D48',
    background: 'rgba(244, 63, 94, 0.10)',
  },
};

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
};

export const typography = {
  fontFamily: {
    primary: "'Public Sans', sans-serif",
    secondary: "'Inter', sans-serif",
  },

  fontSize: {
    '2xs': '9px',
    xs: '10px',
    sm: '11px',
    base: '12px',
    md: '13px',
    lg: '14px',
    xl: '15px',
    '2xl': '16px',
    '3xl': '18px',
    '4xl': '20px',
    '5xl': '24px',
    '6xl': '32px',
    '7xl': '40px',
  },

  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeight: {
    tight: '1.0',
    normal: '1.25',
    relaxed: '1.5',
  },

  letterSpacing: {
    tight: '-0.015em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

export const borderRadius = {
  none: '0px',
  sm: '4px',
  default: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  '3xl': '32px',
  full: '9999px',
};

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  default: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  primaryGlow: '0 0 20px rgba(0, 122, 255, 0.4)',
  primaryLg: '0 10px 15px -3px rgba(0, 122, 255, 0.3)',
};

// Component-specific tokens
export const components = {
  button: {
    primary: {
      background: colors.primary[500],
      color: '#FFFFFF',
      paddingY: spacing[3],
      paddingX: spacing[6],
      borderRadius: borderRadius.lg,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      shadow: shadows.primaryLg,
    },
    fab: {
      width: spacing[16],
      height: spacing[16],
      borderRadius: borderRadius.full,
      shadow: shadows.primaryGlow,
      iconSize: typography.fontSize['6xl'],
    },
  },

  card: {
    background: colors.background.surface,
    border: colors.border.subtle,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    shadow: shadows.sm,
  },

  input: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: colors.border.subtle,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    fontSize: typography.fontSize.xs,
  },

  avatar: {
    sm: spacing[8],
    md: spacing[14],
    lg: spacing[24],
  },

  chip: {
    background: colors.background.elevated,
    color: colors.text.primary,
    paddingY: spacing[2],
    paddingX: spacing[4],
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.sm,
  },
};

export default {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  components,
};