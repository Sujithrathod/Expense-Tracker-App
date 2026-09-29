import { registerRootComponent } from 'expo';
import { AppRegistry, Platform } from 'react-native';

import App from './App';
import { handleIncomingSms } from './src/sms';
import { registerWidgets } from './src/widget';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
registerWidgets();
// Started by the native SMS receiver (modules/sms-listener) when a payment SMS arrives.
// Headless tasks only exist on Android (registerHeadlessTask is missing on web).
if (Platform.OS === 'android') {
  AppRegistry.registerHeadlessTask('SmsDebitTask', () => handleIncomingSms);
}
