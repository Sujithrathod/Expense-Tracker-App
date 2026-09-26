import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCategory } from '../categories';
import { Currency, formatMoney, longDate } from '../format';
import { categoryTotals } from '../stats';
import { theme } from '../theme';
import { Expense } from '../types';
import { CategoryBreakdown } from './CategoryBreakdown';

type Props = {
  date: string;
  /** Expenses on that date. */
  expenses: Expense[];
  currency: Currency;
  onEdit: (expense: Expense) => void;
};

export function DayDetail({ date, expenses, currency, onEdit }: Props) {
  const total = expenses.reduce((s, e) => s + e.amountCents, 0);
  const sorted = [...expenses].sort((a, b) => b.amountCents - a.amountCents);

  return (
    <View>
      <Text style={styles.date}>{longDate(date)}</Text>
      {expenses.length === 0 ? (
        <Text style={styles.empty}>No spending on this day 🎉</Text>
      ) : (
        <>
          <Text style={styles.total}>
            {formatMoney(total, currency)}{' '}
            <Text style={styles.count}>
              · {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
            </Text>
          </Text>
          <CategoryBreakdown rows={categoryTotals(expenses)} total={total} currency={currency} />
          <View style={styles.list}>
            {sorted.map((e) => {
              const cat = getCategory(e.category);
              return (
                <Pressable
                  key={e.id}
                  onPress={() => onEdit(e)}
                  style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}
                  accessibilityRole="button"
                >
                  <Text style={styles.itemText} numberOfLines={1}>
                    {cat.emoji} {e.note || cat.label}
                  </Text>
                  <Text style={styles.itemAmount}>{formatMoney(e.amountCents, currency)}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  date: { fontSize: 15, fontWeight: '700', color: theme.text },
  empty: { marginTop: 8, fontSize: 14, color: theme.muted },
  total: { marginTop: 6, fontSize: 24, fontWeight: '800', color: theme.text },
  count: { fontSize: 14, fontWeight: '400', color: theme.muted },
  list: { marginTop: 16, borderTopWidth: 1, borderTopColor: theme.border },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  itemText: { flex: 1, fontSize: 14, color: theme.text, marginRight: 8 },
  itemAmount: { fontSize: 14, fontWeight: '600', color: theme.text },
});
