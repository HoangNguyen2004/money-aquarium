// Luật của tab "Quán của tôi" (đặc tả FS-CMC-001, phần MVP chạy trên máy). Thuần hàm, không đụng store hay React Native.
// Mọi phần thưởng đi qua grant() với một khóa duy nhất (luật + kỳ), nên tính lại bao nhiêu lần cũng không phát trùng.
import type { Plan, Transaction } from '../types';
import { addDays, daysInMonth, monthKey, monthLabel, parseISO, shortDate } from '../format';

export interface LedgerEntry {
  key: string;
  label: string;
  coins: number;
  xp: number;
  pearls: number;
  eggs: number;
  at: string;
}

export interface Game {
  fishCare?: Record<string, { days: number; lastFed: string }>;
  enabled: boolean;
  cafeName: string | null; // null: chưa mở quán
  startedAt: string;
  coins: number;
  xp: number;
  pearls: number;
  eggs: number;
  ledger: LedgerEntry[];
  reviewed: string[]; // các ngày người dùng đã xác nhận rà soát
  closedMonths: string[];
  items: string[]; // vật phẩm và cá đang sở hữu
  hidden: string[]; // vật phẩm đã cất khỏi cảnh
  names: Record<string, string>; // tên người dùng đặt cho cá
  served: { date: string; count: number }; // số lượt bán có xu trong ngày
  placed: Record<string, { x: number }>; // chỗ người chơi đã đặt từng món (tọa độ thế giới game)
}

export interface Ctx {
  transactions: Transaction[];
  plan: Plan;
  budgets: Record<string, number>;
}

export const newGame = (): Game => ({
  enabled: true,
  cafeName: null,
  startedAt: '',
  coins: 0,
  xp: 0,
  pearls: 0,
  eggs: 0,
  ledger: [],
  reviewed: [],
  closedMonths: [],
  items: [],
  hidden: [],
  names: {},
  served: { date: '', count: 0 },
  placed: {},
});

export interface Item {
  id: string;
  name: string;
  where: 'cafe' | 'pond';
  fish?: boolean;
  cost: number;
  currency: 'coins' | 'pearls' | 'eggs';
  level: number;
}

export const STARTER_FISH = 'fish-gold';

// Giá và mốc cấp là số khởi tạo để thử, chỉnh ở đây.
export const ITEMS: Item[] = [
  { id: 'plant', name: 'Chậu cây', where: 'cafe', cost: 30, currency: 'coins', level: 1 },
  { id: 'picture', name: 'Tranh treo tường', where: 'cafe', cost: 50, currency: 'coins', level: 1 },
  { id: 'sofa', name: 'Ghế sofa', where: 'cafe', cost: 80, currency: 'coins', level: 2 },
  { id: 'cake', name: 'Tủ bánh', where: 'cafe', cost: 120, currency: 'coins', level: 3 },
  { id: 'radio', name: 'Máy phát nhạc', where: 'cafe', cost: 150, currency: 'coins', level: 4 },
  { id: 'cat', name: 'Mèo quán', where: 'cafe', cost: 5, currency: 'pearls', level: 2 },
  { id: 'rock', name: 'Đá cảnh', where: 'pond', cost: 30, currency: 'coins', level: 1 },
  { id: 'lotus', name: 'Hoa sen', where: 'pond', cost: 40, currency: 'coins', level: 1 },
  { id: STARTER_FISH, name: 'Cá vàng đuôi voan', where: 'pond', fish: true, cost: 0, currency: 'coins', level: 1 },
  { id: 'fish-clown', name: 'Cá hề', where: 'pond', fish: true, cost: 1, currency: 'eggs', level: 1 },
  { id: 'fish-shrimp', name: 'Tép anh đào', where: 'pond', fish: true, cost: 1, currency: 'eggs', level: 1 },
  { id: 'fish-puffer', name: 'Cá nóc đốm', where: 'pond', fish: true, cost: 8, currency: 'pearls', level: 2 },
  { id: 'fish-turtle', name: 'Rùa tai vàng', where: 'pond', fish: true, cost: 15, currency: 'pearls', level: 4 },
];

export const UNIT = { coins: 'xu', pearls: 'ngọc', eggs: 'trứng' } as const;

export const XP_PER_LEVEL = 60;
export const level = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;

type Delta = Partial<Pick<LedgerEntry, 'coins' | 'xp' | 'pearls' | 'eggs'>>;

