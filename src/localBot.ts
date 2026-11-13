// Bot chạy ngay trên máy, không cần mạng: hiểu các câu kiểu "cà phê 35k",
// "lương 15tr", "hôm qua đổ xăng 80 nghìn", "tháng này tiêu bao nhiêu".
import type { TxType } from './types';
import { guess, strip } from './words';
import { cat, EXPENSE_CATS } from './categories';
import { addDays, addMonths, fmt, monthKey, monthLabel, today } from './format';
import { addTransaction, deleteTransaction, getState, setBudget } from './store';
import { computeStats, inRange, textReport } from './report';

const num = (s: string) => parseFloat(s.replace(',', '.'));

interface Found {
  amount: number;
  start: number;
  end: number;
}

/** Tìm số tiền trong câu đã bỏ dấu. */
export function findAmount(s: string): Found | null {
  let m: RegExpExecArray | null;

  // 1tr2, 1.5tr, 2 triệu, 3 củ
  m = /(\d+(?:[.,]\d+)?)\s*(trieu|tr|cu|m)(\d{1,3})?(?![a-z])/.exec(s);
  if (m) {
    let amount = num(m[1]) * 1e6;
    if (m[3]) amount += parseInt(m[3], 10) * Math.pow(10, 6 - m[3].length);
    return { amount: Math.round(amount), start: m.index, end: m.index + m[0].length };
  }
  // 35k, 50 nghìn, 20 ngàn
  m = /(\d+(?:[.,]\d+)?)\s*(nghin|ngan|ng|k)(?![a-z])/.exec(s);
  if (m) return { amount: Math.round(num(m[1]) * 1e3), start: m.index, end: m.index + m[0].length };

  // 35.000, 1,250,000đ
  m = /(\d{1,3}(?:[.,]\d{3})+)\s*(dong|vnd|d)?(?![a-z0-9])/.exec(s);
  if (m) return { amount: parseInt(m[1].replace(/[.,]/g, ''), 10), start: m.index, end: m.index + m[0].length };

  // số trần: lấy số cuối câu; dưới 1000 hiểu là nghìn ("phở 40" = 40.000)
  const re = /(\d+)\s*(dong|vnd|d)?(?![a-z0-9])/g;
  let last: RegExpExecArray | null = null;
  while ((m = re.exec(s))) last = m;
  if (last) {
    const n = parseInt(last[1], 10);
    if (n > 0) {
      const amount = !last[2] && n < 1000 ? n * 1000 : n;
      return { amount, start: last.index, end: last.index + last[0].length };
    }
  }
  return null;
}

const DATE_WORDS: [RegExp, number][] = [
  [/hom kia/, -2],
  [/hom qua|toi qua|sang qua|chieu qua/, -1],
  [/hom nay|sang nay|trua nay|chieu nay|toi nay/, 0],
];

export interface Parsed {
  type: TxType;
  amount: number;
  category: string;
  note: string;
  date: string;
}

export function parseEntry(raw: string): Parsed | null {
  const text = raw.normalize('NFC').trim();
  const s = strip(text);
  const found = findAmount(s);
  if (!found || found.amount <= 0) return null;

  let date = today();
  // Cắt số tiền khỏi ghi chú (vị trí khớp vì strip() giữ nguyên độ dài).
  let note = (text.slice(0, found.start) + ' ' + text.slice(found.end)).trim();
  for (const [re, offset] of DATE_WORDS) {
    const m = re.exec(strip(note));
    if (m) {
      date = addDays(today(), offset);
      note = (note.slice(0, m.index) + ' ' + note.slice(m.index + m[0].length)).trim();
      break;
    }
  }
  note = note.replace(/\s+/g, ' ').replace(/^[\s\-:,.]+|[\s\-:,.]+$/g, '');
  note = note.replace(/\s+(het|mat|ton|gia)$/i, '').replace(/\s+(hết|mất|tốn|giá)$/i, '');
  const g = guess(s);
  if (!note) note = cat(g.category).name;
  note = note.charAt(0).toUpperCase() + note.slice(1);
  return { ...g, amount: found.amount, note, date };
}

export interface BotReply {
  text: string;
  txIds?: string[];
}

