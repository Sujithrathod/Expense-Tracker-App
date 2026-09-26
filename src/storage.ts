import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { CURRENCIES, Currency } from './format';
import { HEAT_COLORS, HeatColor } from './theme';
import { Expense, ExpenseInput } from './types';

const EXPENSES_KEY = 'expenses:v1';
const SETTINGS_KEY = 'settings:v1';

export type Settings = {
  currency: Currency;
  heatColor: HeatColor;
  reminderEnabled: boolean;
  /** 24h clock hour for the daily reminder. */
  reminderHour: number;
};

export const DEFAULT_SETTINGS: Settings = {
  currency: '₹',
  heatColor: 'green',
  reminderEnabled: true,
  reminderHour: 19,
};

function sanitizeSettings(raw: unknown): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(typeof raw === 'object' && raw ? raw : {}) } as Settings;
  if (!(CURRENCIES as readonly string[]).includes(s.currency)) s.currency = DEFAULT_SETTINGS.currency;
  if (!HEAT_COLORS.includes(s.heatColor)) s.heatColor = DEFAULT_SETTINGS.heatColor;
  if (!Number.isInteger(s.reminderHour) || s.reminderHour < 0 || s.reminderHour > 23) {
    s.reminderHour = DEFAULT_SETTINGS.reminderHour;
  }
  s.reminderEnabled = Boolean(s.reminderEnabled);
  return s;
}

/** Reads saved data outside React — used by the app on start and by the widget's background task. */
export async function loadData(): Promise<{ expenses: Expense[]; settings: Settings }> {
  const [rawExpenses, rawSettings] = await Promise.all([
    AsyncStorage.getItem(EXPENSES_KEY),
    AsyncStorage.getItem(SETTINGS_KEY),
  ]);
  return {
    expenses: rawExpenses ? JSON.parse(rawExpenses) : [],
    settings: sanitizeSettings(rawSettings ? JSON.parse(rawSettings) : null),
  };
}

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadData()
      .then((data) => {
        setExpenses(data.expenses);
        setSettings(data.settings);
      })
      .catch((e) => console.warn('Failed to load saved data', e))
      .finally(() => setLoaded(true));
  }, []);

  const changeExpenses = useCallback((update: (prev: Expense[]) => Expense[]) => {
    setExpenses((prev) => {
      const next = update(prev);
      AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(next)).catch((e) =>
        console.warn('Failed to save expenses', e),
      );
      return next;
    });
  }, []);

  const addExpense = useCallback(
    (input: ExpenseInput) =>
      changeExpenses((prev) => [{ ...input, id: newId(), createdAt: Date.now() }, ...prev]),
    [changeExpenses],
  );

  const updateExpense = useCallback(
    (id: string, input: ExpenseInput) =>
      changeExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...input } : e))),
    [changeExpenses],
  );

  const deleteExpense = useCallback(
    (id: string) => changeExpenses((prev) => prev.filter((e) => e.id !== id)),
    [changeExpenses],
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { expenses, settings, loaded, addExpense, updateExpense, deleteExpense, updateSettings };
}
