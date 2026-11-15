import { addDays, daysInMonth, monthKey } from '../format';
import { monthlyLimit, spent, type Ctx, type Game } from './rules';

export function waterStatus(ctx: Ctx, date: string) {
  const limit = monthlyLimit(ctx);
  const elapsed = Number(date.slice(-2));
  const days = daysInMonth(monthKey(date));
  const actual = spent(ctx, (day) => monthKey(day) === monthKey(date) && day <= date);
  const expected = limit * elapsed / days;
  const pace = expected > 0 ? actual / expected : 0;
  const state = limit <= 0 ? 'unset' : actual > limit ? 'over' : pace > 1.2 ? 'ahead' : 'steady';
  return { state, actual, limit, expected, pace, health: state === 'over' ? 0.65 : state === 'ahead' ? 0.82 : 1,
    label: state === 'unset' ? 'Chưa đặt ngân sách' : state === 'over' ? 'Cùng xem lại kế hoạch' : state === 'ahead' ? 'Chi nhanh hơn nhịp tháng' : 'Trong nhịp kế hoạch',
    hint: state === 'unset' ? 'Hồ vẫn khỏe. Đặt ngân sách khi bạn sẵn sàng.' : 'Ước tính theo ngày trong tháng; khoản cố định hoặc chi lớn theo kế hoạch có thể làm nhịp tăng tạm thời.' };
}

export function habitStreak(game: Game, ctx: Ctx, date: string) {
  const days = new Set([...game.reviewed, ...ctx.transactions.filter((t) => t.amount > 0).map((t) => t.date)].filter((d) => d >= game.startedAt && d <= date));
  let day = days.has(date) ? date : addDays(date, -1);
  let count = 0;
  while (days.has(day)) { count++; day = addDays(day, -1); }
  return count;
}
