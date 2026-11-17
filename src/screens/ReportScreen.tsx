import React, { useMemo } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { C, R, themed } from '../theme';
import { cat } from '../categories';
import { addMonths, fmt, fmtShort, monthKey, parseISO, today } from '../format';
import { useStore } from '../store';
import { buildInsights, monthStats, textReport } from '../report';
import { Card, DISPLAY, Icon, MonthSwitcher, SectionTitle, TxRow, notify, Text } from '../components/ui';
import { DayBars, Donut } from '../components/charts';

export function ReportScreen({ month, onMonth }: { month: string; onMonth: (m: string) => void }) {
  const { transactions, budgets, plan } = useStore();
  const stats = useMemo(() => monthStats(transactions, month), [transactions, month]);
  const prev = useMemo(() => monthStats(transactions, addMonths(month, -1)), [transactions, month]);
  const insights = useMemo(() => buildInsights(transactions, budgets, plan, month), [transactions, budgets, plan, month]);
  const todayIdx = monthKey(today()) === month ? parseISO(today()).getDate() - 1 : undefined;

  async function share() {
    const message = textReport(transactions, budgets, plan, month);
    try {
      await Share.share({ message });
    } catch {
      notify('Báo cáo', message);
    }
  }

  const savingRate = stats.income > 0 ? Math.round((stats.balance / stats.income) * 100) : null;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <MonthSwitcher month={month} onChange={onMonth} />
      </View>

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.pulse} />
            <Text style={styles.heroLabel}>SỐ DƯ CÒN LẠI</Text>
          </View>
          {savingRate !== null && savingRate > 0 ? (
            <View style={styles.badge}><Text style={styles.badgeText}>Tiết kiệm {savingRate}%</Text></View>
          ) : null}
        </View>
        <Text style={styles.heroValue}>{stats.balance > 0 ? '+' : ''}{fmt(stats.balance)}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={[styles.pill, { backgroundColor: C.tint }]}>
            <View style={[styles.pillIcon, { backgroundColor: C.primarySoft }]}><Icon name="arrow-down" size={16} color={C.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pillLabel}>Tổng thu</Text>
              <Text style={styles.pillValue} numberOfLines={1}>{fmtShort(stats.income)}</Text>
            </View>
          </View>
          <View style={[styles.pill, { backgroundColor: C.tint }]}>
            <View style={[styles.pillIcon, { backgroundColor: C.expenseSoft }]}><Icon name="arrow-up" size={16} color={C.expense} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pillLabel}>Tổng chi</Text>
              <Text style={[styles.pillValue, { color: C.expense }]} numberOfLines={1}>{fmtShort(stats.expense)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.insight}>
        <View style={styles.insightIcon}><Icon name="fish" size={22} color="#fff" /></View>
        <View style={{ flex: 1, gap: 10 }}>
          <Text style={styles.insightTitle}>Nhận xét thông minh</Text>
          {insights.map((it, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Icon
                name={it.kind === 'good' ? 'checkmark-circle' : it.kind === 'warn' ? 'alert-circle' : 'information-circle'}
                size={18}
                color={it.kind === 'good' ? C.primary : it.kind === 'warn' ? C.warn : C.faint}
              />
              <Text style={{ flex: 1, color: C.ink, fontSize: 14, lineHeight: 21 }}>{it.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {stats.expense > 0 ? (
        <>
          <Card style={{ marginTop: 20, padding: 20 }}>
            <Text style={styles.h2}>Cơ cấu chi tiêu</Text>
            <Text style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>Tổng chi tháng: {fmt(stats.expense)}</Text>
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              <Donut data={stats.byCategory} />
            </View>
            <View style={{ gap: 8 }}>
              {stats.byCategory.map((c) => {
                const before = prev.byCategory.find((p) => p.id === c.id)?.total ?? 0;
                return (
                  <View key={c.id} style={[styles.legend, { backgroundColor: cat(c.id).color + '1F' }]}>
                    <View style={[styles.legendDot, { backgroundColor: cat(c.id).color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.catName}>{cat(c.id).name}</Text>
                      <Text style={styles.catSub}>{c.count} lần{before > 0 ? ` · tháng trước ${fmtShort(before)}` : ''}</Text>
                    </View>
                    <Text style={styles.catAmount}>{fmt(c.total)}</Text>
                    <Text style={styles.catPct}>({Math.round(c.pct * 100)}%)</Text>
                  </View>
                );
              })}
            </View>
          </Card>

          <SectionTitle>Chi theo ngày</SectionTitle>
          <Card>
            <DayBars values={stats.byDay} highlight={todayIdx} />
          </Card>

          <SectionTitle>Chi tiêu nhiều nhất</SectionTitle>
          <View style={{ gap: 10 }}>
            {stats.top.map((t) => <TxRow key={t.id} tx={t} />)}
          </View>
        </>
      ) : null}

      <Pressable onPress={share} accessibilityRole="button" accessibilityLabel="Chia sẻ báo cáo tài chính" style={styles.share}>
        <Icon name="share-outline" size={20} color="#fff" />
        <Text style={{ color: '#fff', fontFamily: DISPLAY, fontWeight: '700', fontSize: 15 }}>Chia sẻ báo cáo tài chính</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = themed(() => StyleSheet.create({
  hero: { backgroundColor: C.card, borderRadius: R.lg, padding: 20, gap: 14, boxShadow: `0 12px 32px -6px ${C.shadow}` },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  heroLabel: { fontSize: 12, fontWeight: '600', color: C.sub, letterSpacing: 0.4 },
  badge: { backgroundColor: C.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', color: C.primary },
  heroValue: { fontFamily: DISPLAY, fontSize: 34, fontWeight: '800', color: C.primary, letterSpacing: -0.7 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: R.md },
  pillIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  pillLabel: { fontSize: 11, color: C.sub },
  pillValue: { fontFamily: DISPLAY, fontSize: 16, fontWeight: '700', color: C.ink },
  insight: { flexDirection: 'row', gap: 12, marginTop: 20, padding: 16, borderRadius: R.lg, backgroundColor: C.aquaSoft },
  insightIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.primaryMid, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { fontFamily: DISPLAY, fontSize: 14, fontWeight: '700', color: C.primary, marginTop: 2 },
  h2: { fontFamily: DISPLAY, fontSize: 18, fontWeight: '700', color: C.ink },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999 },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  catName: { fontSize: 14, fontWeight: '500', color: C.ink },
  catAmount: { fontSize: 13.5, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },
  catPct: { fontSize: 12, color: C.sub, fontVariant: ['tabular-nums'] },
  catSub: { fontSize: 11, color: C.sub },
  share: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: 54, marginTop: 24, borderRadius: 999, backgroundColor: C.primary },
}));
