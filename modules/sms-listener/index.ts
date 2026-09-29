import { requireOptionalNativeModule } from 'expo';

export type InboxSms = { address: string; body: string; timestamp: number };

type SmsListenerNative = {
  /** Tells the native SMS receiver whether to forward payment messages to JS. */
  setEnabled(enabled: boolean): void;
  /** Inbox messages received after `sinceMs` (epoch ms), oldest first. Needs READ_SMS. */
  readInboxSince(sinceMs: number, limit: number): Promise<InboxSms[]>;
};

/** null in Expo Go and on web, where this native module isn't built in. */
export default requireOptionalNativeModule<SmsListenerNative>('SmsListener');
