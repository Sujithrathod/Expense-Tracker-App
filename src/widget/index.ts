import { Platform, TurboModuleRegistry } from 'react-native';

import { Currency } from '../format';
import { Expense } from '../types';

// react-native-android-widget throws on import when its native module is missing
// (Expo Go, web), so it is only required once we know the module is present.
export const widgetsSupported =
  Platform.OS === 'android' && TurboModuleRegistry.get('AndroidWidget') != null;

type NativeWidgets = typeof import('./native');

function nativeWidgets(): NativeWidgets | null {
  return widgetsSupported ? (require('./native') as NativeWidgets) : null;
}

/** Must run at app start-up so the widget's background task can render. */
export function registerWidgets() {
  nativeWidgets()?.registerWidgets();
}

/** Redraws any home-screen widgets with the latest totals. */
export function refreshWidgets(expenses: Expense[], currency: Currency) {
  nativeWidgets()
    ?.updateSpendWidgets(expenses, currency)
    .catch((e) => console.warn('Widget update failed', e));
}
