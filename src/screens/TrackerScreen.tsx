import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarChart } from '../components/BarChart';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { DayDetail } from '../components/DayDetail';
import { Heatmap } from '../components/Heatmap';
import { Currency, formatMoney, longDate, toISODate } from '../format';
import {
  PERIODS,
  Period,
  dailyTotals,
  periodBuckets,
  periodRange,
  periodStats,
} from '../stats';
import { HEAT_COLORS, HEAT_PALETTES, HeatColor, theme } from '../theme';
import { Expense } from '../types';

type Props = {
  expenses: Expense[];
  currency: Currency;
  heatColor: HeatColor;
  onHeatColorChange: (c: HeatColor) => void;
  onEdit: (expense: Expense) => void;
  bottomInset: number;
};

const PREVIOUS_LABEL: Record<Period, string> = {
  week: 'last week',
  month: 'last month',
  quarter: 'last quarter',
  year: 'last year',
};

export function TrackerScreen({
  expenses,
  currency,
  heatColor,
  onHeatColorChange,
  onEdit,
  bottomInset,
}: Props) {
  const [period, setPeriod] = useState<Period>('month');
  const [offset, setOffset] = useState(0);
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState(() => toISODate(new Date()));

  const daily = useMemo(() => dailyTotals(expenses), [expenses]);
  const range = useMemo(() => periodRange(period, offset), [period, offset]);
  const stats = useMemo(
    () => periodStats(expenses, daily, period, offset),
    [expenses, daily, period, offset],
  );
  const bars = useMemo(() => periodBuckets(period, range, daily), [period, range, daily]);
  const dayExpenses = useMemo(
    () => expenses.filter((e) => e.date === selectedDay),
    [expenses, selectedDay],
  );
  const palette = HEAT_PALETTES[heatColor];

  function changePeriod(p: Period) {
    setPeriod(p);
    setOffset(0);
    setSelectedBar(null);
  }

  function shift(delta: number) {
    setOffset((o) => Math.min(0, o + delta));
    setSelectedBar(null);
  }

  function selectBar(i: number) {
    setSelectedBar(i === selectedBar ? null : i);
    // Week and month bars are single days, so tapping one also opens that day's breakdown.
    if (period === 'week' || period === 'month') setSelectedDay(toISODate(bars[i].start));
  }

  const change = stats.change;
  const changeUp = change !== null && change > 0;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 100 }}>
      <View style={styles.segments}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => changePeriod(p.id)}
            style={[styles.segment, period === p.id && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: period === p.id }}
          >
            <Text style={[styles.segmentText, period === p.id && styles.segmentTextActive]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.periodRow}>
        <Pressable onPress={() => shift(-1)} hitSlop={12} accessibilityLabel="Previous period">
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <Text style={styles.periodLabel}>{range.label}</Text>
        <Pressable
          onPress={() => shift(1)}
          hitSlop={12}
          disabled={offset === 0}
          accessibilityLabel="Next period"
        >
          <Text style={[styles.arrow, offset === 0 && styles.disabled]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.caption}>Total spent</Text>
        <Text style={styles.total}>{formatMoney(stats.total, currency)}</Text>
        {change !== null ? (
          <Text style={[styles.change, { color: changeUp ? theme.danger : theme.success }]}>
            {changeUp ? '▲' : '▼'} {Math.abs(Math.round(change * 100))}% vs{' '}
            {stats.comparedToDate ? 'same point ' : ''}
            {PREVIOUS_LABEL[period]}
            <Text style={styles.changeMuted}> ({formatMoney(stats.previousTotal, currency)})</Text>
          </Text>
        ) : (
          <Text style={styles.changeMuted}>Nothing to compare with {PREVIOUS_LABEL[period]}</Text>
        )}

        <View style={styles.statRow}>
          <Stat label="Daily avg" value={formatMoney(stats.dailyAverage, currency)} />
          <Stat label="Expenses" value={String(stats.count)} />
          <Stat
            label="Biggest day"
            value={stats.highestDay ? formatMoney(stats.highestDay.cents, currency) : '—'}
            onPress={
              stats.highestDay ? () => setSelectedDay(stats.highestDay!.date) : undefined
            }
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {period === 'week' || period === 'month'
            ? 'Spending by day'
            : period === 'quarter'
              ? 'Spending by week'
              : 'Spending by month'}
        </Text>
        <BarChart
          bars={bars}
          currency={currency}
          color={theme.primary}
          selectedIndex={selectedBar}
          onSelect={selectBar}
        />
      </View>

      {stats.categories.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Where it went</Text>
          <CategoryBreakdown rows={stats.categories} total={stats.total} currency={currency} />
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Daily spending · last 12 months</Text>
          <View style={styles.swatches}>
            {HEAT_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => onHeatColorChange(c)}
                hitSlop={6}
                accessibilityLabel={`${c} colour`}
                accessibilityState={{ selected: c === heatColor }}
                style={[
                  styles.swatch,
                  { backgroundColor: HEAT_PALETTES[c][3] },
                  c === heatColor && styles.swatchActive,
                ]}
              />
            ))}
          </View>
        </View>
        <Text style={styles.hint}>Tap a square to see that day’s spending</Text>
        <Heatmap daily={daily} palette={palette} selected={selectedDay} onSelect={setSelectedDay} />
      </View>

      <View style={styles.card} accessibilityLabel={`Details for ${longDate(selectedDay)}`}>
        <DayDetail
          date={selectedDay}
          expenses={dayExpenses}
          currency={currency}
          onEdit={onEdit}
        />
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.stat} onPress={onPress} disabled={!onPress}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segments: {
    flexDirection: 'row',
    backgroundColor: theme.border,
    borderRadius: 12,
    padding: 3,
  },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  segmentActive: { backgroundColor: theme.card },
  segmentText: { fontSize: 14, color: theme.muted, fontWeight: '600' },
  segmentTextActive: { color: theme.text },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  arrow: { fontSize: 30, color: theme.primary, paddingHorizontal: 8 },
  disabled: { opacity: 0.25 },
  periodLabel: { fontSize: 16, fontWeight: '600', color: theme.text, textAlign: 'center', flex: 1 },
  card: { backgroundColor: theme.card, borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 8 },
  caption: { fontSize: 13, color: theme.muted, fontWeight: '600' },
  total: { fontSize: 32, fontWeight: '800', color: theme.text, marginTop: 4 },
  change: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  changeMuted: { fontSize: 13, color: theme.muted, fontWeight: '400', marginTop: 4 },
  statRow: {
    flexDirection: 'row',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 12,
  },
  stat: { flex: 1 },
  statLabel: { fontSize: 12, color: theme.muted },
  statValue: { fontSize: 15, fontWeight: '700', color: theme.text, marginTop: 2 },
  hint: { fontSize: 12, color: theme.muted, marginBottom: 10 },
  swatches: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  swatch: { width: 16, height: 16, borderRadius: 8 },
  swatchActive: { borderWidth: 2, borderColor: theme.text },
});
