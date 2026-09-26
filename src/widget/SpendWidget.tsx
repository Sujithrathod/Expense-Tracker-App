'use no memo';
// Home-screen widget layout. Widgets may only use react-native-android-widget primitives
// (no hooks, no View/Text), and this file must only be loaded where that native module exists.
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { Currency, formatMoney, formatMoneyCompact } from '../format';
import { WidgetSummary } from '../stats';

export const ADD_EXPENSE_URI = 'expensetracker://add';

type Props = { summary: WidgetSummary; currency: Currency; dark?: boolean };

const LIGHT = { bg: '#FFFFFF', text: '#111827', muted: '#6B7280', track: '#E5E7EB' } as const;
const DARK = { bg: '#1F2937', text: '#F9FAFB', muted: '#9CA3AF', track: '#374151' } as const;
const ACCENT = '#4F46E5';
const BAR_MAX = 34;

export function SpendWidget({ summary, currency, dark = false }: Props) {
  const c = dark ? DARK : LIGHT;
  const max = Math.max(0, ...summary.last7.map((d) => d.value));

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`Spent today ${formatMoney(summary.today, currency)}`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: c.bg,
        borderRadius: 20,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text="Spent today" style={{ fontSize: 12, color: c.muted }} />
          <TextWidget
            text={formatMoney(summary.today, currency)}
            style={{ fontSize: 24, fontWeight: '700', color: c.text }}
          />
        </FlexWidget>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: ADD_EXPENSE_URI }}
          accessibilityLabel="Add expense"
          style={{
            backgroundColor: ACCENT,
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <TextWidget text="+ Add" style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }} />
        </FlexWidget>
      </FlexWidget>

      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text={`Week  ${formatMoneyCompact(summary.week, currency)}`}
            style={{ fontSize: 13, color: c.text, fontWeight: '600' }}
          />
          <TextWidget
            text={`Month  ${formatMoneyCompact(summary.month, currency)}`}
            style={{ fontSize: 13, color: c.text, fontWeight: '600' }}
          />
        </FlexWidget>

        <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', flexGap: 4 }}>
          {summary.last7.map((d, i) => (
            <FlexWidget key={i} style={{ flexDirection: 'column', alignItems: 'center' }}>
              <FlexWidget
                style={{
                  width: 10,
                  height: d.value > 0 && max > 0 ? Math.max(4, Math.round((d.value / max) * BAR_MAX)) : 3,
                  borderRadius: 3,
                  backgroundColor: d.value > 0 ? ACCENT : c.track,
                }}
              />
              <TextWidget text={d.label} style={{ fontSize: 9, color: c.muted, marginTop: 2 }} />
            </FlexWidget>
          ))}
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
