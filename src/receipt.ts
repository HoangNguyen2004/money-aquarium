// Đọc tổng tiền, ngày, nơi bán từ chữ OCR của hóa đơn. Chạy trên máy, không cần mạng hay API.
// shortcut: đoán theo từ khóa và con số nên có thể sai với hóa đơn lạ; người dùng luôn được xem lại trước khi lưu. Cần chính xác hơn thì dùng quét bằng AI.
import { isValidISO, today } from './format';
import { guess, strip } from './words';

export interface ReceiptGuess {
  readable: boolean;
  type: 'expense' | 'income';
  total: number;
  merchant: string;
  date: string;
  category: string;
  note: string;
}

// Xếp từ chắc nhất đến kém chắc nhất.
const TOTAL_WORDS = [
  ['tong thanh toan', 'thanh toan', 'phai tra', 'phai thu'],
  ['tong cong', 'tong tien', 'thanh tien', 'total'],
  ['tong', 'so tien', 'amount'],
];
// Dòng có số nhưng không phải tổng phải trả.
const NOT_TOTAL = /khach dua|tien dua|tien mat|tien thoi|tra lai|tien thua|giam gia|chiet khau|khuyen mai|vat|thue|tam tinh|cash|change/;
// Dòng có số nhưng không phải tiền.
const NOT_MONEY = /dien thoai|hotline|\bdt\b|\bsdt\b|\btel\b|mst|ma so|\bstk\b|tai khoan|so hd|so hoa don|ma gd|ma giao dich|so the|so ban/;

const DATE = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})(?!\d)/;

/** Các số tiền trên một dòng đã bỏ dấu. Số không có dấu phân cách nghìn chỉ lấy khi bare = true. */
function amounts(line: string, bare: boolean): number[] {
  if (NOT_MONEY.test(line)) return [];
  const clean = line.replace(new RegExp(DATE, 'g'), ' ').replace(/\d{1,2}:\d{2}(:\d{2})?/g, ' ');
  const out: number[] = [];
  for (const m of clean.matchAll(/\d{1,3}(?:[.,]\d{3})+|\d{4,9}/g)) {
    if (!bare && !/[.,]/.test(m[0])) continue;
    const n = Number(m[0].replace(/[.,]/g, ''));
    if (n >= 1000 && n < 1e10) out.push(n);
  }
  return out;
}

function findTotal(lines: string[]): number {
  for (const words of TOTAL_WORDS) {
    let best = 0;
    lines.forEach((line, i) => {
      if (NOT_TOTAL.test(line) || !words.some((w) => line.includes(w))) return;
      // OCR hay tách nhãn và số thành hai dòng: không thấy số cùng dòng thì xem dòng kế.
      let found = amounts(line, true);
      if (!found.length && lines[i + 1] && !NOT_TOTAL.test(lines[i + 1])) found = amounts(lines[i + 1], true);
      best = Math.max(best, ...found);
    });
    if (best) return best;
  }
  // Không có nhãn tổng: lấy số tiền lớn nhất, bỏ qua tiền khách đưa / tiền thối.
  const rest = lines.filter((l) => !NOT_TOTAL.test(l));
  const grouped = rest.flatMap((l) => amounts(l, false));
  return Math.max(0, ...(grouped.length ? grouped : rest.flatMap((l) => amounts(l, true))));
}

function findDate(text: string): string {
  const m = DATE.exec(text);
  if (!m) return today();
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  const iso = `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return isValidISO(iso) && iso <= today() ? iso : today();
}

export function parseReceiptText(text: string): ReceiptGuess {
  const raw = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lines = raw.map(strip);
  const total = findTotal(lines);
  // Tên nơi bán thường là dòng chữ đầu tiên.
  const merchant = (raw.find((l) => (l.match(/\p{L}/gu)?.length ?? 0) >= 3 && !/\d{4,}/.test(l)) ?? '').slice(0, 40);
  const g = guess(lines.join(' '));
  return {
    readable: total > 0,
    type: 'expense',
    total,
    merchant,
    date: findDate(lines.join('\n')),
    category: g.type === 'expense' ? g.category : 'other',
    note: merchant,
  };
}
