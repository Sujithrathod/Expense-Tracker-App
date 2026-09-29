import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExpenseForm } from './src/components/ExpenseForm';
import { SettingsSheet } from './src/components/SettingsSheet';
import { ReminderStatus, onReminderTapped, syncDailyReminder } from './src/notifications';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { TrackerScreen } from './src/screens/TrackerScreen';
import { catchUpFromInbox, setSmsListening } from './src/sms';
import { useExpenses } from './src/storage';
import { ThemeContext, darkTheme, lightTheme, makeStyles, useTheme } from './src/theme';
import { Expense, ExpenseInput } from './src/types';
import { refreshWidgets } from './src/widget';

type Tab = 'expenses' | 'tracker';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'expenses', label: 'Expenses', icon: '🧾' },
  { id: 'tracker', label: 'Tracker', icon: '📊' },
];

/** Deep link used by the widget's "+ Add" button. */
function isAddExpenseLink(url: string | null): boolean {
  return !!url && /^expensetracker:\/\/add\b/.test(url);
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

type Store = ReturnType<typeof useExpenses>;

/** Picks light or dark colours from the setting (or the phone's, for "System"). */
function Root() {
  const store = useExpenses();
  const systemScheme = useColorScheme();
  const { themeMode } = store.settings;
  const dark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const theme = dark ? darkTheme : lightTheme;

  // Colour the window behind the app too, so there's no white flash in dark mode.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.background).catch(() => {});
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Main store={store} />
    </ThemeContext.Provider>
  );
}

function Main({ store }: { store: Store }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useStyles();
  const { expenses, settings, loaded, addExpense, updateExpense, deleteExpense, updateSettings } =
    store;

  const [tab, setTab] = useState<Tab>('expenses');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<ReminderStatus | null>(null);

  const openAdd = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  function openEdit(expense: Expense) {
    setEditing(expense);
    setFormOpen(true);
  }

  function handleSave(input: ExpenseInput) {
    if (editing) updateExpense(editing.id, input);
    else addExpense(input);
    setFormOpen(false);
  }

  function handleDelete(id: string) {
    deleteExpense(id);
    setFormOpen(false);
  }

  useEffect(() => {
    if (!loaded) return;
    syncDailyReminder(settings.reminderEnabled, settings.reminderHour)
      .then(setReminderStatus)
      .catch((e) => console.warn('Could not schedule reminder', e));
  }, [loaded, settings.reminderEnabled, settings.reminderHour]);

  useEffect(() => {
    if (loaded) refreshWidgets(expenses, settings.currency);
  }, [loaded, expenses, settings.currency]);

  // SMS auto-add: keep the native receiver's switch in sync, and each time the app comes to the
  // foreground pick up any payment SMS it missed while closed.
  useEffect(() => {
    if (!loaded) return;
    setSmsListening(settings.smsEnabled);
    if (!settings.smsEnabled) return;
    const catchUp = () => catchUpFromInbox().catch((e) => console.warn('SMS catch-up failed', e));
    catchUp();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && catchUp());
    return () => sub.remove();
  }, [loaded, settings.smsEnabled]);

  // Opening the app from the reminder or the widget's "+ Add" goes straight to the add form.
  useEffect(() => {
    if (!loaded) return;
    const unsubscribeReminder = onReminderTapped(openAdd);
    Linking.getInitialURL()
      .then((url) => isAddExpenseLink(url) && openAdd())
      .catch(() => {});
    const linkSub = Linking.addEventListener('url', ({ url }) => isAddExpenseLink(url) && openAdd());
    return () => {
      unsubscribeReminder();
      linkSub.remove();
    };
  }, [loaded, openAdd]);

  if (!loaded) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const tabBarHeight = 60 + insets.bottom;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>{tab === 'expenses' ? 'Expenses' : 'Tracker'}</Text>
        <View style={styles.headerButtons}>
          <Pressable
            onPress={() => updateSettings({ themeMode: theme.dark ? 'light' : 'dark' })}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={theme.dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <Text style={styles.iconText}>{theme.dark ? '☀️' : '🌙'}</Text>
          </Pressable>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            style={styles.iconButton}
            accessibilityLabel="Settings"
          >
            <Text style={styles.iconText}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        {tab === 'expenses' ? (
          <ExpensesScreen
            expenses={expenses}
            currency={settings.currency}
            onEdit={openEdit}
            bottomInset={0}
          />
        ) : (
          <TrackerScreen
            expenses={expenses}
            currency={settings.currency}
            heatColor={settings.heatColor}
            onHeatColorChange={(heatColor) => updateSettings({ heatColor })}
            onEdit={openEdit}
            bottomInset={0}
          />
        )}
      </View>

      <Pressable
        onPress={openAdd}
        style={[styles.fab, { bottom: tabBarHeight + 16 }]}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <View style={[styles.tabBar, { height: tabBarHeight, paddingBottom: insets.bottom }]}>
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabIcon, !active && styles.tabInactive]}>{t.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ExpenseForm
        visible={formOpen}
        editing={editing}
        currency={settings.currency}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => setFormOpen(false)}
      />

      <SettingsSheet
        visible={settingsOpen}
        settings={settings}
        reminderStatus={reminderStatus}
        onChange={updateSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: { flex: 1, backgroundColor: theme.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  appTitle: { fontSize: 28, fontWeight: '800', color: theme.text },
  headerButtons: { flexDirection: 'row', gap: 8 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  iconText: { fontSize: 18 },
  fab: {
    position: 'absolute',
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 34, fontWeight: '400' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  tabIcon: { fontSize: 20 },
  tabInactive: { opacity: 0.45 },
  tabLabel: { fontSize: 12, color: theme.muted, marginTop: 2 },
  tabLabelActive: { color: theme.primary, fontWeight: '700' },
}));
