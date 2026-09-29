import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { CURRENCIES, Currency } from './format';
import { HEAT_COLORS, HeatColor, ThemeMode } from './theme';
import { Expense, ExpenseInput } from './types';

const EXPENSES_KEY = 'expenses:v1';
const SETTINGS_KEY = 'settings:v1';

export type Settings = {
  currency: Currency;
  heatColor: HeatColor;
  reminderEnabled: boolean;
  /** 24h clock hour for the daily reminder. */
  reminderHour: number;
  /** Automatically add expenses from bank "debited" SMS. */
  smsEnabled: boolean;
  /** When SMS auto-add was turned on (epoch ms); older messages are never imported. */
  smsEnabledAt: number;
  /** Light, dark, or follow the phone's setting. */
  themeMode: ThemeMode;
};

export const DEFAULT_SETTINGS: Settings = {
  currency: '₹',
  heatColor: 'green',
  reminderEnabled: true,
  reminderHour: 19,
  smsEnabled: false,
  smsEnabledAt: 0,
  themeMode: 'system',
};

const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

function sanitizeSettings(raw: unknown): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(typeof raw === 'object' && raw ? raw : {}) } as Settings;
  if (!(CURRENCIES as readonly string[]).includes(s.currency)) s.currency = DEFAULT_SETTINGS.currency;
  if (!HEAT_COLORS.includes(s.heatColor)) s.heatColor = DEFAULT_SETTINGS.heatColor;
  if (!Number.isInteger(s.reminderHour) || s.reminderHour < 0 || s.reminderHour > 23) {
    s.reminderHour = DEFAULT_SETTINGS.reminderHour;
  }
  s.reminderEnabled = Boolean(s.reminderEnabled);
  s.smsEnabled = Boolean(s.smsEnabled);
  if (!Number.isFinite(s.smsEnabledAt)) s.smsEnabledAt = 0;
  if (!THEME_MODES.includes(s.themeMode)) s.themeMode = DEFAULT_SETTINGS.themeMode;
  return s;
}

export type AppData = { expenses: Expense[]; settings: Settings };

// One in-memory copy shared by the UI and background tasks (SMS, widget) running in the same
// JS runtime. Every change goes through here, so a background add can't be overwritten by a
// stale copy held by the screen.
let data: AppData | null = null;
let loading: Promise<AppData> | null = null;
const listeners = new Set<() => void>();

/** Loads saved data once; later calls return the shared in-memory copy. */
export function loadData(): Promise<AppData> {
  if (data) return Promise.resolve(data);
  loading ??= Promise.all([AsyncStorage.getItem(EXPENSES_KEY), AsyncStorage.getItem(SETTINGS_KEY)]).then(
    ([rawExpenses, rawSettings]) => {
      data = {
        expenses: rawExpenses ? JSON.parse(rawExpenses) : [],
        settings: sanitizeSettings(rawSettings ? JSON.parse(rawSettings) : null),
      };
      return data;
    },
  );
  return loading;
}

function notify() {
  listeners.forEach((l) => l());
}

export async function mutateExpenses(update: (prev: Expense[]) => Expense[]): Promise<Expense[]> {
  await loadData();
  data = { ...data!, expenses: update(data!.expenses) };
  notify();
  await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(data.expenses));
  return data.expenses;
}

export async function mutateSettings(patch: Partial<Settings>): Promise<Settings> {
  await loadData();
  data = { ...data!, settings: { ...data!.settings, ...patch } };
  notify();
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
  return data.settings;
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function useExpenses() {
  const [snapshot, setSnapshot] = useState<AppData | null>(data);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribe(() => active && setSnapshot(data));
    loadData()
      .then((d) => active && setSnapshot(d))
      .catch((e) => {
        console.warn('Failed to load saved data', e);
        if (active) setSnapshot({ expenses: [], settings: DEFAULT_SETTINGS });
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const save = (p: Promise<unknown>) => p.catch((e) => console.warn('Failed to save', e));

  const addExpense = useCallback(
    (input: ExpenseInput) =>
      save(mutateExpenses((prev) => [{ ...input, id: newId(), createdAt: Date.now() }, ...prev])),
    [],
  );

  const updateExpense = useCallback(
    (id: string, input: ExpenseInput) =>
      save(mutateExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...input } : e)))),
    [],
  );

  const deleteExpense = useCallback(
    (id: string) => save(mutateExpenses((prev) => prev.filter((e) => e.id !== id))),
    [],
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => save(mutateSettings(patch)), []);

  return {
    expenses: snapshot?.expenses ?? [],
    settings: snapshot?.settings ?? DEFAULT_SETTINGS,
    loaded: snapshot !== null,
    addExpense,
    updateExpense,
    deleteExpense,
    updateSettings,
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
