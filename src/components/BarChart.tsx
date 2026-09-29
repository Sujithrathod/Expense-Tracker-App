import { Pressable, Text, View } from 'react-native';

import { Currency, formatMoney, formatMoneyCompact } from '../format';
import { Bucket } from '../stats';
import { makeStyles, useTheme } from '../theme';

type Props = {
  bars: Bucket[];
  currency: Currency;
  color: string;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
};

const CHART_HEIGHT = 130;

export function BarChart({ bars, currency, color, selectedIndex, onSelect }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const max = Math.max(0, ...bars.map((b) => b.value));
  const gap = bars.length > 20 ? 1 : bars.length > 10 ? 3 : 6;
  const selected = selectedIndex !== null ? bars[selectedIndex] : null;

  return (
    <View>
      <View style={styles.tooltipRow}>
        {selected ? (
          <Text style={styles.tooltip}>
            {selected.tooltip} ·{' '}
            <Text style={styles.tooltipValue}>{formatMoney(selected.value, currency)}</Text>
          </Text>
        ) : (
          <Text style={styles.hint}>Tap a bar to see the amount</Text>
        )}
        {max > 0 && <Text style={styles.max}>max {formatMoneyCompact(max, currency)}</Text>}
      </View>

      <View style={[styles.plot, { height: CHART_HEIGHT }]}>
        {bars.map((b, i) => {
          const h = max > 0 ? (b.value / max) * CHART_HEIGHT : 0;
          const isSelected = i === selectedIndex;
          return (
            <Pressable
              key={i}
              onPress={() => onSelect(i)}
              style={[styles.barSlot, { marginHorizontal: gap / 2 }]}
              accessibilityRole="button"
              accessibilityLabel={`${b.tooltip}: ${formatMoney(b.value, currency)}`}
            >
              <View
                style={[
                  styles.bar,
                  {
                    height: b.value > 0 ? Math.max(h, 3) : 2,
                    backgroundColor: b.value > 0 ? color : theme.border,
                    opacity: selectedIndex === null || isSelected ? 1 : 0.4,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Labels are centred under their bar but may be wider than it, so place them absolutely. */}
      <View style={styles.labels}>
        {bars.map((b, i) =>
          b.label === '' ? null : (
            <Text
              key={i}
              style={[
                styles.label,
                { left: `${((i + 0.5) / bars.length) * 100}%` },
                i === selectedIndex && styles.labelSelected,
              ]}
            >
              {b.label}
            </Text>
          ),
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  tooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 20,
  },
  tooltip: { fontSize: 14, color: theme.text },
  tooltipValue: { fontWeight: '700' },
  hint: { fontSize: 13, color: theme.muted },
  max: { fontSize: 12, color: theme.muted },
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  labels: { marginTop: 6, height: 14 },
  label: {
    position: 'absolute',
    width: 32,
    marginLeft: -16,
    textAlign: 'center',
    fontSize: 10,
    color: theme.muted,
  },
  labelSelected: { color: theme.text, fontWeight: '700' },
}));
