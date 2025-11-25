import { create } from 'zustand';
import { lightTheme, darkTheme, Theme } from '@/utils/theme';

interface ThemeStore {
  isDark: boolean;
  theme: Theme;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>(set => ({
  isDark: true,
  theme: darkTheme,
  toggleTheme: () =>
    set(state => ({
      isDark: !state.isDark,
      theme: !state.isDark ? darkTheme : lightTheme,
    })),
}));
