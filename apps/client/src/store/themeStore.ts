import { create } from 'zustand';

export type Theme = 'light' | 'dark';

type ThemeState = {
  theme: Theme;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = 'odinum_theme';

const isValidTheme = (value: string | null): value is Theme =>
  value === 'light' || value === 'dark';

const getStoredTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(stored) ? stored : 'dark';
  } catch {
    return 'dark';
  }
};

const applyTheme = (theme: Theme) => {
  try {
    document.documentElement.setAttribute('data-theme', theme);
  } catch (error) {
    console.warn('DOM data-theme unavailable:', error);
  }
};

const initialTheme = getStoredTheme();
applyTheme(initialTheme);

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  toggleTheme: () => {
    const nextTheme: Theme = get().theme === 'dark' ? 'light' : 'dark';

    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      console.warn('LocalStorage mutation restricted.');
    }

    applyTheme(nextTheme);
    set({ theme: nextTheme });
  },
}));
