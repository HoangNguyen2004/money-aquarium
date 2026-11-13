import type { Plan, Transaction } from './types';
import { cat, EXPENSE_CATS } from './categories';
import { addMonths, daysInMonth, fmt, fmtShort, monthKey, monthLabel, parseISO, today } from './format';

export interface CatStat {
  id: string;
  total: number;
  pct: number;
  count: number;
}

export interface Stats {
  income: number;
  expense: number;
  balance: number;
  count: number;
  byCategory: CatStat[]; // chỉ khoản chi, giảm dần
  byDay: number[]; // chi theo ngày, index 0 = ngày 1
  top: Transaction[];
}

export function inRange(txs: Transaction[], from: string, to: string): Transaction[] {
  return txs.filter((t) => t.date >= from && t.date <= to);
}

export function ofMonth(txs: Transaction[], month: string): Transaction[] {
  return txs.filter((t) => monthKey(t.date) === month);
}

export function computeStats(txs: Transaction[], days = 31): Stats {
  let income = 0;
  let expense = 0;
  const cats = new Map<string, { total: number; count: number }>();
  const byDay = new Array(days).fill(0);
  for (const t of txs) {
    if (t.type === 'income') {
      income += t.amount;
      continue;
    }
    expense += t.amount;
    const c = cats.get(t.category) ?? { total: 0, count: 0 };
    c.total += t.amount;
    c.count += 1;
    cats.set(t.category, c);
    const d = parseISO(t.date).getDate();
    if (d <= days) byDay[d - 1] += t.amount;
  }
  const byCategory = [...cats.entries()]
    .map(([id, v]) => ({ id, total: v.total, count: v.count, pct: expense ? v.total / expense : 0 }))
    .sort((a, b) => b.total - a.total);
  const top = txs
    .filter((t) => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  return { income, expense, balance: income - expense, count: txs.length, byCategory, byDay, top };
}

export function monthStats(txs: Transaction[], month: string): Stats {
  return computeStats(ofMonth(txs, month), daysInMonth(month));
}

/** Dự báo tổng chi cuối tháng theo tốc độ hiện tại (chỉ có nghĩa với tháng đang diễn ra). */
export function forecast(stats: Stats, month: string): number | null {
  const t = today();
  if (monthKey(t) !== month) return null;
  const day = parseISO(t).getDate();
  if (day < 3 || stats.expense === 0) return null;
  // Tiền nhà, điện nước... là khoản cố định trả một lần trong tháng nên không nhân theo ngày;
  // chỉ phần chi hằng ngày mới ngoại suy theo tốc độ hiện tại.
  const fixed = stats.byCategory.find((c) => c.id === 'bills')?.total ?? 0;
  const variable = stats.expense - fixed;
  return Math.round((fixed + (variable / day) * daysInMonth(month)) / 1000) * 1000;
}

export interface Insight {
  kind: 'good' | 'warn' | 'info';
  text: string;
}

export function buildInsights(
  txs: Transaction[],
  budgets: Record<string, number>,
  plan: Plan,
  month: string,
): Insight[] {
  const s = monthStats(txs, month);
  const out: Insight[] = [];
  if (s.count === 0) return [{ kind: 'info', text: 'Chưa có giao dịch nào trong tháng này.' }];

  const prev = monthStats(txs, addMonths(month, -1));
  if (prev.expense > 0 && s.expense > 0) {
    const isCurrent = monthKey(today()) === month;
    // Tháng đang chạy: so cùng số ngày đã qua để không lệch.
    let base = prev.expense;
    let label = 'tháng trước';
    if (isCurrent) {
      const day = parseISO(today()).getDate();
      base = prev.byDay.slice(0, day).reduce((a, b) => a + b, 0);
      label = `cùng kỳ tháng trước (${day} ngày đầu)`;
    }
    if (base > 0) {
      const diff = (s.expense - base) / base;
      if (Math.abs(diff) >= 0.05) {
        out.push({
          kind: diff > 0 ? 'warn' : 'good',
          text: `Chi ${diff > 0 ? 'tăng' : 'giảm'} ${Math.round(Math.abs(diff) * 100)}% so với ${label} (${fmtShort(base)} → ${fmtShort(s.expense)}).`,
        });
      } else {
        out.push({ kind: 'info', text: `Mức chi gần như bằng ${label}.` });
      }
    }
  }

  const topCat = s.byCategory[0];
  if (topCat) {
    out.push({
      kind: 'info',
      text: `${cat(topCat.id).name} là khoản lớn nhất: ${fmt(topCat.total)}, chiếm ${Math.round(topCat.pct * 100)}% tổng chi.`,
    });
  }

  for (const c of EXPENSE_CATS) {
    const limit = budgets[c.id];
    if (!limit) continue;
    const spent = s.byCategory.find((x) => x.id === c.id)?.total ?? 0;
    if (spent > limit) {
      out.push({ kind: 'warn', text: `${c.name} đã vượt hạn mức ${fmt(spent - limit)} (${fmtShort(spent)}/${fmtShort(limit)}).` });
    } else if (spent >= limit * 0.8) {
      out.push({ kind: 'warn', text: `${c.name} đã dùng ${Math.round((spent / limit) * 100)}% hạn mức, còn ${fmt(limit - spent)}.` });
    }
  }

  const f = forecast(s, month);
  const spendable = plan.income > 0 ? plan.income - plan.savings : 0;
  if (f !== null) {
    if (spendable > 0 && f > spendable) {
      out.push({ kind: 'warn', text: `Với tốc độ hiện tại, cuối tháng chi khoảng ${fmt(f)} — vượt kế hoạch ${fmt(f - spendable)}.` });
    } else {
      out.push({ kind: spendable > 0 ? 'good' : 'info', text: `Với tốc độ hiện tại, cuối tháng chi khoảng ${fmt(f)}${spendable > 0 ? ', trong kế hoạch' : ''}.` });
    }
  }

  if (s.income > 0) {
    const rate = s.balance / s.income;
    if (s.balance < 0) out.push({ kind: 'warn', text: `Chi nhiều hơn thu ${fmt(-s.balance)}.` });
    else if (plan.savings > 0) {
      out.push(
        s.balance >= plan.savings
          ? { kind: 'good', text: `Đang dư ${fmt(s.balance)}, đạt mục tiêu tiết kiệm ${fmtShort(plan.savings)}.` }
          : { kind: 'info', text: `Đang dư ${fmt(s.balance)}, còn thiếu ${fmt(plan.savings - s.balance)} so với mục tiêu tiết kiệm.` },
      );
    } else {
      out.push({ kind: 'good', text: `Đang để dành được ${Math.round(rate * 100)}% thu nhập (${fmt(s.balance)}).` });
    }
  }

  const maxDay = s.byDay.reduce((best, v, i) => (v > s.byDay[best] ? i : best), 0);
  if (s.byDay[maxDay] > 0 && s.expense > 0 && s.byDay[maxDay] / s.expense < 0.95) {
    out.push({ kind: 'info', text: `Ngày chi nhiều nhất là ${maxDay + 1}/${Number(month.slice(5))}: ${fmt(s.byDay[maxDay])}.` });
  }
  return out;
}

/** Báo cáo dạng chữ để chia sẻ hoặc để bot trả lời. */
export function textReport(txs: Transaction[], budgets: Record<string, number>, plan: Plan, month: string): string {
  const s = monthStats(txs, month);
  const lines = [
    `BÁO CÁO CHI TIÊU — ${monthLabel(month)}`,
    `Thu: ${fmt(s.income)}`,
    `Chi: ${fmt(s.expense)}`,
    `Còn lại: ${fmt(s.balance)}`,
  ];
  if (s.byCategory.length) {
    lines.push('', 'Chi theo danh mục:');
    for (const c of s.byCategory) lines.push(`• ${cat(c.id).name}: ${fmt(c.total)} (${Math.round(c.pct * 100)}%)`);
  }
  const ins = buildInsights(txs, budgets, plan, month);
  if (ins.length) {
    lines.push('', 'Nhận xét:');
    for (const i of ins) lines.push(`• ${i.text}`);
  }
  return lines.join('\n');
}
