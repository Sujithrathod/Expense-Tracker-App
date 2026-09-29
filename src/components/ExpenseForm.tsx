import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORIES } from '../categories';
import { Currency, daysAgo, isValidISODate, parseAmount } from '../format';
import { makeStyles, useTheme } from '../theme';
import { CategoryId, Expense, ExpenseInput } from '../types';

type Props = {
  visible: boolean;
  /** When set, the form edits this expense; otherwise it adds a new one. */
  editing: Expense | null;
  currency: Currency;
  onSave: (input: ExpenseInput) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export function ExpenseForm({ visible, editing, currency, onSave, onDelete, onClose }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryId>('food');
  const [date, setDate] = useState(daysAgo(0));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAmount(editing ? (editing.amountCents / 100).toFixed(2) : '');
    setCategory(editing?.category ?? 'food');
    setDate(editing?.date ?? daysAgo(0));
    setNote(editing?.note ?? '');
    setError(null);
    setConfirmDelete(false);
  }, [visible, editing]);

  function handleSave() {
    const cents = parseAmount(amount);
    if (cents === null) {
      setError('Enter an amount greater than 0 (e.g. 250 or 99.50).');
      return;
    }
    if (!isValidISODate(date)) {
      setError('Enter the date as YYYY-MM-DD.');
      return;
    }
    onSave({ amountCents: cents, category, date, note: note.trim() });
  }

  function handleDelete() {
    if (!editing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(editing.id);
  }

  const quickDates = [
    { label: 'Today', value: daysAgo(0) },
    { label: 'Yesterday', value: daysAgo(1) },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.headerRow}>
              <Text style={styles.title}>{editing ? 'Edit expense' : 'New expense'}</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>{currency}</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(t) => {
                  setAmount(t);
                  setError(null);
                }}
                placeholder="0.00"
                placeholderTextColor={theme.muted}
                keyboardType="decimal-pad"
                autoFocus={!editing}
                accessibilityLabel="Amount"
              />
            </View>

            <Text style={styles.label}>Category</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => {
                const selected = c.id === category;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategory(c.id)}
                    style={[
                      styles.chip,
                      selected && { backgroundColor: c.color, borderColor: c.color },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {c.emoji} {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Date</Text>
            <View style={styles.dateRow}>
              {quickDates.map((q) => (
                <Pressable
                  key={q.label}
                  onPress={() => setDate(q.value)}
                  style={[styles.chip, date === q.value && styles.chipActive]}
                >
                  <Text style={[styles.chipText, date === q.value && styles.chipTextSelected]}>
                    {q.label}
                  </Text>
                </Pressable>
              ))}
              <TextInput
                style={styles.dateInput}
                value={date}
                onChangeText={(t) => {
                  setDate(t);
                  setError(null);
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.muted}
                maxLength={10}
                accessibilityLabel="Date"
              />
            </View>

            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Lunch with team"
              placeholderTextColor={theme.muted}
              maxLength={80}
              accessibilityLabel="Note"
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable style={styles.saveButton} onPress={handleSave} accessibilityRole="button">
              <Text style={styles.saveText}>{editing ? 'Save changes' : 'Add expense'}</Text>
            </Pressable>

            {editing && (
              <Pressable
                style={[styles.deleteButton, confirmDelete && styles.deleteButtonConfirm]}
                onPress={handleDelete}
                accessibilityRole="button"
              >
                <Text style={[styles.deleteText, confirmDelete && styles.deleteTextConfirm]}>
                  {confirmDelete ? 'Tap again to delete' : 'Delete expense'}
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((theme) => ({
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
  cancel: { fontSize: 16, color: theme.primary },
  label: { marginTop: 18, marginBottom: 8, fontSize: 13, fontWeight: '600', color: theme.muted },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: theme.primary,
  },
  currency: { fontSize: 28, fontWeight: '600', color: theme.text, marginRight: 6 },
  amountInput: { flex: 1, minWidth: 0, fontSize: 32, fontWeight: '700', color: theme.text, paddingVertical: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { fontSize: 14, color: theme.text },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  dateInput: {
    flexGrow: 1,
    flexBasis: 120,
    minWidth: 0,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: theme.text,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
  },
  error: { marginTop: 12, color: theme.danger, fontSize: 14 },
  saveButton: {
    marginTop: 24,
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteButton: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonConfirm: { backgroundColor: theme.danger },
  deleteText: { color: theme.danger, fontSize: 16, fontWeight: '600' },
  deleteTextConfirm: { color: '#fff' },
}));
