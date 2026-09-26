// Pure spending calculations shared by the Tracker screen and the Android widget.
// No React Native imports here so the widget's background task can use it too.
import {
  MONTHS,
  WEEKDAYS,
  addDays,
  monthShort,
  shortDate,
  startOfDay,
  startOfWeek,
  toISODate,
} from './format';
import { CategoryId, Expense } from './types';

export type Period = 'week' | 'month' | 'quarter' | 'year';

export const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
];

/** ISO date → total cents spent that day. */
export type DailyTotals = Map<string, number>;

export function dailyTotals(expenses: Expense[]): DailyTotals {
  const map: DailyTotals = new Map();
  for (const e of expenses) map.set(e.date, (map.get(e.date) ?? 0) + e.amountCents);
  return map;
}

export function sumBetween(daily: DailyTotals, start: Date, end: Date): number {
  let total = 0;
  for (let d = startOfDay(start); d <= end; d = addDays(d, 1)) {
    total += daily.get(toISODate(d)) ?? 0;
  }
  return total;
}

export function expensesBetween(expenses: Expense[], start: Date, end: Date): Expense[] {
  const from = toISODate(start);
  const to = toISODate(end);
  return expenses.filter((e) => e.date >= from && e.date <= to);
}

export function categoryTotals(expenses: Expense[]): [CategoryId, number][] {
  const map = new Map<CategoryId, number>();
  for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amountCents);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export type PeriodRange = { start: Date; end: Date; label: string };

