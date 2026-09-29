import { createContext, useContext, useMemo } from 'react';
import { StyleSheet } from 'react-native';

export type HeatColor = 'green' | 'blue' | 'purple' | 'orange';

export const HEAT_COLORS: HeatColor[] = ['green', 'blue', 'purple', 'orange'];

type HeatPalette = [string, string, string, string, string];

export type ThemeMode = 'system' | 'light' | 'dark';

export type Theme = {
  dark: boolean;
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  danger: string;
  success: string;
  /** Heatmap colours from "no spend" (index 0) to "highest spend" (index 4). */
  heat: Record<HeatColor, HeatPalette>;
};

export const lightTheme: Theme = {
  dark: false,
  background: '#F3F4F6',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  primary: '#4F46E5',
  danger: '#DC2626',
  success: '#059669',
  heat: {
    green: ['#EBEDF0', '#9BE9A8', '#40C463', '#30A14E', '#216E39'],
    blue: ['#EBEDF0', '#BFDBFE', '#60A5FA', '#2563EB', '#1E3A8A'],
    purple: ['#EBEDF0', '#DDD6FE', '#A78BFA', '#7C3AED', '#4C1D95'],
    orange: ['#EBEDF0', '#FED7AA', '#FB923C', '#EA580C', '#9A3412'],
  },
};

export const darkTheme: Theme = {
  dark: true,
  background: '#0F1115',
  card: '#1A1D24',
  text: '#F3F4F6',
  muted: '#9CA3AF',
  border: '#2A2F3A',
  primary: '#6366F1',
  danger: '#F87171',
  success: '#34D399',
  // On a dark background low spend is dim and high spend is bright (like GitHub's dark theme).
  heat: {
    green: ['#232830', '#0E4429', '#006D32', '#26A641', '#39D353'],
    blue: ['#232830', '#1E3A8A', '#1D4ED8', '#3B82F6', '#93C5FD'],
    purple: ['#232830', '#4C1D95', '#6D28D9', '#8B5CF6', '#C4B5FD'],
    orange: ['#232830', '#7C2D12', '#C2410C', '#F97316', '#FDBA74'],
  },
};

export const ThemeContext = createContext<Theme>(lightTheme);

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Like StyleSheet.create, but the styles are rebuilt when the theme changes:
 *   const useStyles = makeStyles((theme) => ({ card: { backgroundColor: theme.card } }));
 *   const styles = useStyles();
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T) {
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}
