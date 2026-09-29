// Connects the SMS message reader to the app: permissions, adding expenses, catching up.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';

import SmsListener, { InboxSms } from '../../modules/sms-listener';
import { formatMoney, toISODate } from '../format';
import { notifyExpenseAdded } from '../notifications';
import { loadData, mutateExpenses, newId } from '../storage';
import { Expense } from '../types';
import { refreshWidgets } from '../widget';
import { parseDebitSms, smsKey } from './parser';

/** Only the installed Android app (APK) contains the native SMS module. */
export const smsSupported = Platform.OS === 'android' && SmsListener !== null;

const PROCESSED_KEY = 'sms:processed:v1';
const LAST_SYNC_KEY = 'sms:lastSync:v1';
const MAX_REMEMBERED = 500;

export type SmsPermission = 'granted' | 'denied' | 'blocked';

// PermissionsAndroid is undefined on web/iOS, so only touch it once we know we're on Android.
function smsPermissions() {
  return [PermissionsAndroid.PERMISSIONS.RECEIVE_SMS, PermissionsAndroid.PERMISSIONS.READ_SMS];
}

export async function hasSmsPermission(): Promise<boolean> {
  if (!smsSupported) return false;
  const results = await Promise.all(smsPermissions().map((p) => PermissionsAndroid.check(p)));
  return results.every(Boolean);
}

export async function requestSmsPermission(): Promise<SmsPermission> {
  if (!smsSupported) return 'denied';
  const results = Object.values(await PermissionsAndroid.requestMultiple(smsPermissions()));
  if (results.every((r) => r === PermissionsAndroid.RESULTS.GRANTED)) return 'granted';
  if (results.some((r) => r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) return 'blocked';
  return 'denied';
}

/** Tells the native receiver whether to forward payment SMS at all. */
export function setSmsListening(enabled: boolean) {
  SmsListener?.setEnabled(enabled);
}

// Background SMS events and the on-open catch-up can overlap; run them one at a time so the
// same message can't be added twice.
let queue: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => {});
  return run;
}

async function loadProcessed(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(PROCESSED_KEY);
  return raw ? JSON.parse(raw) : [];
}

/**
 * Parses messages and adds the debits as expenses. Messages from before SMS auto-add was
 * turned on, or already handled (even if that expense was later deleted), are skipped.
 */
export function ingestSms(messages: InboxSms[]): Promise<Expense[]> {
  return oneAtATime(async () => {
    const { settings, expenses } = await loadData();
    if (!settings.smsEnabled) return [];

    const processed = await loadProcessed();
    const seen = new Set([...processed, ...expenses.map((e) => e.smsKey).filter(Boolean)]);
    const added: Expense[] = [];

    for (const msg of messages) {
      if (msg.timestamp < settings.smsEnabledAt) continue;
      const key = smsKey(msg.body);
      if (seen.has(key)) continue;
      const parsed = parseDebitSms(msg.address, msg.body);
      if (!parsed) continue;
      seen.add(key);
      processed.push(key);
      added.push({
        id: newId(),
        amountCents: parsed.amountCents,
        category: parsed.category,
        date: toISODate(new Date(msg.timestamp)),
        note: parsed.merchant ?? (parsed.account ? `Payment from ••${parsed.account}` : 'Bank payment'),
        createdAt: msg.timestamp,
        source: 'sms',
        smsKey: key,
      });
    }

    if (added.length === 0) return [];
    await AsyncStorage.setItem(PROCESSED_KEY, JSON.stringify(processed.slice(-MAX_REMEMBERED)));
    const all = await mutateExpenses((prev) => [...added, ...prev]);
    refreshWidgets(all, settings.currency);
    return added;
  });
}

/**
 * Background task started by the native receiver when a payment SMS arrives.
 * Registered in index.ts as "SmsDebitTask".
 */
export async function handleIncomingSms(message: InboxSms): Promise<void> {
  const added = await ingestSms([message]);
  const { settings } = await loadData();
  for (const e of added) {
    await notifyExpenseAdded(`Added ${formatMoney(e.amountCents, settings.currency)} · ${e.note}`, 'From your bank SMS. Tap to review.').catch(
      () => {},
    );
  }
}

/** On app open: pick up payment SMS the receiver missed (e.g. the app had been force-stopped). */
export async function catchUpFromInbox(): Promise<number> {
  if (!smsSupported || !SmsListener) return 0;
  const { settings } = await loadData();
  if (!settings.smsEnabled || !(await hasSmsPermission())) return 0;

  const lastSync = Number((await AsyncStorage.getItem(LAST_SYNC_KEY)) ?? 0);
  // Re-read a little overlap; already-added messages are skipped by their key.
  const since = Math.max(settings.smsEnabledAt, lastSync - 6 * 60 * 60 * 1000);
  const startedAt = Date.now();
  const messages = await SmsListener.readInboxSince(since, 200);
  const added = await ingestSms(messages);
  await AsyncStorage.setItem(LAST_SYNC_KEY, String(startedAt));
  return added.length;
}
