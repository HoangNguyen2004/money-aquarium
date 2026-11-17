import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { C, R, themed } from '../theme';
import { dayLabel, fmt, today } from '../format';
import { useStore } from '../store';
import { buildInsights, monthStats, ofMonth } from '../report';
import type { Transaction } from '../types';
import type { ScanSource } from '../components/TransactionForm';
import { Card, DISPLAY, Icon, MonthSwitcher, TxRow, Text } from '../components/ui';

interface Props {
  month: string;
  onMonth: (m: string) => void;
  onAdd: (scan?: ScanSource) => void;
  onEdit: (tx: Transaction) => void;
  onCafe: () => void;
}

export function HomeScreen({ month, onMonth, onAdd, onEdit, onCafe }: Props) {
  const { transactions, budgets, plan, game } = useStore();
  const [hidden, setHidden] = useState(false);
  const stats = useMemo(() => monthStats(transactions, month), [transactions, month]);
  const tip = useMemo(() => (transactions.length ? buildInsights(transactions, budgets, plan, month)[0] : undefined), [transactions, budgets, plan, month]);

  const groups = useMemo(() => {
    const list = ofMonth(transactions, month).sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
    const out: { date: string; items: Transaction[]; spent: number }[] = [];
    for (const t of list) {
      let g = out[out.length - 1];
      if (!g || g.date !== t.date) out.push((g = { date: t.date, items: [], spent: 0 }));
      g.items.push(t);
      if (t.type === 'expense') g.spent += t.amount;
    }
    return out;
  }, [transactions, month]);

  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  // Có kế hoạch thu nhập: so toàn bộ chi với số có thể chi. Chưa có: chỉ so phần chi thuộc các danh mục đã đặt hạn mức.
  const hasPlan = plan.income > 0;
  const spendable = hasPlan ? Math.max(0, plan.income - plan.savings) : totalBudget;
  const counted = hasPlan ? stats.expense : stats.byCategory.reduce((sum, c) => sum + (budgets[c.id] ? c.total : 0), 0);
  const used = spendable > 0 ? counted / spendable : 0;
  const mask = (s: string) => (hidden ? '••••••' : s);

  const badge = !transactions.length ? null : used > 1 ? 'Vượt ngân sách' : used >= 0.8 ? 'Sắp chạm hạn mức' : stats.balance > 0 ? 'Đang dư dả ✨' : null;
  const barColor = used > 1 ? C.expense : used >= 0.8 ? C.warn : C.accent;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 130, gap: 20 }}>
      <View style={styles.top}>
        <MonthSwitcher month={month} onChange={onMonth} />
        <Pressable onPress={() => setHidden((h) => !h)} style={styles.round} accessibilityLabel="Đổi chế độ ẩn số dư">
          <Icon name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.sub} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={[styles.glow, { right: -48, top: -48, width: 176, height: 176, backgroundColor: C.primarySoft }]} />
        <View style={[styles.glow, { left: -40, bottom: -40, width: 144, height: 144, backgroundColor: C.aquaSoft }]} />
        <View style={styles.heroHead}>
          <View style={styles.heroLabelRow}>
            <View style={styles.pulse} />
            <Text style={styles.heroLabel}>Còn lại tháng này</Text>
          </View>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.heroValue}>{mask(fmt(stats.balance))}</Text>

        <View style={styles.pills}>
          <View style={styles.pill}>
            <View style={[styles.pillIcon, { backgroundColor: C.primarySoft }]}>
              <Icon name="arrow-down" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pillLabel}>Tổng thu</Text>
              <Text style={[styles.pillValue, { color: C.primary }]} numberOfLines={1}>{mask(`+${fmt(stats.income)}`)}</Text>
            </View>
          </View>
          <View style={styles.pill}>
            <View style={[styles.pillIcon, { backgroundColor: C.expenseSoft }]}>
              <Icon name="arrow-up" size={18} color={C.expense} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pillLabel}>Đã tiêu</Text>
              <Text style={[styles.pillValue, { color: C.expense }]} numberOfLines={1}>{mask(`-${fmt(stats.expense)}`)}</Text>
            </View>
          </View>
        </View>

        {spendable > 0 ? (
          <View style={{ marginTop: 14 }}>
            <View style={styles.barLabels}>
              <Text style={styles.barText}>{hasPlan ? 'Ngân sách' : 'Hạn mức'} đã dùng {Math.round(used * 100)}%</Text>
              <Text style={styles.barText}>{hasPlan ? 'Hạn mức' : 'Tổng hạn mức'} {mask(fmt(spendable))}</Text>
            </View>
            <View style={styles.track}>
              <View style={{ width: `${Math.min(1, used) * 100}%`, height: '100%', borderRadius: 999, backgroundColor: barColor }} />
            </View>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable style={styles.action} onPress={() => onAdd('camera')} accessibilityRole="button">
          <View style={[styles.actionIcon, { backgroundColor: C.aquaSoft }]}><Icon name="scan-outline" size={24} color={C.primary} /></View>
          <Text style={styles.actionText}>Chụp hóa đơn</Text>
          <Text style={styles.actionSub}>Tự động đọc</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => onAdd('library')} accessibilityRole="button">
          <View style={[styles.actionIcon, { backgroundColor: C.tint }]}><Icon name="images-outline" size={24} color={C.primary} /></View>
          <Text style={styles.actionText}>Chọn ảnh</Text>
          <Text style={styles.actionSub}>Từ thư viện</Text>
        </Pressable>
        <Pressable style={[styles.action, { backgroundColor: C.accent, boxShadow: `0 8px 20px -4px ${C.accent}55` }]} onPress={() => onAdd()} accessibilityRole="button">
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.22)' }]}><Icon name="create-outline" size={24} color="#fff" /></View>
          <Text style={[styles.actionText, { color: '#fff' }]}>Nhập tay</Text>
          <Text style={[styles.actionSub, { color: 'rgba(255,255,255,0.85)' }]}>Tốc hành</Text>
        </Pressable>
      </View>

      {game.enabled && game.cafeName && !game.reviewed.includes(today()) ? (
        <Pressable onPress={onCafe} style={styles.banner} accessibilityRole="button">
          <View style={styles.bannerFish}>
            <Text style={{ fontSize: 26 }}>🐟</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Hồ cá đang cần bạn!</Text>
            <Text style={styles.bannerDesc} numberOfLines={2}>{game.cafeName} đang chờ bạn rà soát chi tiêu hôm nay.</Text>
          </View>
          <View style={styles.bannerGo}><Icon name="arrow-forward" size={20} color="#fff" /></View>
        </Pressable>
      ) : null}

      <View>
        <Text style={styles.h2}>Giao dịch gần đây</Text>
        {groups.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Icon name="receipt-outline" size={34} color={C.faint} />
            <Text style={{ color: C.ink, fontWeight: '600', marginTop: 10 }}>Chưa có giao dịch nào</Text>
            <Text style={{ color: C.sub, textAlign: 'center', marginTop: 4, lineHeight: 20 }}>
              Chụp hóa đơn, nhập tay, hoặc bấm dấu cộng rồi nhắn kiểu “cà phê 35k”.
            </Text>
          </Card>
        ) : (
          groups.map((g) => (
            <View key={g.date} style={{ marginTop: 12, gap: 8 }}>
              <View style={styles.dayHead}>
                <Text style={styles.dayText}>{dayLabel(g.date).toUpperCase()}</Text>
                {g.spent > 0 ? <Text style={styles.daySum}>{mask(`-${fmt(g.spent)}`)}</Text> : null}
              </View>
              {g.items.map((t) => <TxRow key={t.id} tx={t} onPress={() => onEdit(t)} />)}
            </View>
          ))
        )}
      </View>

      {tip ? (
        <View style={styles.tip}>
          <View style={styles.tipIcon}><Icon name="bulb-outline" size={18} color={C.primary} /></View>
          <Text style={styles.tipText}>
            <Text style={{ fontWeight: '700' }}>Mẹo nhỏ: </Text>
            {tip.text}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = themed(() => StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${C.shadow}` },
  hero: { backgroundColor: C.card, borderRadius: R.lg, padding: 20, overflow: 'hidden', boxShadow: `0 12px 32px -6px ${C.shadow}` },
  glow: { position: 'absolute', borderRadius: 999, opacity: 0.55 },
  heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  heroLabel: { fontSize: 13, fontWeight: '500', color: C.sub },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: C.primarySoft },
  badgeText: { fontSize: 11, fontWeight: '600', color: C.primary },
  heroValue: { fontFamily: DISPLAY, fontSize: 36, fontWeight: '800', color: C.primary, letterSpacing: -0.8, marginTop: 10, marginBottom: 14, fontVariant: ['tabular-nums'] },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R.md, padding: 12, boxShadow: `0 2px 8px ${C.shadow}` },
  pillIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  pillLabel: { fontSize: 11, color: C.sub },
  pillValue: { fontSize: 13, fontWeight: '700', marginTop: 1, fontVariant: ['tabular-nums'] },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barText: { fontSize: 11, color: C.sub },
  track: { height: 8, borderRadius: 999, backgroundColor: C.line, overflow: 'hidden' },
  action: { flex: 1, backgroundColor: C.card, borderRadius: R.md, paddingVertical: 16, paddingHorizontal: 6, alignItems: 'center', gap: 6, boxShadow: `0 4px 16px -4px ${C.shadow}` },
  actionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 13, fontWeight: '600', color: C.ink, textAlign: 'center' },
  actionSub: { fontSize: 10, color: C.sub, marginTop: -3 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.warnSoft, borderRadius: R.md, padding: 14, boxShadow: `0 6px 20px -4px rgba(226,145,0,0.2)` },
  bannerFish: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: '#523200' },
  bannerDesc: { fontSize: 12, color: '#653E00', lineHeight: 17, marginTop: 2 },
  bannerGo: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.warn, alignItems: 'center', justifyContent: 'center' },
  h2: { fontFamily: DISPLAY, fontSize: 20, fontWeight: '700', color: C.ink, paddingHorizontal: 2 },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 },
  dayText: { fontSize: 11, fontWeight: '700', color: C.sub, letterSpacing: 0.8 },
  daySum: { fontSize: 11, fontWeight: '500', color: C.sub, fontVariant: ['tabular-nums'] },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.tint, borderRadius: R.md, padding: 16 },
  tipIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  tipText: { flex: 1, fontSize: 12.5, lineHeight: 19, color: C.sub },
}));
