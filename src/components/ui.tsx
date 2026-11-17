import React from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text as RNText, TextInput as RNTextInput, View, type ViewStyle, type TextInputProps, type TextProps, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, themed } from '../theme';
import { cat } from '../categories';
import { addMonths, digitsToNumber, fmt, group, monthKey, monthLabel, today } from '../format';
import type { Transaction } from '../types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Phông tùy biến trên Android không đổi nét theo fontWeight, nên mỗi độ đậm là một fontFamily riêng.
// fontFamily: DISPLAY chọn Plus Jakarta Sans (tiêu đề, số tiền); còn lại là Be Vietnam Pro.
export const DISPLAY = 'display';
const BODY = { '500': 'BeVietnamPro_500Medium', '600': 'BeVietnamPro_600SemiBold', '700': 'BeVietnamPro_700Bold', bold: 'BeVietnamPro_700Bold' } as Record<string, string>;
const HEAD = { '500': 'PlusJakartaSans_600SemiBold', '600': 'PlusJakartaSans_600SemiBold', '700': 'PlusJakartaSans_700Bold', bold: 'PlusJakartaSans_700Bold', '800': 'PlusJakartaSans_800ExtraBold' } as Record<string, string>;
const font = (style: unknown) => {
  const f = StyleSheet.flatten(style as TextStyle);
  const w = String(f?.fontWeight ?? '400');
  const fontFamily = f?.fontFamily === DISPLAY ? HEAD[w] ?? 'PlusJakartaSans_600SemiBold' : BODY[w] ?? 'BeVietnamPro_400Regular';
  return { fontFamily, fontWeight: 'normal' } as const;
};

export const Text = (p: TextProps) => <RNText {...p} style={[{ color: C.ink }, p.style, font(p.style)]} />;
export const TextInput = (p: TextInputProps) => <RNTextInput {...p} style={[{ color: C.ink }, p.style, font(p.style)]} />;

export function Icon({ name, size = 20, color = C.ink }: { name: string; size?: number; color?: string }) {
  return <Ionicons name={name as IconName} size={size} color={color} />;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{children}</Text>
      {right}
    </View>
  );
}

export function CatIcon({ id, size = 40 }: { id: string; size?: number }) {
  const c = cat(id);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.36, backgroundColor: c.color + '22', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={c.icon} size={size * 0.48} color={c.color} />
    </View>
  );
}

export function ProgressBar({ value, color = C.primary, height = 8 }: { value: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: C.line, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const isCurrent = month >= monthKey(today());
  return (
    <View style={styles.month}>
      <Pressable hitSlop={12} onPress={() => onChange(addMonths(month, -1))} accessibilityLabel="Tháng trước">
        <Icon name="chevron-back" size={20} color={C.sub} />
      </Pressable>
      <Text style={styles.monthText}>{monthLabel(month)}</Text>
      <Pressable hitSlop={12} disabled={isCurrent} onPress={() => onChange(addMonths(month, 1))} accessibilityLabel="Tháng sau">
        <Icon name="chevron-forward" size={20} color={isCurrent ? C.line : C.sub} />
      </Pressable>
    </View>
  );
}

export function AmountInput({
  value,
  onChange,
  color = C.ink,
  size = 34,
  autoFocus,
  placeholder = '0',
}: {
  value: number;
  onChange: (n: number) => void;
  color?: string;
  size?: number;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
      <TextInput
        value={value ? group(value) : ''}
        onChangeText={(t) => onChange(digitsToNumber(t))}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        autoFocus={autoFocus}
        accessibilityLabel="Số tiền"
        style={{ fontSize: size, fontWeight: '500', color, minWidth: 40, padding: 0, flexShrink: 1, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never, width: Math.max(1, (value ? group(value) : placeholder).length) * size * 0.58 } : null) }}
      />
      <Text style={{ fontSize: size * 0.55, fontWeight: '500', color: C.sub }}>₫</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'soft' | 'danger';
  icon?: string;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  // Một cặp nút: đặc (primary) và viền (soft/danger, chỉ khác màu chữ).
  const solid = kind === 'primary';
  const fg = solid ? '#fff' : kind === 'danger' ? C.expense : C.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, { backgroundColor: solid ? C.primary : C.card, borderColor: solid ? C.primary : C.line, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}
    >
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '500', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function TxRow({ tx, onPress }: { tx: Transaction; onPress?: () => void }) {
  const c = cat(tx.category);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tx, pressed && onPress ? { opacity: 0.6 } : null]}>
      <CatIcon id={tx.category} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={styles.txNote} numberOfLines={1}>{tx.note || c.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text style={[styles.txSub, { flexShrink: 1 }]} numberOfLines={1}>{c.name}</Text>
          {tx.source === 'scan' ? <Icon name="camera" size={12} color={C.faint} /> : null}
          {tx.source === 'bot' ? <Icon name="chatbubble-ellipses" size={12} color={C.faint} /> : null}
        </View>
      </View>
      <Text style={[styles.txAmount, { color: tx.type === 'income' ? C.income : C.expense }]}>
        {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
      </Text>
    </Pressable>
  );
}

/** Hộp xác nhận chạy được cả trên web (Alert của React Native không hoạt động trên web). */
export function confirm(title: string, message: string, onYes: () => void, yesLabel = 'Xóa') {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Hủy', style: 'cancel' },
    { text: yesLabel, style: 'destructive', onPress: onYes },
  ]);
}

export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

const styles = themed(() => StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, boxShadow: `0 4px 16px -4px ${C.shadow}` },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12, paddingHorizontal: 4 },
  section: { fontFamily: DISPLAY, fontSize: 18, fontWeight: '700', color: C.ink },
  month: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, boxShadow: `0 4px 16px -4px ${C.shadow}` },
  monthText: { fontFamily: DISPLAY, fontSize: 17, fontWeight: '600', color: C.ink, minWidth: 116, textAlign: 'center' },
  btn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1 },
  tx: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: C.card, borderRadius: R.md, boxShadow: `0 2px 10px -2px ${C.shadow}` },
  txNote: { fontSize: 14, fontWeight: '600', color: C.ink },
  txSub: { fontSize: 12, color: C.sub, marginTop: 2 },
  txAmount: { fontFamily: DISPLAY, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
}));