const HELP =
  'Mình ghi chi tiêu giúp bạn. Thử nhắn:\n' +
  '• "cà phê 35k" hoặc "ăn trưa 50 nghìn"\n' +
  '• "hôm qua đổ xăng 80k, gửi xe 5k"\n' +
  '• "lương 15tr"\n' +
  '• "tháng này tiêu bao nhiêu?"\n' +
  '• "ngân sách ăn uống 3tr"\n' +
  '• "xóa khoản vừa ghi"';

function summary(s: string): string {
  const { transactions, budgets, plan } = getState();
  const t = today();
  if (/hom nay/.test(s)) {
    const st = computeStats(inRange(transactions, t, t));
    return `Hôm nay bạn chi ${fmt(st.expense)}${st.income ? `, thu ${fmt(st.income)}` : ''} (${st.count} giao dịch).`;
  }
  if (/hom qua/.test(s)) {
    const y = addDays(t, -1);
    const st = computeStats(inRange(transactions, y, y));
    return `Hôm qua bạn chi ${fmt(st.expense)} (${st.count} giao dịch).`;
  }
  if (/tuan/.test(s)) {
    const st = computeStats(inRange(transactions, addDays(t, -6), t));
    const top = st.byCategory[0];
    return `7 ngày qua bạn chi ${fmt(st.expense)}${top ? `, nhiều nhất là ${cat(top.id).name} (${fmt(top.total)})` : ''}.`;
  }
  const month = /thang truoc/.test(s) ? addMonths(monthKey(t), -1) : monthKey(t);
  return textReport(transactions, budgets, plan, month).replace(/^BÁO CÁO CHI TIÊU — /, '') || monthLabel(month);
}

export function localReply(raw: string): BotReply {
  const s = strip(raw);

  if (/\b(xoa|huy|bo)\b/.test(s) && /(vua|cuoi|gan nhat|khoan do|cai do)/.test(s)) {
    const last = [...getState().transactions].sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!last) return { text: 'Chưa có giao dịch nào để xóa.' };
    deleteTransaction(last.id);
    return { text: `Đã xóa: ${last.note} — ${fmt(last.amount)}.` };
  }

  if (/(ngan sach|han muc)/.test(s)) {
    const found = findAmount(s);
    const padded = ` ${s.replace(/[^a-z0-9]+/g, ' ')} `;
    const target =
      EXPENSE_CATS.find((c) => padded.includes(` ${strip(c.name).replace(/[^a-z0-9]+/g, ' ')} `)) ??
      EXPENSE_CATS.find((c) => c.id === guess(s.replace(/ngan sach|han muc/g, '')).category && c.id !== 'other');
    if (found && target) {
      setBudget(target.id, found.amount);
      return { text: `Đã đặt hạn mức ${target.name}: ${fmt(found.amount)}/tháng.` };
    }
    return { text: 'Bạn nhắn kiểu "ngân sách ăn uống 3tr" để mình đặt hạn mức nhé.' };
  }

  const asksReport = /(bao nhieu|bao cao|thong ke|tong ket|tong chi|da tieu|da chi|con lai|con bao nhieu)/.test(s);
  if (asksReport) return { text: summary(s) };

  // Nhiều khoản trong một tin: tách theo dòng, chấm phẩy, hoặc ", " (không tách "1,5tr").
  const parts = raw.split(/[;\n]|,\s+|\s+và\s+|\s+va\s+/).map((p) => p.trim()).filter(Boolean);
  const added = [];
  let carryDate: string | null = null;
  for (const p of parts) {
    const e = parseEntry(p);
    if (!e) continue;
    // "hôm qua ăn phở 40k, cà phê 20k": ngày của khoản đầu áp cho các khoản sau.
    if (e.date !== today()) carryDate = e.date;
    else if (carryDate) e.date = carryDate;
    added.push(addTransaction({ ...e, source: 'bot' }));
  }
  if (added.length === 0) return { text: HELP };
  if (added.length === 1) {
    const a = added[0];
    return {
      text: `Đã ghi ${a.type === 'income' ? 'khoản thu' : 'khoản chi'} ${fmt(a.amount)} vào ${cat(a.category).name}.`,
      txIds: [a.id],
    };
  }
  const total = added.reduce((sum, a) => sum + (a.type === 'expense' ? a.amount : 0), 0);
  return { text: `Đã ghi ${added.length} khoản${total ? `, tổng chi ${fmt(total)}` : ''}.`, txIds: added.map((a) => a.id) };
}
