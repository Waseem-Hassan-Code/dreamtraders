export const lightTheme = {
  background: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  border: '#e2e8f0',
  primary: '#0ea5e9',
  primaryDark: '#0284c7',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#0f172a',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const darkTheme = {
  background: '#0f172a',
  surface: '#1e293b',
  card: '#1e293b',
  border: '#334155',
  primary: '#0ea5e9',
  primaryDark: '#0284c7',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#ffffff',
  textSecondary: '#cbd5e1',
  textTertiary: '#94a3b8',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

export type Theme = typeof lightTheme;
