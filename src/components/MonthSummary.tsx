import { StyleSheet, Text, View } from 'react-native';

import { Currency, formatMoney } from '../format';
import { categoryTotals } from '../stats';
import { theme } from '../theme';
import { Expense } from '../types';
import { CategoryBreakdown } from './CategoryBreakdown';

type Props = { expenses: Expense[]; currency: Currency };

export function MonthSummary({ expenses, currency }: Props) {
  const total = expenses.reduce((sum, e) => sum + e.amountCents, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.caption}>Spent this month</Text>
      <Text style={styles.total}>{formatMoney(total, currency)}</Text>
      <Text style={styles.count}>
        {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
      </Text>
      <CategoryBreakdown rows={categoryTotals(expenses)} total={total} currency={currency} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  caption: { fontSize: 13, color: theme.muted, fontWeight: '600' },
  total: { fontSize: 34, fontWeight: '800', color: theme.text, marginTop: 4 },
  count: { fontSize: 13, color: theme.muted, marginTop: 2 },
});