function grant(g: Game, key: string, label: string, d: Delta, at: string): Game {
  if (g.ledger.some((e) => e.key === key)) return g;
  const e: LedgerEntry = { key, label, coins: 0, xp: 0, pearls: 0, eggs: 0, ...d, at };
  return {
    ...g,
    coins: g.coins + e.coins,
    xp: g.xp + e.xp,
    pearls: g.pearls + e.pearls,
    eggs: g.eggs + e.eggs,
    ledger: [...g.ledger, e],
  };
}

/** Mở quán: một hồ sơ, một con cá khởi đầu. Gọi lại không tạo trùng. */
export function start(g: Game, name: string, today: string): Game {
  if (g.cafeName) return g;
  return { ...g, cafeName: name.trim() || 'Hồ cá của tôi', startedAt: today, items: [STARTER_FISH] };
}

/** Thưởng giao dịch đầu tiên của mỗi ngày phát sinh (từ ngày mở quán). Gọi sau mỗi lần sổ giao dịch thay đổi. */
export function settle(g: Game, transactions: Transaction[], today: string): Game {
  if (!g.cafeName || !g.enabled) return g;
  // Không thu hồi khi giao dịch bị xóa sau đó: đặc tả yêu cầu không phạt người dùng.
  for (const d of new Set(transactions.map((t) => t.date))) {
    if (d >= g.startedAt && d <= today) g = grant(g, `first-tx:${d}`, `Giao dịch đầu tiên ngày ${shortDate(d)}`, { coins: 10, xp: 5 }, today);
  }
  return g;
}

/** Số có thể chi mỗi tháng theo tab Kế hoạch; 0 nghĩa là chưa đặt ngân sách. */
export function monthlyLimit(ctx: Ctx): number {
  return ctx.plan.income > 0 ? Math.max(0, ctx.plan.income - ctx.plan.savings) : Object.values(ctx.budgets).reduce((a, b) => a + b, 0);
}

/** Tổng chi thuộc phạm vi ngân sách. Chưa có kế hoạch thu nhập thì chỉ tính các danh mục đã đặt hạn mức (giống màn Tổng quan). */
export function spent(ctx: Ctx, inPeriod: (date: string) => boolean): number {
  const all = ctx.plan.income > 0;
  return ctx.transactions.reduce((s, t) => (t.type === 'expense' && inPeriod(t.date) && (all || ctx.budgets[t.category]) ? s + t.amount : s), 0);
}

// shortcut: hạn mức ngày = hạn mức tháng chia đều số ngày, nên ngày trả tiền nhà sẽ luôn vượt. Cần tách chi cố định thì sửa ở đây.
export const dailyLimit = (ctx: Ctx, date: string) => Math.floor(monthlyLimit(ctx) / daysInMonth(monthKey(date)));

export function weekStart(date: string): string {
  return addDays(date, -((parseISO(date).getDay() + 6) % 7));
}

export const reviewedThisWeek = (g: Game, today: string) => {
  const from = weekStart(today);
  return g.reviewed.filter((d) => d >= from && d <= addDays(from, 6)).length;
};

export const WEEK_GOAL = 5;

/** Người dùng xác nhận đã rà soát giao dịch hôm nay (kể cả ngày không phát sinh). */
export function review(g: Game, ctx: Ctx, today: string): Game {
  if (!g.cafeName || g.reviewed.includes(today)) return g;
  g = { ...g, reviewed: [...g.reviewed, today] };
  g = grant(g, `review:${today}`, `Rà soát ngày ${shortDate(today)}`, { coins: 10, xp: 5 }, today);
  const limit = dailyLimit(ctx, today);
  // Chưa đặt ngân sách thì không có ngọc cho "đạt ngân sách".
  if (limit > 0 && spent(ctx, (d) => d === today) <= limit) {
    g = grant(g, `budget-day:${today}`, `Trong ngân sách ngày ${shortDate(today)}`, { pearls: 1 }, today);
  }
  if (reviewedThisWeek(g, today) >= WEEK_GOAL) {
    g = grant(g, `week:${weekStart(today)}`, `Rà soát ${WEEK_GOAL} ngày trong tuần`, { pearls: 3, coins: 30 }, today);
  }
  return g;
}

/** Tháng đã qua, kể từ tháng mở quán, chưa chốt. */
export const canClose = (g: Game, month: string, today: string) =>
  !!g.cafeName && month < monthKey(today) && month >= monthKey(g.startedAt) && !g.closedMonths.includes(month);

