// Xử lý chữ tiếng Việt dùng chung cho bot offline và bộ đọc hóa đơn. Không phụ thuộc store hay React Native.
import type { TxType } from './types';

/** Bỏ dấu tiếng Việt, giữ nguyên độ dài chuỗi để vị trí khớp với bản gốc. */
export function strip(s: string): string {
  let out = '';
  for (const ch of s.normalize('NFC').toLowerCase()) {
    if (ch === 'đ') out += 'd';
    else out += ch.length > 1 ? ch : ch.normalize('NFD')[0];
  }
  return out;
}

const INCOME_WORDS = ['luong', 'thuong', 'thu nhap', 'nhan tien', 'duoc cho', 'ban duoc', 'hoan tien', 'tien lai', 'thu ve', 'duoc tang'];

// Thứ tự quan trọng: cụm cụ thể đứng trước từ chung.
const KEYWORDS: [string, string[]][] = [
  ['bills', ['tien dien', 'tien nuoc', 'tien nha', 'tien tro', 'thue nha', 'internet', 'wifi', 'tien mang', 'dien thoai', 'nap the', 'cuoc', 'gas', 'phi quan ly']],
  ['transport', ['xang', 'grab', 'taxi', 'xe om', 'gui xe', 've xe', 'xe buyt', 'bus', 'sua xe', 'rua xe', 've may bay', 'tau', 'be']],
  ['health', ['thuoc', 'kham', 'benh vien', 'nha khoa', 'gym', 'bac si', 'vitamin']],
  ['education', ['hoc phi', 'khoa hoc', 'sach', 'hoc', 'lop']],
  ['fun', ['phim', 'game', 'du lich', 'karaoke', 'netflix', 'spotify', 'nhau', 'bia', 'bar', 'concert']],
  ['food', ['an', 'com', 'pho', 'bun', 'mi', 'cafe', 'ca phe', 'cf', 'tra sua', 'tra', 'banh', 'lau', 'nuong', 'sang', 'trua', 'toi', 'do an', 'sieu thi', 'cho', 'nuoc', 'tra da', 'che', 'xoi', 'chao']],
  ['shopping', ['mua', 'ao', 'giay', 'dep', 'tui', 'my pham', 'shopee', 'lazada', 'tiki', 'quan ao']],
];

function hasWord(padded: string, kw: string): boolean {
  return padded.includes(` ${kw} `);
}

export function guess(s: string): { type: TxType; category: string } {
  const padded = ` ${s.replace(/[^a-z0-9]+/g, ' ').trim()} `;
  if (INCOME_WORDS.some((w) => hasWord(padded, w))) {
    if (hasWord(padded, 'luong')) return { type: 'income', category: 'salary' };
    if (hasWord(padded, 'thuong')) return { type: 'income', category: 'bonus' };
    return { type: 'income', category: 'other_income' };
  }
  for (const [id, words] of KEYWORDS) {
    if (words.some((w) => hasWord(padded, w))) return { type: 'expense', category: id };
  }
  return { type: 'expense', category: 'other' };
}
