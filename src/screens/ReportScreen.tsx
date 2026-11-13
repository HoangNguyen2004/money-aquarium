import React, { useMemo } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { C, themed } from '../theme';
import { cat } from '../categories';
import { addMonths, fmt, fmtShort, monthKey, parseISO, today } from '../format';
import { useStore } from '../store';
import { buildInsights, monthStats, textReport } from '../report';
import { Button, Card, CatIcon, Icon, MonthSwitcher, ProgressBar, SectionTitle, TxRow, notify, Text } from '../components/ui';
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

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
      <View style={{ alignItems: 'center', marginBottom: 14 }}>
        <MonthSwitcher month={month} onChange={onMonth} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1 }}>
          <Text style={styles.kLabel}>Thu</Text>
          <Text style={[styles.kValue, { color: C.income }]}>{fmtShort(stats.income)}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={styles.kLabel}>Chi</Text>
          <Text style={[styles.kValue, { color: C.expense }]}>{fmtShort(stats.expense)}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={styles.kLabel}>Còn lại</Text>
          <Text style={styles.kValue}>{fmtShort(stats.balance)}</Text>
        </Card>
      </View>

      <SectionTitle>Nhận xét tự động</SectionTitle>
      <Card style={{ gap: 12 }}>
        {insights.map((it, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Icon
              name={it.kind === 'good' ? 'checkmark-circle' : it.kind === 'warn' ? 'alert-circle' : 'information-circle'}
              size={19}
              color={it.kind === 'good' ? C.primary : it.kind === 'warn' ? C.warn : C.faint}
            />
            <Text style={{ flex: 1, color: C.ink, fontSize: 14.5, lineHeight: 21 }}>{it.text}</Text>
          </View>
        ))}
      </Card>

      {stats.expense > 0 ? (
        <>
          <SectionTitle>Chi theo danh mục</SectionTitle>
          <Card>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Donut data={stats.byCategory} total={stats.expense} />
            </View>
            {stats.byCategory.map((c) => {
              const before = prev.byCategory.find((p) => p.id === c.id)?.total ?? 0;
              return (
                <View key={c.id} style={styles.catRow}>
                  <CatIcon id={c.id} size={34} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.catName}>{cat(c.id).name}</Text>
                      <Text style={styles.catAmount}>{fmt(c.total)}</Text>
                    </View>
                    <View style={{ marginVertical: 5 }}>
                      <ProgressBar value={c.pct} color={cat(c.id).color} height={5} />
                    </View>
                    <Text style={styles.catSub}>
                      {Math.round(c.pct * 100)}% · {c.count} lần{before > 0 ? ` · tháng trước ${fmtShort(before)}` : ''}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>

          <SectionTitle>Chi theo ngày</SectionTitle>
          <Card>
            <DayBars values={stats.byDay} highlight={todayIdx} />
          </Card>

          <SectionTitle>Khoản chi lớn nhất</SectionTitle>
          <Card style={{ paddingVertical: 6 }}>
            {stats.top.map((t) => <TxRow key={t.id} tx={t} />)}
          </Card>
        </>
      ) : null}

      <Button label="Chia sẻ báo cáo" icon="share-outline" kind="soft" onPress={share} style={{ marginTop: 20 }} />
    </ScrollView>
  );
}

const styles = themed(() => StyleSheet.create({
  kLabel: { fontSize: 12.5, color: C.sub },
  kValue: { fontSize: 19, fontWeight: '500', color: C.ink, marginTop: 4 },
  catRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8 },
  catName: { fontSize: 14.5, fontWeight: '500', color: C.ink },
  catAmount: { fontSize: 14.5, fontWeight: '500', color: C.ink, fontVariant: ['tabular-nums'] },
  catSub: { fontSize: 12, color: C.sub },
}));
