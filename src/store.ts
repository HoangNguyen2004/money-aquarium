import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppState, ChatMsg, Plan, Transaction } from './types';
import { normalizeCategory } from './categories';
import { addDays, addMonths, monthKey, today, uid } from './format';
import { hasApiKey } from './secrets';
import { applyTheme } from './theme';
import * as G from './game/rules';

const KEY = 'so-chi-tieu:v1';

let state: AppState = {
  ready: false,
  transactions: [],
  budgets: {},
  plan: { income: 0, savings: 0 },
  chat: [],
  hasKey: false,
  themeId: 'mint',
  background: null,
  game: G.newGame(),
};

const listeners = new Set<() => void>();

function set(patch: Partial<AppState>, persist = true) {
  state = { ...state, ...patch };
  // Sổ giao dịch đổi thì quán tính lại phần thưởng (không phát trùng nhờ khóa trong sổ thưởng).
  if (patch.transactions) state.game = G.settle(state.game, state.transactions, today());
  listeners.forEach((l) => l());
  if (persist && state.ready) {
    const { transactions, budgets, plan, chat, themeId, game } = state;
    // Bản web không lưu ảnh nền: data URI có thể làm đầy bộ nhớ trình duyệt và chặn luôn việc lưu giao dịch.
    const background = Platform.OS === 'web' ? null : state.background;
    AsyncStorage.setItem(KEY, JSON.stringify({ transactions, budgets, plan, chat: chat.slice(-80), themeId, background, game })).catch(
      () => {},
    );
  }
}

export function getState(): AppState {
  return state;
}

export function useStore(): AppState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getState,
    getState,
  );
}

export async function loadStore() {
  let saved: Partial<AppState> = {};
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) saved = JSON.parse(raw);
  } catch {
    // dữ liệu hỏng: bắt đầu lại từ trống
  }
  const hasKey = await hasApiKey();
  const themeId = typeof saved.themeId === 'string' ? saved.themeId : 'mint';
  applyTheme(themeId);
  set(
    {
      ready: true,
      transactions: Array.isArray(saved.transactions) ? saved.transactions : [],
      budgets: saved.budgets ?? {},
      plan: { income: 0, savings: 0, ...(saved.plan ?? {}) },
      chat: Array.isArray(saved.chat) ? saved.chat : [],
      hasKey,
      themeId,
      game: { ...G.newGame(), ...(saved.game ?? {}) },
      background: typeof saved.background === 'string' ? saved.background : null,
    },
    false,
  );
}

export type NewTx = Pick<Transaction, 'type' | 'amount' | 'category' | 'note' | 'date'> &
  Partial<Pick<Transaction, 'source' | 'photoUri'>>;

export function addTransaction(t: NewTx): Transaction {
  const tx: Transaction = {
    id: uid(),
    createdAt: Date.now(),
    source: 'manual',
    ...t,
    amount: Math.round(Math.abs(t.amount)),
    category: normalizeCategory(t.category, t.type),
    note: t.note.trim(),
  };
  set({ transactions: [tx, ...state.transactions] });
  return tx;
}

export function updateTransaction(id: string, patch: Partial<NewTx>) {
  set({
    transactions: state.transactions.map((t) => {
      if (t.id !== id) return t;
      const next = { ...t, ...patch };
      next.category = normalizeCategory(next.category, next.type);
      return next;
    }),
  });
}

export function deleteTransaction(id: string): boolean {
  const before = state.transactions.length;
  set({ transactions: state.transactions.filter((t) => t.id !== id) });
  return state.transactions.length < before;
}

export function setBudget(category: string, amount: number) {
  const budgets = { ...state.budgets };
  if (amount > 0) budgets[category] = Math.round(amount);
  else delete budgets[category];
  set({ budgets });
}

export function setBudgets(budgets: Record<string, number>) {
  set({ budgets });
}

export function setPlan(plan: Plan) {
  set({ plan });
}

export function pushChat(msg: Omit<ChatMsg, 'id'>): ChatMsg {
  const m = { ...msg, id: uid() };
  set({ chat: [...state.chat, m] });
  return m;
}

export function clearChat() {
  set({ chat: [] });
}

export function setTheme(themeId: string) {
  applyTheme(themeId);
  set({ themeId });
}

export function setBackground(background: string | null) {
  set({ background });
}

