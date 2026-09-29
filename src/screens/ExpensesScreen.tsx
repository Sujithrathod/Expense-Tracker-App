import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { getCategory } from '../categories';
import { MonthSummary } from '../components/MonthSummary';
import { Currency, formatMoney, friendlyDate, monthKey, monthLabel } from '../format';
import { makeStyles, useTheme } from '../theme';
import { Expense } from '../types';

type Props = {
  expenses: Expense[];
  currency: Currency;
  onEdit: (expense: Expense) => void;
  bottomInset: number;
};

export function ExpensesScreen({ expenses, currency, onEdit, bottomInset }: Props) {
  const styles = useStyles();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const monthExpenses = useMemo(() => {
    const key = monthKey(year, month);
    return expenses
      .filter((e) => e.date.startsWith(key))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [expenses, year, month]);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  return (
    <View style={styles.screen}>
      <View style={styles.monthRow}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={12} accessibilityLabel="Previous month">
          <Text style={styles.monthArrow}>‹</Text>
        </Pressable>
        <Text style={styles.monthText}>{monthLabel(year, month)}</Text>
        <Pressable
          onPress={() => shiftMonth(1)}
          hitSlop={12}
          disabled={isCurrentMonth}
          accessibilityLabel="Next month"
        >
          <Text style={[styles.monthArrow, isCurrentMonth && styles.disabled]}>›</Text>
        </Pressable>
      </View>

      <FlatList
        data={monthExpenses}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 100 }}
        ListHeaderComponent={<MonthSummary expenses={monthExpenses} currency={currency} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🧾</Text>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptyText}>Tap the + button to add your first one.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cat = getCategory(item.category);
          return (
            <Pressable
              onPress={() => onEdit(item)}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              accessibilityRole="button"
            >
              <View style={[styles.itemIcon, { backgroundColor: cat.color + '22' }]}>
                <Text style={styles.itemEmoji}>{cat.emoji}</Text>
              </View>
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.note || cat.label}
                </Text>
                <Text style={styles.itemSub}>
                  {cat.label} · {friendlyDate(item.date)}
                  {item.source === 'sms' && <Text style={styles.smsTag}>  💬 SMS</Text>}
                </Text>
              </View>
              <Text style={styles.itemAmount}>{formatMoney(item.amountCents, currency)}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: { flex: 1 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingTop: 4,
  },
  monthArrow: { fontSize: 30, color: theme.primary, paddingHorizontal: 8 },
  monthText: { fontSize: 16, fontWeight: '600', color: theme.text, minWidth: 150, textAlign: 'center' },
  disabled: { opacity: 0.25 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.text, marginTop: 8 },
  emptyText: { fontSize: 14, color: theme.muted, marginTop: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  itemPressed: { opacity: 0.7 },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemEmoji: { fontSize: 20 },
  itemBody: { flex: 1, marginRight: 8 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: theme.text },
  itemSub: { fontSize: 13, color: theme.muted, marginTop: 2 },
  smsTag: { color: theme.primary, fontWeight: '600' },
  itemAmount: { fontSize: 15, fontWeight: '700', color: theme.text },
}));
