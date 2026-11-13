export function group(n: number): string {
  return String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 1250000 -> "1.250.000 ₫" */
export function fmt(n: number): string {
  return (n < 0 ? '-' : '') + group(n) + ' ₫';
}

/** 1250000 -> "1,25tr", 35000 -> "35k" */
export function fmtShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const trim = (x: number, d: number) => {
    const s = x.toFixed(d);
    // Chỉ bỏ số 0 thừa sau dấu thập phân ("1.50" -> "1,5"), không đụng vào "110".
    return (s.includes('.') ? s.replace(/\.?0+$/, '') : s).replace('.', ',');
  };
  if (a >= 1e9) return sign + trim(a / 1e9, 2) + ' tỷ';
  if (a >= 1e6) return sign + trim(a / 1e6, 2) + 'tr';
  if (a >= 1e3) return sign + trim(a / 1e3, 0) + 'k';
  return sign + String(Math.round(a));
}

/** Lấy số từ ô nhập: "1.250.000" -> 1250000 */
export function digitsToNumber(s: string): number {
  const d = s.replace(/\D/g, '');
  return d ? Math.min(parseInt(d, 10), 999_999_999_999) : 0;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(): string {
  return isoDate(new Date());
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function isValidISO(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return isoDate(parseISO(s)) === s;
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `Tháng ${m}, ${y}`;
}

const WEEKDAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export function dayLabel(iso: string): string {
  const t = today();
  if (iso === t) return 'Hôm nay';
  if (iso === addDays(t, -1)) return 'Hôm qua';
  const d = parseISO(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
}

export function shortDate(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