const ctx = (): G.Ctx => ({ transactions: state.transactions, plan: state.plan, budgets: state.budgets });

export function startCafe(name: string) {
  set({ game: G.settle(G.start(state.game, name, today()), state.transactions, today()) });
}

export function reviewToday() {
  set({ game: G.review(state.game, ctx(), today()) });
}

export function closeMonth(month: string) {
  set({ game: G.closeMonth(state.game, ctx(), month, today()) });
}

/** Trả về lý do nếu không mua được. */
export function buyItem(id: string): string | null {
  const next = G.buy(state.game, id, today());
  if (typeof next === 'string') return next;
  set({ game: next });
  return null;
}

/** Phục vụ một khách; trả về số xu nhận được (0 nếu hôm nay đã hết lượt có xu). */
export function serveCustomer(): number {
  const next = G.serve(state.game, today());
  const tip = next.coins - state.game.coins;
  if (tip) set({ game: next });
  return tip;
}

export function toggleItem(id: string) {
  set({ game: G.toggleItem(state.game, id) });
}

export function placeItem(id: string, x: number) {
  set({ game: G.place(state.game, id, x) });
}

export function renameItem(id: string, name: string) {
  set({ game: G.rename(state.game, id, name) });
}

export function setGameEnabled(enabled: boolean) {
  set({ game: G.settle({ ...state.game, enabled }, state.transactions, today()) });
}

export function setHasKey(hasKey: boolean) {
  set({ hasKey }, false);
}

export function clearAll() {
  set({ transactions: [], budgets: {}, plan: { income: 0, savings: 0 }, chat: [], game: { ...G.newGame(), enabled: state.game.enabled } });
}

/** Dữ liệu mẫu cho 2 tháng gần nhất để xem thử báo cáo. */
export function loadSampleData() {
  const t = today();
  const thisMonth = monthKey(t);
  const lastMonth = addMonths(thisMonth, -1);
  const txs: Transaction[] = [];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const push = (date: string, type: Transaction['type'], category: string, amount: number, note: string) => {
    if (date > t) return;
    txs.push({ id: uid(), type, category, amount, note, date, createdAt: Date.now(), source: 'manual' });
  };
  const daily: [string, string, number, number][] = [
    ['food', 'Ăn trưa', 35000, 30000],
    ['food', 'Cà phê', 25000, 20000],
    ['transport', 'Grab', 30000, 40000],
  ];
  for (const m of [lastMonth, thisMonth]) {
    push(`${m}-01`, 'income', 'salary', 15000000, 'Lương tháng');
    push(`${m}-03`, 'expense', 'bills', 3500000, 'Tiền nhà');
    push(`${m}-05`, 'expense', 'bills', 420000 + Math.round(rnd() * 20) * 10000, 'Tiền điện nước');
    push(`${m}-06`, 'expense', 'bills', 220000, 'Internet');
    for (let d = 1; d <= 28; d++) {
      const date = `${m}-${String(d).padStart(2, '0')}`;
      for (const [c, note, base, spread] of daily) {
        if (rnd() < 0.62) push(date, 'expense', c, base + Math.round((rnd() * spread) / 1000) * 1000, note);
      }
      if (rnd() < 0.12) push(date, 'expense', 'shopping', 150000 + Math.round(rnd() * 60) * 10000, 'Mua sắm');
      if (rnd() < 0.08) push(date, 'expense', 'fun', 90000 + Math.round(rnd() * 20) * 10000, 'Xem phim');
      if (rnd() < 0.04) push(date, 'expense', 'health', 120000 + Math.round(rnd() * 30) * 10000, 'Mua thuốc');
    }
    push(`${m}-15`, 'expense', 'education', 600000, 'Khóa học online');
  }
  push(addDays(t, -2), 'income', 'bonus', 1000000, 'Thưởng dự án');
  txs.sort((a, b) => (a.date < b.date ? 1 : -1));
  set({
    transactions: [...txs, ...state.transactions],
    plan: state.plan.income ? state.plan : { income: 15000000, savings: 3000000 },
    budgets: Object.keys(state.budgets).length
      ? state.budgets
      : { food: 3000000, transport: 1200000, bills: 4500000, shopping: 1500000, fun: 800000 },
  });
}

export function feedFishToday() {
  set({ game: G.careForFish(state.game, today()) });
}
