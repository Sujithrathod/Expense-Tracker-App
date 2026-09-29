import { Text, View } from 'react-native';

import { getCategory } from '../categories';
import { Currency, formatMoney } from '../format';
import { makeStyles, useTheme } from '../theme';
import { CategoryId } from '../types';

type Props = { rows: [CategoryId, number][]; total: number; currency: Currency };

/** Per-category bars with amount and share of the total. */
export function CategoryBreakdown({ rows, total, currency }: Props) {
  const styles = useStyles();
  if (rows.length === 0) return null;
  return (
    <View style={styles.breakdown}>
      {rows.map(([id, cents]) => {
        const cat = getCategory(id);
        const pct = total > 0 ? cents / total : 0;
        return (
          <View key={id}>
            <View style={styles.rowTop}>
              <Text style={styles.rowLabel}>
                {cat.emoji} {cat.label}
              </Text>
              <Text style={styles.rowValue}>
                {formatMoney(cents, currency)}{' '}
                <Text style={styles.rowPct}>{Math.round(pct * 100)}%</Text>
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.bar,
                  { width: `${Math.max(pct * 100, 2)}%`, backgroundColor: cat.color },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  breakdown: { marginTop: 16, gap: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowLabel: { fontSize: 14, color: theme.text },
  rowValue: { fontSize: 14, color: theme.text, fontWeight: '600' },
  rowPct: { color: theme.muted, fontWeight: '400' },
  track: { height: 8, borderRadius: 4, backgroundColor: theme.border, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
}));
