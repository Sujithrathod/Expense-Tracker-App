// Turns a bank / UPI "debited" SMS into an expense. Pure functions, no React Native imports,
// so they can be unit-tested and used from the background SMS task.
import { CategoryId } from '../types';

export type ParsedDebit = {
  amountCents: number;
  /** e.g. "Swiggy", "Amazon Pay India"; null when the message doesn't name one. */
  merchant: string | null;
  category: CategoryId;
  /** Last digits of the account/card, e.g. "1234". */
  account: string | null;
};

// Messages that mention money but aren't a completed spend.
const REJECT = [
  /\b(otp|one[\s-]?time[\s-]?password|verification code)\b/i,
  /\b(failed|declined|unsuccessful|reversed|reversal|refund(?:ed)?|cancelled)\b/i,
  /\b(will be debited|to be debited|is due|amt due|amount due|due date|min(?:imum)? (?:amt|amount)|statement|reminder)\b/i,
  /\b(requested|collect request|has requested)\b/i,
];

const DEBIT =
  /\b(debited|debit|spent|paid|sent|withdrawn|withdrawal|purchase[d]?|charged|deducted|txn of|transaction of|payment of)\b/i;

// Bank messages always identify an account or card; merchant "order paid" SMS usually don't.
const ACCOUNT_REF = /\b(a\/c|a\/c\.|ac|acct|account|card)\b/i;
const BANK_SENDER =
  /(hdfc|sbi|icici|axis|kotak|pnb|bob|boi|canara|canbnk|union|idfc|yes|indus|federal|fedbnk|scb|citi|aubank|idbi|paytm|airbnk|jiopbk|kvb|rbl|dbs|hsbc|amex|bank|bnk|bk)/i;

