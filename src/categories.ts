import { CategoryId } from './types';

export type Category = { id: CategoryId; label: string; emoji: string; color: string };

export const CATEGORIES: Category[] = [
  { id: 'food', label: 'Food', emoji: '🍔', color: '#F59E0B' },
  { id: 'transport', label: 'Travel', emoji: '🚕', color: '#3B82F6' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', color: '#EC4899' },
  { id: 'bills', label: 'Bills', emoji: '💡', color: '#8B5CF6' },
  { id: 'health', label: 'Health', emoji: '💊', color: '#10B981' },
  { id: 'entertainment', label: 'Fun', emoji: '🎬', color: '#EF4444' },
  { id: 'other', label: 'Other', emoji: '📦', color: '#6B7280' },
];

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
