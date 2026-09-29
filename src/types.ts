export type CategoryId =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'bills'
  | 'health'
  | 'entertainment'
  | 'other';

export type Expense = {
  id: string;
  /** Stored in the smallest unit (paise/cents) to avoid floating-point drift. */
  amountCents: number;
  category: CategoryId;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  note: string;
  createdAt: number;
  /** Set when the expense was added automatically from a bank SMS. */
  source?: 'sms';
  /** Identifies the SMS it came from, so the same message is never added twice. */
  smsKey?: string;
};

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'source' | 'smsKey'>;
