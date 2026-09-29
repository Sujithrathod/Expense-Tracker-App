import { useMemo, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { addDays, monthShort, parseISODate, startOfWeek, toISODate } from '../format';
import { DailyTotals, heatLevel, heatThresholds } from '../stats';
import { makeStyles, useTheme } from '../theme';

type Props = {
  daily: DailyTotals;
  palette: readonly string[];
  selected: string | null;
  onSelect: (iso: string) => void;
};

const CELL = 14;
const GAP = 3;
const STEP = CELL + GAP;
const WEEKS = 53;

/**
 * GitHub-contributions-style grid: one column per week (Mon at top), one square per day,
 * coloured by how much was spent. Covers the last 12 months and opens scrolled to today.
 */
export function Heatmap({ daily, palette, selected, onSelect }: Props) {
  const styles = useStyles();
  const scrollRef = useRef<ScrollView>(null);
  const todayISO = toISODate(new Date());

  const columns = useMemo(() => {
    const first = addDays(startOfWeek(parseISODate(todayISO)), -(WEEKS - 1) * 7);
    return Array.from({ length: WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => toISODate(addDays(first, w * 7 + d))),
    );
  }, [todayISO]);

  const thresholds = useMemo(
    () => heatThresholds(columns.flat().map((iso) => daily.get(iso) ?? 0)),
    [columns, daily],
  );

  const monthLabels = useMemo(() => {
    const labels: { col: number; text: string }[] = [];
    columns.forEach((col, i) => {
      const month = parseISODate(col[0]).getMonth();
      const prevMonth = i > 0 ? parseISODate(columns[i - 1][0]).getMonth() : -1;
      if (month !== prevMonth) labels.push({ col: i, text: monthShort(month) });
    });
    // Like GitHub, drop the leading partial month if it would collide with the next label.
    if (labels.length > 1 && labels[1].col - labels[0].col < 3) labels.shift();
    return labels;
  }, [columns]);

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.weekdays}>
          {['Mon', '', 'Wed', '', 'Fri', '', ''].map((d, i) => (
            <Text key={i} style={styles.weekday}>
              {d}
            </Text>
          ))}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <View>
            <View style={styles.months}>
              {monthLabels.map((m) => (
                <Text key={m.col} style={[styles.month, { left: m.col * STEP }]}>
                  {m.text}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {columns.map((col, w) => (
                <View key={w} style={styles.column}>
                  {col.map((iso) => {
                    if (iso > todayISO) return <View key={iso} style={styles.cellPlaceholder} />;
                    const value = daily.get(iso) ?? 0;
                    const isSelected = iso === selected;
                    return (
                      <Pressable
                        key={iso}
                        onPress={() => onSelect(iso)}
                        hitSlop={1}
                        accessibilityRole="button"
                        accessibilityLabel={iso}
                        style={[
                          styles.cell,
                          { backgroundColor: palette[heatLevel(value, thresholds)] },
                          isSelected && styles.cellSelected,
                          iso === todayISO && !isSelected && styles.cellToday,
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {palette.map((c) => (
          <View key={c} style={[styles.legendCell, { backgroundColor: c }]} />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  row: { flexDirection: 'row' },
  weekdays: { marginTop: 18, marginRight: 6 },
  weekday: { height: STEP, lineHeight: CELL, fontSize: 10, color: theme.muted },
  months: { height: 18 },
  month: { position: 'absolute', top: 0, fontSize: 11, color: theme.muted },
  grid: { flexDirection: 'row' },
  column: { marginRight: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3, marginBottom: GAP },
  cellPlaceholder: { width: CELL, height: CELL, marginBottom: GAP },
  cellSelected: { borderWidth: 2, borderColor: theme.text },
  cellToday: { borderWidth: 1, borderColor: theme.muted },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 8,
  },
  legendText: { fontSize: 11, color: theme.muted, marginHorizontal: 2 },
  legendCell: { width: 12, height: 12, borderRadius: 3 },
}));