/** Chốt tháng sau khi người dùng đã rà soát: trong ngân sách thì thưởng đúng một lần. */
export function closeMonth(g: Game, ctx: Ctx, month: string, today: string): Game {
  if (!canClose(g, month, today)) return g;
  g = { ...g, closedMonths: [...g.closedMonths, month] };
  const limit = monthlyLimit(ctx);
  if (limit > 0 && spent(ctx, (d) => monthKey(d) === month) <= limit) {
    g = grant(g, `month:${month}`, `${monthLabel(month)} trong ngân sách`, { pearls: 10, eggs: 1 }, today);
  }
  return g;
}

/** Mua vật phẩm hoặc cá. Trả về lý do (chuỗi) nếu không mua được; khi đó ví và kho không đổi. */
export function buy(g: Game, id: string, today: string): Game | string {
  const item = ITEMS.find((i) => i.id === id);
  if (!item) return 'Không có món này.';
  if (g.items.includes(id)) return 'Bạn đã có món này rồi.';
  if (level(g.xp) < item.level) return `Cần hồ cấp ${item.level}.`;
  if (g[item.currency] < item.cost) return `Chưa đủ ${UNIT[item.currency]}.`;
  const paid = grant(g, `buy:${id}`, `Mua ${item.name}`, { [item.currency]: -item.cost }, today);
  return { ...paid, items: [...paid.items, id] };
}

// ---------- Bán hàng cho khách ----------

/** Món khách có thể gọi; mở dần theo cấp quán. */
export const MENU = [
  { id: 'coffee', name: 'Cà phê', level: 1 },
  { id: 'tea', name: 'Trà', level: 2 },
  { id: 'cake', name: 'Bánh', level: 3 },
] as const;

export const TIP = 3;
// Giới hạn lượt bán có xu mỗi ngày: xu chủ yếu phải đến từ thói quen tài chính, không phải từ việc ngồi bấm.
export const SERVE_CAP = 10;

export const tipsLeft = (g: Game, today: string) => SERVE_CAP - (g.served.date === today ? g.served.count : 0);

/** Phục vụ đúng một khách: +TIP xu nếu hôm nay còn lượt. Cả ngày gộp thành một dòng trong sổ thưởng. */
export function serve(g: Game, today: string): Game {
  if (!g.cafeName || tipsLeft(g, today) <= 0) return g;
  const count = SERVE_CAP - tipsLeft(g, today) + 1;
  const key = `serve:${today}`;
  const entry: LedgerEntry = { key, label: `Bán hàng cho ${count} khách ngày ${shortDate(today)}`, coins: count * TIP, xp: 0, pearls: 0, eggs: 0, at: today };
  return {
    ...g,
    coins: g.coins + TIP,
    served: { date: today, count },
    ledger: g.ledger.some((e) => e.key === key) ? g.ledger.map((e) => (e.key === key ? entry : e)) : [...g.ledger, entry],
  };
}

export function toggleItem(g: Game, id: string): Game {
  return { ...g, hidden: g.hidden.includes(id) ? g.hidden.filter((x) => x !== id) : [...g.hidden, id] };
}

/** Lưu chỗ đặt của một món đang sở hữu. */
export function place(g: Game, id: string, x: number): Game {
  return g.items.includes(id) ? { ...g, placed: { ...g.placed, [id]: { x } } } : g;
}

export function rename(g: Game, id: string, name: string): Game {
  return { ...g, names: { ...g.names, [id]: name.trim().slice(0, 20) } };
}

/** One growth day per fish per calendar day; feeding again remains a free interaction. */
export function careForFish(g: Game, date: string): Game {
  if (!g.cafeName) return g;
  const fishCare = { ...g.fishCare };
  let changed = false;
  for (const item of ITEMS.filter((i) => i.fish && g.items.includes(i.id) && !g.hidden.includes(i.id))) {
    if (fishCare[item.id]?.lastFed === date) continue;
    fishCare[item.id] = { days: (fishCare[item.id]?.days ?? 0) + 1, lastFed: date };
    changed = true;
  }
  return changed ? { ...g, fishCare } : g;
}
export const growthLabel = (days: number) => days >= 7 ? 'Trưởng thành' : days >= 3 ? 'Đang lớn' : 'Cá nhỏ';
