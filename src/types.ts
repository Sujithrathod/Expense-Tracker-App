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
};

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt'>;
