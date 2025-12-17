export const lightTheme = {
  background: '#f1f5f9',
  surface: '#ffffff',
  card: '#ffffff',
  cardElevated: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  primaryDark: '#2563eb',
  primaryGradientStart: '#3b82f6',
  primaryGradientEnd: '#1d4ed8',
  secondary: '#8b5cf6',
  secondaryLight: '#a78bfa',
  success: '#10b981',
  successLight: '#34d399',
  successGradientStart: '#10b981',
  successGradientEnd: '#059669',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  danger: '#ef4444',
  dangerLight: '#f87171',
  dangerGradientStart: '#ef4444',
  dangerGradientEnd: '#dc2626',
  text: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
  textMuted: '#cbd5e1',
  shadow: 'rgba(0, 0, 0, 0.08)',
  shadowMedium: 'rgba(0, 0, 0, 0.12)',
  shadowStrong: 'rgba(0, 0, 0, 0.16)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shimmer: '#e2e8f0',
  accent: '#06b6d4',
  accentLight: '#22d3ee',
};

export const darkTheme = {
  background: '#0f172a',
  surface: '#1e293b',
  card: '#1e293b',
  cardElevated: '#334155',
  border: '#334155',
  borderLight: '#1e293b',
  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  primaryDark: '#2563eb',
  primaryGradientStart: '#3b82f6',
  primaryGradientEnd: '#1d4ed8',
  secondary: '#8b5cf6',
  secondaryLight: '#a78bfa',
  success: '#10b981',
  successLight: '#34d399',
  successGradientStart: '#10b981',
  successGradientEnd: '#059669',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  danger: '#ef4444',
  dangerLight: '#f87171',
  dangerGradientStart: '#ef4444',
  dangerGradientEnd: '#dc2626',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  textMuted: '#475569',
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowMedium: 'rgba(0, 0, 0, 0.4)',
  shadowStrong: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shimmer: '#334155',
  accent: '#06b6d4',
  accentLight: '#22d3ee',
};

export type Theme = typeof lightTheme;

// Modern shadow presets for elevated components
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  }),
};

// Animation durations
export const animations = {
  fast: 150,
  normal: 250,
  slow: 400,
};

// Border radius presets
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// Spacing presets
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};
