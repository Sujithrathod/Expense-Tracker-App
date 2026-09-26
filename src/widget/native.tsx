'use no memo';
// Only loaded (via require in ./index) on Android builds that include the widget native module.
import {
  registerWidgetTaskHandler,
  requestWidgetUpdate,
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget';

import { Currency } from '../format';
import { widgetSummary } from '../stats';
import { loadData } from '../storage';
import { Expense } from '../types';
import { SpendWidget } from './SpendWidget';

export const WIDGET_NAME = 'SpendSummary';

function renderSpendWidget(expenses: Expense[], currency: Currency) {
  const summary = widgetSummary(expenses);
  return {
    light: <SpendWidget summary={summary} currency={currency} />,
    dark: <SpendWidget summary={summary} currency={currency} dark />,
  };
}

async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const { expenses, settings } = await loadData();
      props.renderWidget(renderSpendWidget(expenses, settings.currency));
      break;
    }
    default:
      break;
  }
}

export function registerWidgets() {
  registerWidgetTaskHandler(widgetTaskHandler);
}

export function updateSpendWidgets(expenses: Expense[], currency: Currency) {
  return requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: () => renderSpendWidget(expenses, currency),
  });
}
