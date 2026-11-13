import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { C, R, themed } from '../theme';
import { EXPENSE_CATS, cat } from '../categories';
import { addMonths, fmt, fmtShort, monthKey, monthLabel, today } from '../format';
import { setBudget, setBudgets, setPlan, useStore } from '../store';
import { forecast, monthStats } from '../report';
import type { Transaction } from '../types';
import { AmountInput, Button, Card, CatIcon, Icon, ProgressBar, SectionTitle, confirm, Text } from '../components/ui';

type Editing = { key: 'income' | 'savings' | string; title: string; hint: string; value: number } | null;

const DEFAULT_SPLIT: Record<string, number> = { food: 0.3, bills: 0.27, transport: 0.1, shopping: 0.1, health: 0.05, fun: 0.08, education: 0.06, other: 0.04 };

/** Gợi ý hạn mức: theo thói quen 3 tháng gần nhất nếu có dữ liệu, không thì theo tỉ lệ mặc định. */
function suggest(transactions: Transaction[], spendable: number, month: string): Record<string, number> {
  const hist: Record<string, number> = {};
  let total = 0;
  for (let i = 1; i <= 3; i++) {
    for (const c of monthStats(transactions, addMonths(month, -i)).byCategory) {
      hist[c.id] = (hist[c.id] ?? 0) + c.total;
      total += c.total;
    }
  }
  const split = total > 0 ? Object.fromEntries(Object.entries(hist).map(([k, v]) => [k, v / total])) : DEFAULT_SPLIT;
  const out: Record<string, number> = {};
  for (const c of EXPENSE_CATS) {
    const v = Math.round(((split[c.id] ?? 0) * spendable) / 50000) * 50000;
    if (v > 0) out[c.id] = v;
  }
  return out;
}

