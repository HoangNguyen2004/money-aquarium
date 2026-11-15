import type { SavingGoal } from './types';
import { isValidISO } from './format';

export const contributed = (goal: SavingGoal) => goal.contributions.reduce((sum, entry) => sum + entry.amount, 0);
export const goalProgress = (goal: SavingGoal) => goal.target > 0 ? Math.min(1, contributed(goal) / goal.target) : 0;
export const goalStage = (goal: SavingGoal) => { const p = goalProgress(goal); return p >= 1 ? 3 : p >= 0.5 ? 2 : p >= 0.25 ? 1 : 0; };

/** Contributions are explicit user-confirmed transfers, never inferred from unspent budget. */
export function createGoal(id: string, name: string, target: number, fishId: string, deadline: string): SavingGoal | string {
  if (!name.trim()) return 'Hãy đặt tên cho mục tiêu.';
  if (!Number.isSafeInteger(target) || target <= 0) return 'Số tiền mục tiêu phải lớn hơn 0.';
  if (deadline && !isValidISO(deadline)) return 'Hạn hoàn thành cần có dạng YYYY-MM-DD.';
  return { id, name: name.trim().slice(0, 60), target, fishId, deadline, contributions: [] };
}

export function contribute(goal: SavingGoal, id: string, amount: number, date: string): SavingGoal | string {
  if (goal.contributions.some((entry) => entry.id === id)) return goal;
  if (!Number.isSafeInteger(amount) || amount <= 0 || !isValidISO(date)) return 'Khoản góp hoặc ngày ghi nhận không hợp lệ.';
  if (!Number.isSafeInteger(contributed(goal) + amount)) return 'Khoản góp vượt giới hạn số tiền hỗ trợ.';
  return { ...goal, contributions: [...goal.contributions, { id, amount, date }] };
}
