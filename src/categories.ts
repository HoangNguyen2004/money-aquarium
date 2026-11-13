import type { TxType } from './types';

export interface Category {
  id: string;
  name: string;
  icon: string; // tên icon Ionicons
  color: string;
  type: TxType;
}

export const CATEGORIES: Category[] = [
  { id: 'food', name: 'Ăn uống', icon: 'restaurant', color: '#E07A3F', type: 'expense' },
  { id: 'transport', name: 'Di chuyển', icon: 'car', color: '#3B7DD8', type: 'expense' },
  { id: 'shopping', name: 'Mua sắm', icon: 'bag-handle', color: '#B8528F', type: 'expense' },
  { id: 'bills', name: 'Nhà & hóa đơn', icon: 'home', color: '#8A6A4F', type: 'expense' },
  { id: 'health', name: 'Sức khỏe', icon: 'medkit', color: '#D2504B', type: 'expense' },
  { id: 'fun', name: 'Giải trí', icon: 'game-controller', color: '#2E9C8F', type: 'expense' },
  { id: 'education', name: 'Học tập', icon: 'school', color: '#C79A1E', type: 'expense' },
  { id: 'other', name: 'Khác', icon: 'ellipsis-horizontal', color: '#7C8580', type: 'expense' },
  { id: 'salary', name: 'Lương', icon: 'cash', color: '#1F6B3A', type: 'income' },
  { id: 'bonus', name: 'Thưởng', icon: 'gift', color: '#4E9A51', type: 'income' },
  { id: 'other_income', name: 'Thu khác', icon: 'add-circle', color: '#5C8A7E', type: 'income' },
];

export const EXPENSE_CATS = CATEGORIES.filter((c) => c.type === 'expense');
export const INCOME_CATS = CATEGORIES.filter((c) => c.type === 'income');
export const EXPENSE_IDS = EXPENSE_CATS.map((c) => c.id);
export const ALL_IDS = CATEGORIES.map((c) => c.id);

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function cat(id: string): Category {
  return BY_ID.get(id) ?? BY_ID.get('other')!;
}

/** Ép danh mục về đúng loại giao dịch (vd AI trả "food" cho một khoản thu). */
export function normalizeCategory(id: string, type: TxType): string {
  const c = BY_ID.get(id);
  if (c && c.type === type) return c.id;
  return type === 'expense' ? 'other' : 'other_income';
}