/** offset 0 = the period containing today, -1 = the one before, etc. */
export function periodRange(period: Period, offset: number, today = new Date()): PeriodRange {
  const t = startOfDay(today);
  switch (period) {
    case 'week': {
      const start = addDays(startOfWeek(t), offset * 7);
      const end = addDays(start, 6);
      return { start, end, label: rangeLabel(start, end) };
    }
    case 'month': {
      const start = new Date(t.getFullYear(), t.getMonth() + offset, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      return { start, end, label: `${MONTHS[start.getMonth()]} ${start.getFullYear()}` };
    }
    case 'quarter': {
      const quarterStartMonth = Math.floor(t.getMonth() / 3) * 3;
      const start = new Date(t.getFullYear(), quarterStartMonth + offset * 3, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
      const q = start.getMonth() / 3 + 1;
      return {
        start,
        end,
        label: `Q${q} ${start.getFullYear()} · ${monthShort(start.getMonth())} – ${monthShort(end.getMonth())}`,
      };
    }
    case 'year': {
      const start = new Date(t.getFullYear() + offset, 0, 1);
      const end = new Date(start.getFullYear(), 11, 31);
      return { start, end, label: `${start.getFullYear()}` };
    }
  }
}

function rangeLabel(start: Date, end: Date): string {
  if (start.getFullYear() !== end.getFullYear()) {
    return `${shortDate(start)} ${start.getFullYear()} – ${shortDate(end)} ${end.getFullYear()}`;
  }
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${shortDate(end)} ${end.getFullYear()}`;
  }
  return `${shortDate(start)} – ${shortDate(end)} ${end.getFullYear()}`;
}

export type Bucket = {
  /** Short axis label; empty string hides it. */
  label: string;
  /** Full description shown when the bar is tapped. */
  tooltip: string;
  value: number;
  start: Date;
  end: Date;
};

/** Splits a period into chart bars: days for week/month, weeks for quarter, months for year. */
export function periodBuckets(period: Period, range: PeriodRange, daily: DailyTotals): Bucket[] {
  const buckets: Bucket[] = [];
  const { start, end } = range;

  if (period === 'week' || period === 'month') {
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const day = d.getDate();
      const label =
        period === 'week'
          ? WEEKDAYS[(d.getDay() + 6) % 7].slice(0, 1)
          : day === 1 || day % 5 === 0
            ? String(day)
            : '';
      buckets.push({
        label,
        tooltip: `${WEEKDAYS[(d.getDay() + 6) % 7].slice(0, 3)} ${shortDate(d)}`,
        value: daily.get(toISODate(d)) ?? 0,
        start: d,
        end: d,
      });
    }
    return buckets;
  }

  if (period === 'quarter') {
    let prevMonth = -1;
    for (let s = start; s <= end; s = addDays(s, 7)) {
      const e = addDays(s, 6) > end ? end : addDays(s, 6);
      const label = s.getMonth() !== prevMonth ? monthShort(s.getMonth()) : '';
      prevMonth = s.getMonth();
      buckets.push({
        label,
        tooltip: `${shortDate(s)} – ${shortDate(e)}`,
        value: sumBetween(daily, s, e),
        start: s,
        end: e,
      });
    }
    return buckets;
  }

  for (let m = 0; m < 12; m++) {
    const s = new Date(start.getFullYear(), m, 1);
    const e = new Date(start.getFullYear(), m + 1, 0);
    buckets.push({
      label: MONTHS[m].slice(0, 1),
      tooltip: `${MONTHS[m]} ${start.getFullYear()}`,
      value: sumBetween(daily, s, e),
      start: s,
      end: e,
    });
  }
  return buckets;
}

export type PeriodStats = {
  total: number;
  count: number;
  dailyAverage: number;
  previousTotal: number;
  /** True when previousTotal only covers the same number of days as elapsed so far. */
  comparedToDate: boolean;
  /** Fractional change vs previous period (0.12 = +12%); null when there's nothing to compare. */
  change: number | null;
  highestDay: { date: string; cents: number } | null;
  categories: [CategoryId, number][];
  expenses: Expense[];
};

export function periodStats(
  expenses: Expense[],
  daily: DailyTotals,
  period: Period,
  offset: number,
  today = new Date(),
): PeriodStats {
  const range = periodRange(period, offset, today);
  const inRange = expensesBetween(expenses, range.start, range.end);
  const total = inRange.reduce((s, e) => s + e.amountCents, 0);

  // Only count days that have happened so far, so a half-finished month isn't under-averaged.
  const t = startOfDay(today);
  const lastCounted = range.end < t ? range.end : t;
  const elapsedDays =
    lastCounted < range.start
      ? 0
      : Math.round((lastCounted.getTime() - range.start.getTime()) / 86_400_000) + 1;

  // For a period still in progress, compare with the same number of days of the previous one
  // (e.g. 1–26 Sep vs 1–26 Aug), otherwise a partial month always looks like a big drop.
  const inProgress = range.end >= t;
  const prev = periodRange(period, offset - 1, today);
  const prevSameDay = addDays(prev.start, Math.max(elapsedDays, 1) - 1);
  const prevEnd = inProgress && prevSameDay < prev.end ? prevSameDay : prev.end;
  const previousTotal = sumBetween(daily, prev.start, prevEnd);

  let highestDay: PeriodStats['highestDay'] = null;
  for (let d = range.start; d <= range.end; d = addDays(d, 1)) {
    const iso = toISODate(d);
    const cents = daily.get(iso) ?? 0;
    if (cents > 0 && (!highestDay || cents > highestDay.cents)) highestDay = { date: iso, cents };
  }

  return {
    total,
    count: inRange.length,
    dailyAverage: elapsedDays > 0 ? Math.round(total / elapsedDays) : 0,
    previousTotal,
    comparedToDate: inProgress,
    change: previousTotal > 0 ? (total - previousTotal) / previousTotal : null,
    highestDay,
    categories: categoryTotals(inRange),
    expenses: inRange,
  };
}

/** Quartile thresholds of non-zero values, used to pick heatmap colour levels like GitHub does. */
export function heatThresholds(values: number[]): [number, number, number] {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return [0, 0, 0];
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return [q(0.25), q(0.5), q(0.75)];
}

/** 0 = no spend, 1–4 = increasing intensity. */
export function heatLevel(value: number, [t1, t2, t3]: [number, number, number]): number {
  if (value <= 0) return 0;
  if (value <= t1) return 1;
  if (value <= t2) return 2;
  if (value <= t3) return 3;
  return 4;
}

export type WidgetSummary = {
  today: number;
  week: number;
  month: number;
  last7: { label: string; value: number }[];
};

export function widgetSummary(expenses: Expense[], now = new Date()): WidgetSummary {
  const daily = dailyTotals(expenses);
  const t = startOfDay(now);
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(t, -i);
    last7.push({ label: WEEKDAYS[(d.getDay() + 6) % 7].slice(0, 1), value: daily.get(toISODate(d)) ?? 0 });
  }
  return {
    today: daily.get(toISODate(t)) ?? 0,
    week: sumBetween(daily, startOfWeek(t), t),
    month: sumBetween(daily, new Date(t.getFullYear(), t.getMonth(), 1), t),
    last7,
  };
}