export function PlanScreen() {
  const { transactions, budgets, plan } = useStore();
  const month = monthKey(today());
  const stats = useMemo(() => monthStats(transactions, month), [transactions, month]);
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState(0);

  const spendable = Math.max(0, plan.income - plan.savings);
  const allocated = Object.values(budgets).reduce((a, b) => a + b, 0);
  const f = forecast(stats, month);
  const spentOf = (id: string) => stats.byCategory.find((c) => c.id === id)?.total ?? 0;

  function open(e: NonNullable<Editing>) {
    setDraft(e.value);
    setEditing(e);
  }

  function saveEdit() {
    if (!editing) return;
    if (editing.key === 'income') setPlan({ ...plan, income: draft });
    else if (editing.key === 'savings') setPlan({ ...plan, savings: draft });
    else setBudget(editing.key, draft);
    setEditing(null);
  }

  function applySuggestion() {
    const next = suggest(transactions, spendable, month);
    const run = () => setBudgets(next);
    if (Object.keys(budgets).length) confirm('Thay hạn mức hiện tại?', 'Các hạn mức đang đặt sẽ được thay bằng gợi ý mới.', run, 'Thay');
    else run();
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
      <Text style={styles.h1}>Kế hoạch thu chi</Text>
      <Text style={styles.sub}>{monthLabel(month)} · lặp lại hằng tháng</Text>

      <Card style={{ marginTop: 16, paddingVertical: 6 }}>
        <Pressable style={styles.row} onPress={() => open({ key: 'income', title: 'Thu nhập dự kiến', hint: 'Tổng thu nhập bạn dự tính mỗi tháng.', value: plan.income })}>
          <View style={[styles.dot, { backgroundColor: C.primarySoft }]}><Icon name="trending-up" size={18} color={C.primary} /></View>
          <Text style={styles.rowLabel}>Thu nhập dự kiến</Text>
          <Text style={styles.rowValue}>{plan.income ? fmt(plan.income) : 'Đặt'}</Text>
          <Icon name="chevron-forward" size={16} color={C.faint} />
        </Pressable>
        <View style={styles.sep} />
        <Pressable style={styles.row} onPress={() => open({ key: 'savings', title: 'Mục tiêu tiết kiệm', hint: 'Số tiền bạn muốn để dành mỗi tháng.', value: plan.savings })}>
          <View style={[styles.dot, { backgroundColor: C.warnSoft }]}><Icon name="wallet" size={18} color={C.warn} /></View>
          <Text style={styles.rowLabel}>Mục tiêu tiết kiệm</Text>
          <Text style={styles.rowValue}>{plan.savings ? fmt(plan.savings) : 'Đặt'}</Text>
          <Icon name="chevron-forward" size={16} color={C.faint} />
        </Pressable>
      </Card>

      {plan.income > 0 ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={{ color: C.sub, fontSize: 13 }}>Có thể chi trong tháng</Text>
          <Text style={{ fontSize: 26, fontWeight: '500', color: C.ink, marginTop: 2 }}>{fmt(spendable)}</Text>
          <View style={{ marginTop: 12, marginBottom: 8 }}>
            <ProgressBar value={spendable ? stats.expense / spendable : 0} color={stats.expense > spendable ? C.expense : C.primary} />
          </View>
          <Text style={{ color: C.sub, fontSize: 13, lineHeight: 19 }}>
            Đã chi {fmt(stats.expense)} · {stats.expense > spendable ? `vượt ${fmt(stats.expense - spendable)}` : `còn ${fmt(spendable - stats.expense)}`}
          </Text>
          {f !== null ? (
            <Text style={{ color: f > spendable ? C.expense : C.sub, fontSize: 13, lineHeight: 19, marginTop: 2 }}>
              Dự báo cuối tháng: {fmt(f)}{f > spendable ? ` — vượt ${fmtShort(f - spendable)}` : ''}
            </Text>
          ) : null}
          {allocated > 0 ? (
            <Text style={{ color: allocated > spendable ? C.warn : C.sub, fontSize: 13, lineHeight: 19, marginTop: 2 }}>
              Đã phân bổ hạn mức: {fmt(allocated)}{allocated > spendable ? ` — nhiều hơn số có thể chi ${fmtShort(allocated - spendable)}` : ''}
            </Text>
          ) : null}
        </Card>
      ) : (
        <Card style={{ marginTop: 12, flexDirection: 'row', gap: 10 }}>
          <Icon name="bulb-outline" size={20} color={C.warn} />
          <Text style={{ flex: 1, color: C.sub, lineHeight: 20 }}>Đặt thu nhập dự kiến để app tính số tiền có thể chi và gợi ý hạn mức cho từng danh mục.</Text>
        </Card>
      )}

      <SectionTitle
        right={
          spendable > 0 ? (
            <Pressable onPress={applySuggestion} hitSlop={12} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              <Icon name="sparkles" size={14} color={C.primary} />
              <Text style={{ color: C.primary, fontWeight: '500', fontSize: 13 }}>Gợi ý phân bổ</Text>
            </Pressable>
          ) : null
        }
      >
        Hạn mức theo danh mục
      </SectionTitle>
      <Card style={{ paddingVertical: 6 }}>
        {EXPENSE_CATS.map((c, i) => {
          const limit = budgets[c.id] ?? 0;
          const spent = spentOf(c.id);
          const ratio = limit ? spent / limit : 0;
          return (
            <View key={c.id}>
              {i > 0 ? <View style={styles.sep} /> : null}
              <Pressable
                style={styles.budget}
                onPress={() => open({ key: c.id, title: `Hạn mức ${c.name}`, hint: 'Số tiền tối đa cho danh mục này mỗi tháng. Để 0 nếu không giới hạn.', value: limit })}
              >
                <CatIcon id={c.id} size={36} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '500', color: C.ink }}>{c.name}</Text>
                    <Text style={{ fontSize: 13.5, color: limit && ratio > 1 ? C.expense : C.ink, fontWeight: '500', fontVariant: ['tabular-nums'] }}>
                      {fmtShort(spent)}{limit ? ` / ${fmtShort(limit)}` : ''}
                    </Text>
                  </View>
                  {limit ? (
                    <>
                      <View style={{ marginVertical: 6 }}>
                        <ProgressBar value={ratio} height={6} color={ratio > 1 ? C.expense : ratio >= 0.8 ? C.warn : cat(c.id).color} />
                      </View>
                      <Text style={{ fontSize: 12, color: ratio > 1 ? C.expense : C.sub }}>
                        {ratio > 1 ? `Vượt ${fmt(spent - limit)}` : `Còn ${fmt(limit - spent)}`}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ fontSize: 12, color: C.faint, marginTop: 3 }}>Chưa đặt hạn mức</Text>
                  )}
                </View>
              </Pressable>
            </View>
          );
        })}
      </Card>

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(null)} />
          <View style={styles.sheet}>
            <Text style={{ fontSize: 17, fontWeight: '500', color: C.ink }}>{editing?.title}</Text>
            <Text style={{ color: C.sub, marginTop: 4, lineHeight: 20 }}>{editing?.hint}</Text>
            <View style={{ marginVertical: 22, alignItems: 'center' }}>
              <AmountInput value={draft} onChange={setDraft} autoFocus />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Hủy" kind="soft" onPress={() => setEditing(null)} style={{ flex: 1 }} />
              <Button label="Lưu" onPress={saveEdit} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = themed(() => StyleSheet.create({
  h1: { fontSize: 24, fontWeight: '500', color: C.ink, paddingHorizontal: 4 },
  sub: { color: C.sub, marginTop: 2, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowLabel: { flex: 1, fontSize: 15, color: C.ink, fontWeight: '500' },
  rowValue: { fontSize: 15, color: C.primary, fontWeight: '500' },
  dot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.line },
  budget: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,24,22,0.45)', justifyContent: 'center', padding: 22 },
  sheet: { backgroundColor: C.card, borderRadius: R.lg, padding: 20 },
}));
