const mint = {
  name: 'Bạc hà',
  dark: false,
  bg: '#F8F8F8',
  card: '#EEEEEE',
  ink: '#0A0A0A',
  sub: '#6A6A6A',
  faint: '#9A9A9A',
  line: '#DCDCDC',
  primary: '#1F6B3A',
  primaryMid: '#8FB59C',
  primarySoft: '#E3EFE7',
  expense: '#C8452F',
  expenseSoft: '#F8E3DE',
  income: '#1F6B3A',
  warn: '#B87A0A',
  warnSoft: '#FBF0D9',
  // Thẻ số dư ở màn Tổng quan
  inv: '#0A0A0A',
  invInk: '#F8F8F8',
  invSub: '#939393',
  invAccent: '#1F6B3A',
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
