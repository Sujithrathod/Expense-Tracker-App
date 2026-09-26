export const theme = {
  background: '#F3F4F6',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  primary: '#4F46E5',
  danger: '#DC2626',
  success: '#059669',
};

export type HeatColor = 'green' | 'blue' | 'purple' | 'orange';

export const HEAT_COLORS: HeatColor[] = ['green', 'blue', 'purple', 'orange'];

/** Heatmap colours from "no spend" (index 0) to "highest spend" (index 4). */
export const HEAT_PALETTES: Record<HeatColor, [string, string, string, string, string]> = {
  green: ['#EBEDF0', '#9BE9A8', '#40C463', '#30A14E', '#216E39'],
  blue: ['#EBEDF0', '#BFDBFE', '#60A5FA', '#2563EB', '#1E3A8A'],
  purple: ['#EBEDF0', '#DDD6FE', '#A78BFA', '#7C3AED', '#4C1D95'],
  orange: ['#EBEDF0', '#FED7AA', '#FB923C', '#EA580C', '#9A3412'],
};
