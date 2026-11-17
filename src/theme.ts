const mint = {
  name: 'Bạc hà',
  dark: false,
  bg: '#F8F9FF',
  card: '#FFFFFF',
  ink: '#0B1C30',
  sub: '#4F5F57',
  faint: '#8A978F',
  line: '#E5EEFF',
  primary: '#006C49',
  primaryMid: '#10B981',
  primarySoft: '#D5F7E8',
  expense: '#BA1A1A',
  expenseSoft: '#FFDAD6',
  income: '#006C49',
  warn: '#855300',
  warnSoft: '#FFDDB8',
  // Màu nhấn theo thiết kế Stitch (Cozy Mint Oasis)
  accent: '#10B981',
  aqua: '#86F2E4',
  aquaSoft: '#D9F7F3',
  tint: '#EFF4FF',
  amber: '#E29100',
  shadow: 'rgba(0,108,73,0.10)',
  // Thẻ số dư ở màn Tổng quan
  inv: '#FFFFFF',
  invInk: '#006C49',
  invSub: '#3C4A42',
  invAccent: '#10B981',
};

export type Theme = typeof mint;

// Màu nhấn của mọi bộ đều đủ đậm để chữ trắng đọc được trên nút.
export const THEMES: Record<string, Theme> = {
  mint,
  cream: {
    ...mint,
    name: 'Giấy kem',
    bg: '#F4F1EA',
    card: '#FFFFFF',
    ink: '#1B1F1D',
    sub: '#6E746F',
    faint: '#A3A8A3',
    line: '#E7E3DA',
    primary: '#0F6B5A',
    primaryMid: '#8DBDB0',
    primarySoft: '#DCEDE7',
    income: '#0F6B5A',
    inv: '#0F6B5A',
    invInk: '#FFFFFF',
    invSub: '#BFE0D6',
    invAccent: '#3FA08B',
  },
  ocean: {
    ...mint,
    name: 'Biển xanh',
    bg: '#FFFFFF',
    card: '#F1F3F6',
    ink: '#111111',
    sub: '#626B7A',
    faint: '#9AA1AD',
    line: '#DDE1E8',
    primary: '#1A4BE0',
    primaryMid: '#8FA8EE',
    primarySoft: '#E4EAFC',
    income: '#1E7F4F',
    inv: '#0E1B3D',
    invInk: '#FFFFFF',
    invSub: '#9AA6C4',
    invAccent: '#1A4BE0',
  },
  ink: {
    ...mint,
    name: 'Mực',
    bg: '#F6F5F2',
    card: '#ECEAE5',
    ink: '#111111',
    sub: '#6B6964',
    faint: '#9C9A94',
    line: '#D9D6CF',
    primary: '#111111',
    primaryMid: '#9A9892',
    primarySoft: '#E2E0DA',
    inv: '#111111',
    invInk: '#F6F5F2',
    invSub: '#9C9A94',
    invAccent: '#3A3A3A',
  },
  night: {
    name: 'Đêm',
    dark: true,
    bg: '#0A0A0A',
    card: '#171717',
    ink: '#F8F8F8',
    sub: '#939393',
    faint: '#6A6A6A',
    line: '#2A2A2A',
    primary: '#2F8F58',
    primaryMid: '#245C3C',
    primarySoft: '#13291C',
    expense: '#E5674F',
    expenseSoft: '#34160F',
    income: '#4CB47A',
    warn: '#D9A23A',
    warnSoft: '#2E2410',
    accent: '#2F8F58',
    aqua: '#1E5C55',
    aquaSoft: '#12302D',
    tint: '#101C15',
    amber: '#D9A23A',
    shadow: 'rgba(0,0,0,0.4)',
    inv: '#14331F',
    invInk: '#F8F8F8',
    invSub: '#9DB8A6',
    invAccent: '#2F8F58',
  },
};

/** Màu của theme đang dùng. applyTheme() ghi đè tại chỗ nên mọi nơi đọc C.x lúc render đều thấy màu mới. */
export const C: Theme = { ...mint };

let version = 0;

export function applyTheme(id: string) {
  Object.assign(C, THEMES[id] ?? mint);
  version++;
}

/** StyleSheet khai báo ở đầu file chỉ tính một lần; bọc bằng themed() để tính lại sau khi đổi theme. */
export function themed<T extends object>(make: () => T): T {
  let made = -1;
  let cur: T;
  return new Proxy({} as T, {
    get(_, key) {
      if (made !== version) {
        cur = make();
        made = version;
      }
      return cur[key as keyof T];
    },
  });
}

// Một họ bo góc duy nhất: nút/ô nhập 10, khối 16, thẻ 24.
export const R = { sm: 10, md: 16, lg: 24 };
