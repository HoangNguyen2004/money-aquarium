import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { C, R, themed } from '../theme';
import { dayLabel, fmt, fmtShort, today } from '../format';
import { useStore } from '../store';
import { monthStats, ofMonth } from '../report';
import type { Transaction } from '../types';
import type { ScanSource } from '../components/TransactionForm';
import { Card, Icon, MonthSwitcher, ProgressBar, SectionTitle, TxRow, Text } from '../components/ui';

interface Props {
  month: string;
  onMonth: (m: string) => void;
  onAdd: (scan?: ScanSource) => void;
  onEdit: (tx: Transaction) => void;
  onSettings: () => void;
  onCafe: () => void;
}

export function HomeScreen({ month, onMonth, onAdd, onEdit, onSettings, onCafe }: Props) {
  const { transactions, budgets, plan, game } = useStore();
  const stats = useMemo(() => monthStats(transactions, month), [transactions, month]);

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

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
      <View style={styles.top}>
        <MonthSwitcher month={month} onChange={onMonth} />
        <Pressable onPress={onSettings} hitSlop={12} accessibilityLabel="Cài đặt">
          <Icon name="settings-outline" size={22} color={C.sub} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <View style={styles.heroHeaderLeft}>
            <View style={styles.heroPulse} />
            <Text style={styles.heroLabel}>Còn lại tháng này</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Đang dư dả ✨</Text>
          </View>
        </View>

        <Text style={styles.heroValue}>{fmt(stats.balance)}</Text>

        <View style={styles.heroPills}>
          <View style={styles.heroPill}>
            <View style={[styles.heroPillIcon, { backgroundColor: C.primarySoft }]}>
              <Icon name="arrow-up" size={16} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroPillLabel}>Tổng thu</Text>
              <Text style={styles.heroPillValue}>+{fmt(stats.income)}</Text>
            </View>
          </View>
          <View style={styles.heroPill}>
            <View style={[styles.heroPillIcon, { backgroundColor: C.expenseSoft }]}>
              <Icon name="arrow-down" size={16} color={C.expense} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroPillLabel}>Đã tiêu</Text>
              <Text style={[styles.heroPillValue, { color: C.expense }]}>-{fmt(stats.expense)}</Text>
            </View>
          </View>
        </View>
      </View>

      {spendable > 0 ? (
        <Card style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: C.sub, fontSize: 13 }}>{hasPlan ? 'Đã chi so với kế hoạch' : 'Đã chi trong các hạn mức'}</Text>
            <Text style={{ color: used > 1 ? C.expense : C.ink, fontWeight: '500', fontSize: 13 }}>
              {fmtShort(counted)} / {fmtShort(spendable)}
            </Text>
          </View>
          <ProgressBar value={used} color={used > 1 ? C.expense : used > 0.8 ? C.warn : C.primary} />
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Pressable style={[styles.action, styles.actionSecondary]} onPress={() => onAdd('camera')}>
          <View style={styles.actionIconBox}><Icon name="camera" size={24} color={C.primary} /></View>
          <Text style={styles.actionText}>Quét hóa đơn</Text>
          <Text style={styles.actionSubtext}>Tự động AI</Text>
        </Pressable>
        <Pressable style={[styles.action, styles.actionSecondary]} onPress={() => onAdd('library')}>
          <View style={styles.actionIconBox}><Icon name="image" size={24} color={C.primary} /></View>
          <Text style={styles.actionText}>Chọn ảnh</Text>
          <Text style={styles.actionSubtext}>Từ thư viện</Text>
        </Pressable>
        <Pressable style={[styles.action, styles.actionPrimary]} onPress={() => onAdd()}>
          <View style={styles.actionIconBoxPrimary}><Icon name="create" size={24} color="#fff" /></View>
          <Text style={[styles.actionText, { color: '#fff' }]}>Nhập tay</Text>
          <Text style={[styles.actionSubtext, { color: 'rgba(255,255,255,0.8)' }]}>Tốc hành</Text>
        </Pressable>
      </View>

      {game.enabled && game.cafeName && !game.reviewed.includes(today()) ? (
        <Pressable onPress={onCafe} style={styles.aquariumBanner} accessibilityRole="button">
          <View style={styles.aquariumContent}>
            <View style={styles.aquariumIcon}>
              <Text style={{ fontSize: 24 }}>🐟</Text>
              <View style={styles.aquariumBubble} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aquariumTitle}>{game.cafeName} đang cần bạn!</Text>
              <Text style={styles.aquariumDesc} numberOfLines={2}>{game.cafeName} đang đói bụng. Ghi chép 1 giao dịch để đổi thức ăn ngon lành ngay nhé!</Text>
            </View>
          </View>
          <Icon name="chevron-forward" size={18} color={C.faint} />
        </Pressable>
      ) : null}

      <SectionTitle>Giao dịch</SectionTitle>
      {groups.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Icon name="receipt-outline" size={34} color={C.faint} />
          <Text style={{ color: C.ink, fontWeight: '500', marginTop: 10 }}>Chưa có giao dịch nào</Text>
          <Text style={{ color: C.sub, textAlign: 'center', marginTop: 4, lineHeight: 20 }}>
            Chụp hóa đơn, nhập tay, hoặc bấm dấu cộng rồi nhắn kiểu “cà phê 35k”.
          </Text>
        </Card>
      ) : (
        groups.map((g) => (
          <Card key={g.date} style={{ marginBottom: 10, paddingVertical: 8 }}>
            <View style={styles.dayHead}>
              <Text style={styles.dayText}>{dayLabel(g.date)}</Text>
              {g.spent > 0 ? <Text style={styles.daySum}>-{fmt(g.spent)}</Text> : null}
            </View>
            {g.items.map((t) => <TxRow key={t.id} tx={t} onPress={() => onEdit(t)} />)}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = themed(() => StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 4 },
  hero: { backgroundColor: C.inv, borderRadius: R.lg, padding: 20, overflow: 'hidden' },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  heroHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primaryMid },
  heroLabel: { color: C.invSub, fontSize: 12, fontWeight: '500' },
  heroBadge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.primarySoft, borderRadius: 12 },
  heroBadgeText: { color: C.primary, fontSize: 11, fontWeight: '600' },
  heroValue: { color: C.invInk, fontSize: 44, fontWeight: '700', marginBottom: 16, letterSpacing: -1.6, fontVariant: ['tabular-nums'] },
  heroPills: { flexDirection: 'row', gap: 12 },
  heroPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 12 },
  heroPillIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  heroPillLabel: { color: C.invSub, fontSize: 11, fontWeight: '500' },
  heroPillValue: { color: C.invInk, fontSize: 14, fontWeight: '600', marginTop: 2, fontVariant: ['tabular-nums'] },
  action: { flex: 1, borderRadius: R.lg, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 4 },
  actionSecondary: { backgroundColor: C.card },
  actionPrimary: { backgroundColor: C.primary },
  actionIconBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  actionIconBoxPrimary: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  actionText: { fontSize: 12, fontWeight: '600', color: C.ink },
  actionSubtext: { fontSize: 10, color: C.sub, marginTop: -2 },
  aquariumBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.warn, borderRadius: R.lg, padding: 14, marginTop: 14 },
  aquariumContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aquariumIcon: { width: 48, height: 48, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  aquariumBubble: { position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  aquariumTitle: { fontSize: 13, fontWeight: '600', color: C.ink, marginBottom: 2 },
  aquariumDesc: { fontSize: 11, color: C.sub, lineHeight: 16 },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, paddingBottom: 2 },
  dayText: { fontSize: 13, fontWeight: '500', color: C.sub },
  daySum: { fontSize: 13, color: C.sub, fontVariant: ['tabular-nums'] },
}));
