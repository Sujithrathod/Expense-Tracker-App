import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CURRENCIES } from '../format';
import {
  ReminderStatus,
  formatHour,
  remindersSupported,
  remindersUnsupportedReason,
  sendTestReminder,
} from '../notifications';
import { SmsPermission, hasSmsPermission, requestSmsPermission, smsSupported } from '../sms';
import { Settings } from '../storage';
import { theme } from '../theme';
import { widgetsSupported } from '../widget';

type Props = {
  visible: boolean;
  settings: Settings;
  reminderStatus: ReminderStatus | null;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
};

const REMINDER_HOURS = [18, 19, 20, 21, 22];

export function SettingsSheet({ visible, settings, reminderStatus, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [testMessage, setTestMessage] = useState<string | null>(null);

  async function handleTest() {
    const status = await sendTestReminder();
    setTestMessage(
      status === 'scheduled'
        ? 'Test reminder coming in 5 seconds…'
        : status === 'denied'
          ? 'Notifications are blocked for this app.'
          : (remindersUnsupportedReason ?? 'Reminders aren’t available here.'),
    );
  }

  const statusText = remindersUnsupportedReason
    ? remindersUnsupportedReason
    : reminderStatus === 'denied'
      ? 'Notifications are blocked. Allow them in Android Settings → Apps → Expense Tracker → Notifications.'
      : settings.reminderEnabled
        ? `You'll get a reminder every day at ${formatHour(settings.reminderHour)}.`
        : 'Reminders are off.';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <ScrollView>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Settings</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.done}>Done</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Currency</Text>
            <View style={styles.chips}>
              {CURRENCIES.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  selected={settings.currency === c}
                  onPress={() => onChange({ currency: c })}
                />
              ))}
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Daily reminder</Text>
                <Text style={styles.rowSub}>A nudge to log what you spent that day</Text>
              </View>
              <Switch
                value={settings.reminderEnabled}
                onValueChange={(v) => onChange({ reminderEnabled: v })}
                trackColor={{ true: theme.primary, false: theme.border }}
                accessibilityLabel="Daily reminder"
              />
            </View>

            {settings.reminderEnabled && (
              <View style={styles.chips}>
                {REMINDER_HOURS.map((h) => (
                  <Chip
                    key={h}
                    label={formatHour(h)}
                    selected={settings.reminderHour === h}
                    onPress={() => onChange({ reminderHour: h })}
                  />
                ))}
              </View>
            )}
            <Text style={[styles.status, reminderStatus === 'denied' && { color: theme.danger }]}>
              {statusText}
            </Text>

            {remindersSupported && (
              <Pressable style={styles.secondaryButton} onPress={handleTest}>
                <Text style={styles.secondaryText}>Send a test reminder</Text>
              </Pressable>
            )}
            {testMessage && <Text style={styles.status}>{testMessage}</Text>}

            <SmsSection visible={visible} settings={settings} onChange={onChange} />

            <Text style={styles.label}>Home screen widget</Text>
            <Text style={styles.status}>
              {widgetsSupported
                ? 'Long-press your home screen → Widgets → Expense Tracker, then drag “Spending” onto the screen.'
                : 'The widget is available in the installed Android app (APK), not in Expo Go or the web preview.'}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SmsSection({
  visible,
  settings,
  onChange,
}: {
  visible: boolean;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const [problem, setProblem] = useState<SmsPermission | null>(null);

  // If SMS access was switched off in Android settings, show how to turn it back on.
  useEffect(() => {
    if (!visible || !settings.smsEnabled) return;
    hasSmsPermission().then((ok) => setProblem(ok ? null : 'denied'));
  }, [visible, settings.smsEnabled]);

  async function toggle(on: boolean) {
    if (!on) {
      setProblem(null);
      onChange({ smsEnabled: false });
      return;
    }
    const permission = await requestSmsPermission();
    if (permission === 'granted') {
      setProblem(null);
      // Only messages from now on are imported.
      onChange({ smsEnabled: true, smsEnabledAt: Date.now() });
    } else {
      setProblem(permission);
    }
  }

  return (
    <>
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Auto-add from SMS</Text>
          <Text style={styles.rowSub}>Adds payments from bank “debited” messages</Text>
        </View>
        <Switch
          value={settings.smsEnabled && problem === null}
          onValueChange={toggle}
          disabled={!smsSupported}
          trackColor={{ true: theme.primary, false: theme.border }}
          accessibilityLabel="Auto-add from SMS"
        />
      </View>

      {!smsSupported ? (
        <Text style={styles.status}>Available in the installed Android app (APK).</Text>
      ) : problem ? (
        <View>
          <Text style={[styles.status, { color: theme.danger }]}>
            Android didn’t allow SMS access. For apps installed outside the Play Store:
          </Text>
          <Text style={styles.status}>
            1. Tap “Open app settings” below{'\n'}
            2. Tap ⋮ (top-right) → “Allow restricted settings”{'\n'}
            3. Go to Permissions → SMS → Allow{'\n'}
            4. Come back and turn this switch on again
          </Text>
          <Pressable style={styles.secondaryButton} onPress={() => Linking.openSettings()}>
            <Text style={styles.secondaryText}>Open app settings</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.status}>
          {settings.smsEnabled
            ? 'On. New payments are added automatically. Messages are read on your phone only; nothing is uploaded.'
            : 'Off. Only messages received after you turn this on are used.'}
        </Text>
      )}
    </>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: theme.text },
  done: { fontSize: 16, fontWeight: '600', color: theme.primary },
  label: { marginTop: 22, marginBottom: 8, fontSize: 13, fontWeight: '600', color: theme.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { fontSize: 14, color: theme.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 12 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
  rowSub: { fontSize: 13, color: theme.muted, marginTop: 2 },
  status: { marginTop: 10, fontSize: 13, color: theme.muted, lineHeight: 18 },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { color: theme.primary, fontSize: 15, fontWeight: '600' },
});
