// Chạy: npm test. Bám theo tiêu chí nghiệm thu AC-01..AC-12 của đặc tả FS-CMC-001 (phần làm được trên máy).
import assert from 'node:assert/strict';
import { careForFish, buy, closeMonth, newGame, review, serve, SERVE_CAP, settle, start, STARTER_FISH, TIP, tipsLeft, type Ctx } from './rules';
import type { Transaction } from '../types';

const tx = (date: string, amount: number, type: Transaction['type'] = 'expense', category = 'food'): Transaction => ({
  id: `${date}-${amount}-${Math.random()}`,
  type,
  amount,
  category,
  note: '',
  date,
  createdAt: 0,
  source: 'manual',
});
const ctx = (transactions: Transaction[], income = 0, budgets: Record<string, number> = {}): Ctx => ({
  transactions,
  plan: { income, savings: 0 },
  budgets,
});

const TODAY = '2026-11-12';

// AC-01: mở quán tạo đúng một hồ sơ và một cá khởi đầu; gọi lại không tạo trùng.
let g = start(newGame(), 'Quán Mây', TODAY);
assert.deepEqual(g.items, [STARTER_FISH]);
assert.equal(start(g, 'Tên khác', TODAY), g);

// AC-02: giao dịch đầu tiên của ngày được 10 xu + 5 XP; giao dịch thứ hai và việc tính lại không cộng thêm.
const two = [tx(TODAY, 35000), tx(TODAY, 45000)];
g = settle(g, two, TODAY);
assert.deepEqual([g.coins, g.xp], [10, 5]);
g = settle(g, two, TODAY);
assert.deepEqual([g.coins, g.xp], [10, 5]);
// Giao dịch trước ngày mở quán hoặc ở tương lai không được thưởng.
assert.equal(settle(g, [...two, tx('2026-11-01', 1000), tx('2026-12-01', 1000)], TODAY).coins, 10);

// AC-03: chưa rà soát thì không có ngọc dù hôm nay không chi gì.
assert.equal(settle(start(newGame(), 'A', TODAY), [], TODAY).pearls, 0);

// AC-04 + AC-05: xác nhận ngày không phát sinh vẫn hoàn thành rà soát; chưa đặt ngân sách thì không có ngọc.
let r = review(start(newGame(), 'A', TODAY), ctx([]), TODAY);
assert.deepEqual([r.coins, r.xp, r.pearls], [10, 5, 0]);
assert.equal(review(r, ctx([]), TODAY), r); // một lần mỗi ngày

// Có ngân sách: 9tr/30 ngày = 300k/ngày. Chi 80k thì được 1 ngọc, chi 400k thì không.
assert.equal(review(start(newGame(), 'A', TODAY), ctx([tx(TODAY, 80000)], 9000000), TODAY).pearls, 1);
assert.equal(review(start(newGame(), 'A', TODAY), ctx([tx(TODAY, 400000)], 9000000), TODAY).pearls, 0);
// Chỉ có hạn mức danh mục: khoản chi ngoài danh mục đã đặt không tính vào ngân sách.
assert.equal(review(start(newGame(), 'A', TODAY), ctx([tx(TODAY, 400000, 'expense', 'fun')], 0, { food: 3000000 }), TODAY).pearls, 1);

// Tuần: rà soát đủ 5 ngày (T2 9/11 đến T6 13/11) thì được 3 ngọc + 30 xu, đúng một lần.
let w = start(newGame(), 'A', '2026-11-09');
for (const d of ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12']) w = review(w, ctx([]), d);
assert.equal(w.pearls, 0);
w = review(w, ctx([]), '2026-11-13');
assert.deepEqual([w.pearls, w.coins], [3, 5 * 10 + 30]);
assert.equal(review(w, ctx([]), '2026-11-14').pearls, 3);

// AC-06: chốt tháng trong ngân sách thưởng đúng một lần; tháng hiện tại và tháng vượt ngân sách thì không.
const oct = start(newGame(), 'A', '2026-10-05');
const within = ctx([tx('2026-10-10', 5000000)], 9000000);
let m = closeMonth(oct, within, '2026-10', TODAY);
assert.deepEqual([m.pearls, m.eggs], [10, 1]);
assert.equal(closeMonth(m, within, '2026-10', TODAY), m);
assert.equal(closeMonth(oct, within, '2026-11', TODAY), oct);
m = closeMonth(oct, ctx([tx('2026-10-10', 9500000)], 9000000), '2026-10', TODAY);
assert.deepEqual([m.pearls, m.eggs, m.closedMonths], [0, 0, ['2026-10']]);
assert.equal(closeMonth(oct, ctx([]), '2026-10', TODAY).pearls, 0); // chưa đặt ngân sách

// AC-09: thiếu xu thì từ chối, ví và kho không đổi. Đủ xu thì trừ đúng một lần (AC-10).
assert.equal(typeof buy(g, 'plant', TODAY), 'string');
const rich = { ...g, coins: 40 };
const bought = buy(rich, 'plant', TODAY);
assert.ok(typeof bought !== 'string');
assert.deepEqual([bought.coins, bought.items.includes('plant')], [10, true]);
assert.equal(buy(bought, 'plant', TODAY), 'Bạn đã có món này rồi.');
assert.equal(buy({ ...g, coins: 999 }, 'sofa', TODAY), 'Cần hồ cấp 2.');

// AC-12: bỏ app nhiều ngày rồi quay lại, không mất gì.
const later = settle(bought, [], '2027-03-01');
assert.deepEqual([later.coins, later.xp, later.items], [bought.coins, bought.xp, bought.items]);

// Bán hàng: mỗi khách +TIP xu, tối đa SERVE_CAP lượt/ngày, cả ngày chỉ một dòng sổ thưởng; sang ngày mới có lượt lại.
let sv = start(newGame(), 'A', TODAY);
for (let i = 0; i < SERVE_CAP + 5; i++) sv = serve(sv, TODAY);
assert.deepEqual([sv.coins, tipsLeft(sv, TODAY), sv.ledger.length], [SERVE_CAP * TIP, 0, 1]);
assert.equal(sv.ledger[0].coins, SERVE_CAP * TIP);
assert.equal(serve(sv, '2026-11-13').coins, SERVE_CAP * TIP + TIP);
assert.equal(serve(newGame(), TODAY).coins, 0); // chưa mở quán

// Growth survives serialization, counts once per day, and never penalizes an absence.
let cared = careForFish(start(newGame(), 'Hồ Mây', TODAY), TODAY);
assert.deepEqual(cared.fishCare?.['fish-gold'], { days: 1, lastFed: TODAY });
assert.equal(careForFish(cared, TODAY), cared);
cared = careForFish(JSON.parse(JSON.stringify(cared)), '2026-11-13');
assert.equal(cared.fishCare?.['fish-gold'].days, 2);
assert.equal(careForFish(cared, '2027-01-01').fishCare?.['fish-gold'].days, 3);
assert.equal(careForFish({ ...cared, hidden: ['fish-gold'] }, '2026-11-14').fishCare?.['fish-gold'].days, 2);
assert.equal(careForFish(newGame(), TODAY).fishCare, undefined);
console.log('game: ok');