const CURRENCY_AMOUNT = /(?:rs\.?|inr|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi;
// SBI UPI style: "debited by 150.0" with no currency symbol.
const BARE_DEBIT_AMOUNT = /debited\s+(?:by|for|with)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i;
const BALANCE_BEFORE = /(bal|balance|limit|lmt|avl|avbl|available|outstanding)[^0-9]{0,12}$/i;

const ACCOUNT_DIGITS =
  /\b(?:a\/c|ac|acct|account|card)\b[^0-9]{0,20}?(?:no\.?\s*)?(?:ending\s*(?:with\s*)?)?[x*]*(\d{3,6})\b/i;

// Words that end a merchant name in a sentence like "at SWIGGY on 12-09-26".
const STOP = String.raw`(?=\s+(?:on|via|using|with|ref|refno|ref no|txn|upi|avl|avbl|dated|from|not|if|call|sms|info|for)\b|[.,;:(]|\s*$)`;
const MERCHANT_PATTERNS: RegExp[] = [
  // ICICI: "...on 12-Sep-26; ZOMATO credited."
  /;\s*([A-Za-z][A-Za-z0-9 &.'_-]{1,40}?)\s+credited\b/i,
  // UPI info blocks: "UPI/P2M/425612345678/SWIGGY" or "UPI-123456-Merchant Name"
  /\bUPI[/-](?:P2[AM][/-])?\d{6,}[/-]([A-Za-z][A-Za-z0-9 .&'_-]{1,40}?)(?=\s+(?:not|if|call|sms|avl)\b|[/.,;]|\s*$)/i,
  new RegExp(String.raw`\bat\s+([A-Za-z0-9][A-Za-z0-9 &.'_*-]{1,40}?)` + STOP, 'i'),
  new RegExp(String.raw`\b(?:to|towards|trf to)\s+(?:vpa\s+)?([A-Za-z0-9][A-Za-z0-9 &.'@_-]{1,50}?)` + STOP, 'i'),
];

const NOT_A_MERCHANT = /^(your|you|a\/c|ac|acct|account|card|bank|beneficiary|x+\d*|\d+|self)\b/i;

const CATEGORY_KEYWORDS: [CategoryId, RegExp][] = [
  ['food', /swiggy|zomato|restaurant|\bcafe\b|café|domino|mcdonald|\bkfc\b|pizza|burger|starbucks|chaayos|zepto|blinkit|instamart|bigbasket|dmart|grofers|dunzo|bakery|eatclub|\bfoods?\b/i],
  ['transport', /\buber\b|\bola\b|olacabs|rapido|irctc|\bmetro\b|\bfuel\b|petrol|diesel|\bhpcl\b|\bbpcl\b|\biocl\b|indian oil|fastag|redbus|makemytrip|goibibo|indigo|air india|akasa|cleartrip|parking|\btoll\b/i],
  ['shopping', /amazon|flipkart|myntra|ajio|meesho|nykaa|tata cliq|croma|reliance digital|decathlon|ikea|lenskart|snapdeal/i],
  ['bills', /electric|bescom|tneb|msedcl|recharge|airtel|\bjio\b|vodafone|\bvi\b|bsnl|broadband|act fibernet|\bgas\b|\bwater\b|insurance|\blic\b|\bemi\b|\brent\b|\bdth\b|tata play|postpaid|prepaid|\bnach\b|autopay|\bbills?\b/i],
  ['health', /pharma|apollo|medplus|hospital|clinic|\b1mg\b|pharmeasy|netmeds|diagnostic|\blabs?\b|practo|cult\.?fit|\bgym\b/i],
  ['entertainment', /netflix|hotstar|spotify|prime video|bookmyshow|\bpvr\b|inox|youtube|zee5|sonyliv|jiocinema|gaana|steam|playstation/i],
];

export function guessCategory(text: string): CategoryId {
  for (const [id, re] of CATEGORY_KEYWORDS) if (re.test(text)) return id;
  return 'other';
}

function parseAmount(raw: string): number | null {
  const cents = Math.round(parseFloat(raw.replace(/,/g, '')) * 100);
  return Number.isFinite(cents) && cents > 0 ? cents : null;
}

function findAmount(body: string): number | null {
  for (const m of body.matchAll(CURRENCY_AMOUNT)) {
    const before = body.slice(Math.max(0, (m.index ?? 0) - 25), m.index);
    if (BALANCE_BEFORE.test(before)) continue; // skip "Avl Bal Rs 12,345"
    const cents = parseAmount(m[1]);
    if (cents) return cents;
  }
  const bare = body.match(BARE_DEBIT_AMOUNT);
  return bare ? parseAmount(bare[1]) : null;
}

// Abbreviations that should stay in capitals when tidying "AMAZON PAY INDIA" → "Amazon Pay India".
const KEEP_UPPERCASE = new Set(['ATM', 'KFC', 'PVR', 'LIC', 'EMI', 'DTH', 'UPI', 'IRCTC', 'HPCL', 'BPCL', 'IOCL', 'BSNL', 'ACT', 'BESCOM', 'TNEB', 'NEFT', 'IMPS']);

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) =>
      KEEP_UPPERCASE.has(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join(' ');
}

function cleanMerchant(raw: string): string | null {
  let name = raw.trim();
  if (name.includes('@')) {
    // UPI ID like "swiggy.stores@axb" → "swiggy stores"
    name = name.split('@')[0].replace(/[._-]+/g, ' ').replace(/\d+/g, ' ');
  }
  name = name.replace(/[*_]+/g, ' ').replace(/\s+/g, ' ').replace(/[\s.'-]+$/, '').trim();
  if (name.length < 2 || NOT_A_MERCHANT.test(name) || !/[a-z]{2}/i.test(name)) return null;
  return titleCase(name).slice(0, 30);
}

function findMerchant(body: string): string | null {
  for (const re of MERCHANT_PATTERNS) {
    const m = body.match(re);
    const name = m ? cleanMerchant(m[1]) : null;
    if (name) return name;
  }
  return null;
}

/**
 * Returns the spend described by an SMS, or null if it isn't a completed debit from a bank.
 * `sender` is the SMS address (e.g. "VM-HDFCBK"); personal numbers are ignored.
 */
export function parseDebitSms(sender: string, rawBody: string): ParsedDebit | null {
  if (!/[a-z]/i.test(sender)) return null; // banks use alphanumeric sender IDs, people use numbers
  const body = rawBody.replace(/\s+/g, ' ').trim();
  if (!DEBIT.test(body)) return null;
  if (REJECT.some((re) => re.test(body))) return null;
  if (!ACCOUNT_REF.test(body) && !BANK_SENDER.test(sender)) return null;

  const amountCents = findAmount(body);
  if (!amountCents) return null;

  const merchant = findMerchant(body);
  // The merchant name is the best clue; fall back to the whole message (e.g. "towards NACH EMI").
  const byMerchant = merchant ? guessCategory(merchant) : 'other';
  return {
    amountCents,
    merchant,
    category: byMerchant !== 'other' ? byMerchant : guessCategory(body),
    account: body.match(ACCOUNT_DIGITS)?.[1]?.slice(-4) ?? null,
  };
}

/** Stable id for a message so the same SMS is never added twice. */
export function smsKey(body: string): string {
  const text = body.replace(/\s+/g, ' ').trim();
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return `sms_${(hash >>> 0).toString(36)}_${text.length}`;
}
