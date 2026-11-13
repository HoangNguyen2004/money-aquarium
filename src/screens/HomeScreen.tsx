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
        <Text style={styles.heroLabel}>Còn lại tháng này</Text>
        <Text style={styles.heroValue}>{fmt(stats.balance)}</Text>
        <View style={styles.heroRow}>
          <View style={styles.heroCell}>
            <View style={styles.heroDot}><Icon name="arrow-up" size={14} color="#fff" /></View>
            <View>
              <Text style={styles.heroSmall}>Thu</Text>
              <Text style={styles.heroNum}>{fmt(stats.income)}</Text>
            </View>
          </View>
          <View style={styles.heroCell}>
            <View style={[styles.heroDot, { backgroundColor: C.expense }]}><Icon name="arrow-down" size={14} color="#fff" /></View>
            <View>
              <Text style={styles.heroSmall}>Chi</Text>
              <Text style={styles.heroNum}>{fmt(stats.expense)}</Text>
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

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <Pressable style={styles.action} onPress={() => onAdd('camera')}>
          <Icon name="camera" size={22} color={C.ink} />
          <Text style={styles.actionText}>Chụp hóa đơn</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => onAdd('library')}>
          <Icon name="image" size={22} color={C.ink} />
          <Text style={styles.actionText}>Chọn ảnh</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => onAdd()}>
          <Icon name="create" size={22} color={C.ink} />
          <Text style={styles.actionText}>Nhập tay</Text>
        </Pressable>
      </View>

      {game.enabled && game.cafeName && !game.reviewed.includes(today()) ? (
        <Pressable onPress={onCafe} style={[styles.action, { flexDirection: 'row', gap: 10, marginTop: 12, paddingHorizontal: 14, flex: 0 }]} accessibilityRole="button">
          <Icon name="fish" size={20} color={C.primary} />
          <Text style={{ flex: 1, fontSize: 13.5, color: C.ink }}>{game.cafeName} đang chờ bạn rà soát chi tiêu hôm nay.</Text>
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
  hero: { backgroundColor: C.inv, borderRadius: R.lg, padding: 22 },
  heroLabel: { color: C.invSub, fontSize: 13 },
  heroValue: { color: C.invInk, fontSize: 42, fontWeight: '500', marginTop: 6, letterSpacing: -1.6, fontVariant: ['tabular-nums'] },
  heroRow: { flexDirection: 'row', marginTop: 22, gap: 12 },
  heroCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.invAccent, alignItems: 'center', justifyContent: 'center' },
  heroSmall: { color: C.invSub, fontSize: 12 },
  heroNum: { color: C.invInk, fontSize: 15, fontWeight: '500', fontVariant: ['tabular-nums'] },
  action: { flex: 1, backgroundColor: C.card, borderRadius: R.md, paddingVertical: 14, alignItems: 'center', gap: 6 },
  actionText: { fontSize: 13, fontWeight: '500', color: C.ink },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, paddingBottom: 2 },
  dayText: { fontSize: 13, fontWeight: '500', color: C.sub },
  daySum: { fontSize: 13, color: C.sub, fontVariant: ['tabular-nums'] },
}));
