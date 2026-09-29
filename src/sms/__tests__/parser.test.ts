/// <reference types="jest" />
import { guessCategory, parseDebitSms, smsKey } from '../parser';

describe('parseDebitSms: payments that should be added', () => {
  it.each([
    [
      'HDFC UPI',
      'VM-HDFCBK',
      'Sent Rs.250.00\nFrom HDFC Bank A/C *1234\nTo SWIGGY\nOn 12/09/26\nRef 425612345678\nNot You?\nCall 18002586161/SMS BLOCK UPI to 7308080808',
      { amountCents: 25000, merchant: 'Swiggy', category: 'food', account: '1234' },
    ],
    [
      'HDFC credit card',
      'AD-HDFCBK',
      'Spent Rs.1,299.00 On HDFC Bank Card 5678 At AMAZON PAY INDIA On 2026-09-12:10:22:33.Not You? To Block+Reissue Call 18002586161/SMS BLOCK CC 5678 to 7308080808',
      { amountCents: 129900, merchant: 'Amazon Pay India', category: 'shopping', account: '5678' },
    ],
    [
      'SBI UPI (no currency symbol)',
      'JD-SBIUPI',
      'Dear UPI user A/C X1234 debited by 150.0 on date 12Sep26 trf to UBER INDIA Refno 425678901234. If not u? call 1800111109. -SBI',
      { amountCents: 15000, merchant: 'Uber India', category: 'transport', account: '1234' },
    ],
    [
      'ICICI UPI',
      'VK-ICICIB',
      'ICICI Bank Acct XX123 debited for Rs 450.00 on 12-Sep-26; ZOMATO credited. UPI:425612345678. Call 18002662 for dispute. SMS BLOCK 123 to 9215676766.',
      { amountCents: 45000, merchant: 'Zomato', category: 'food', account: '123' },
    ],
    [
      'Axis UPI to a person',
      'AX-AXISBK',
      'INR 2,000.00 debited\nA/c no. XX4567\n12-09-26, 18:20:11\nUPI/P2A/425612345678/RAHUL KUMAR\nNot you? SMS BLOCKUPI Cust ID to 919951860002\nAxis Bank',
      { amountCents: 200000, merchant: 'Rahul Kumar', category: 'other', account: '4567' },
    ],
    [
      'Kotak UPI to a UPI ID',
      'BP-KOTAKB',
      'Sent Rs.99.00 from Kotak Bank AC X9876 to netflix@hdfcbank on 12-09-26.UPI Ref 425612345678. Not you, https://kotak.com/KBANKT/Fraud',
      { amountCents: 9900, merchant: 'Netflix', category: 'entertainment', account: '9876' },
    ],
    [
      'ATM withdrawal ignores the balance amount',
      'VM-SBIINB',
      'Rs.5000 withdrawn from A/c XX1234 at ATM on 12-Sep. Avl Bal Rs.12,345.00',
      { amountCents: 500000, merchant: 'ATM', category: 'other', account: '1234' },
    ],
    [
      'Rupee symbol with available limit',
      'JM-SBICRD',
      '₹ 1,250.50 spent on your SBI Credit Card ending 4321 at BIGBASKET on 12/09/26. Avl Lmt ₹ 45,000',
      { amountCents: 125050, merchant: 'Bigbasket', category: 'food', account: '4321' },
    ],
    [
      'Autopay towards a bill',
      'VM-HDFCBK',
      'Your A/c XX1234 debited INR 649.00 towards Airtel Postpaid on 12-Sep-26 via NACH',
      { amountCents: 64900, merchant: 'Airtel Postpaid', category: 'bills', account: '1234' },
    ],
  ])('%s', (_label, sender, body, expected) => {
    expect(parseDebitSms(sender, body)).toEqual(expected);
  });
});

describe('parseDebitSms: messages that must be ignored', () => {
  it.each([
    ['money received', 'VM-HDFCBK', 'Rs.10,000.00 credited to your A/c XX1234 on 12-Sep by NEFT. Avl Bal Rs 22,345'],
    ['OTP', 'VM-HDFCBK', 'OTP for txn of Rs 500.00 at AMAZON on card XX1234 is 123456. Do not share.'],
    ['card statement / amount due', 'VM-HDFCBK', 'Your HDFC Bank Credit Card XX1234 statement: Total Amt Due Rs 5,432; Min Amt Due Rs 272; Due date 20-Sep'],
    ['failed payment', 'VM-HDFCBK', 'Txn of Rs 300.00 on card XX1234 at SWIGGY failed due to insufficient balance'],
    ['UPI collect request', 'VM-ICICIB', 'Rs 500 requested by abc@ybl from your A/c XX1234. Pay via UPI app'],
    ['refund', 'VM-HDFCBK', 'Refund of Rs 250 processed to your A/c XX1234'],
    ['future auto-debit', 'VM-HDFCBK', 'Rs 649 will be debited from your A/c XX1234 on 15-Sep towards Airtel'],
    ['personal message from a phone number', '+919876543210', 'I paid Rs 500 for dinner from my account, send me your share'],
    ['merchant message with no account', 'VM-SWIGGY', 'Your order is confirmed! You paid Rs 250 via UPI.'],
    ['no amount', 'VM-HDFCBK', 'Your A/c XX1234 was debited. Call us if this was not you.'],
  ])('%s', (_label, sender, body) => {
    expect(parseDebitSms(sender, body)).toBeNull();
  });
});

describe('guessCategory', () => {
  it('does not match keywords inside other words', () => {
    // "available" contains "lab", "current" contains "rent"
    expect(guessCategory('Avl balance available in current account')).toBe('other');
  });

  it.each([
    ['Swiggy Instamart', 'food'],
    ['Rapido', 'transport'],
    ['Myntra', 'shopping'],
    ['BESCOM Electricity', 'bills'],
    ['Apollo Pharmacy', 'health'],
    ['BookMyShow', 'entertainment'],
  ] as const)('%s → %s', (merchant, category) => {
    expect(guessCategory(merchant)).toBe(category);
  });
});

describe('smsKey', () => {
  it('is the same for the same message regardless of whitespace', () => {
    expect(smsKey('Sent Rs.250\nTo SWIGGY')).toBe(smsKey('Sent Rs.250 To SWIGGY'));
  });

  it('differs for different messages', () => {
    expect(smsKey('Sent Rs.250 To SWIGGY')).not.toBe(smsKey('Sent Rs.251 To SWIGGY'));
  });
});
