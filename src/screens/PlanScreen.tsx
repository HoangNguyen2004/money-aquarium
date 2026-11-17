import { GoalsPanel } from '../components/GoalsPanel';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { C, R, themed } from '../theme';
import { EXPENSE_CATS, cat } from '../categories';
import { addMonths, fmt, fmtShort, monthKey, monthLabel, today } from '../format';
import { setBudget, setBudgets, setPlan, useStore } from '../store';
import { forecast, monthStats } from '../report';
import type { Transaction } from '../types';
import { AmountInput, Button, Card, CatIcon, DISPLAY, Icon, ProgressBar, SectionTitle, confirm, Text } from '../components/ui';

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

  const now = new Date();
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
  const leftover = plan.income - stats.expense;
  const savedRatio = plan.savings > 0 && plan.income > 0 ? Math.max(0, leftover) / plan.savings : 0;
  const tone = (ratio: number) => (ratio > 1 ? C.expense : ratio >= 0.8 ? C.warn : C.accent);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      <Text style={styles.h1}>Kế hoạch thu chi</Text>
      <Text style={styles.sub}>{monthLabel(month)} · lặp lại hằng tháng</Text>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        <Pressable style={[styles.stat, { flex: 1 }]} onPress={() => open({ key: 'income', title: 'Thu nhập dự kiến', hint: 'Tổng thu nhập bạn dự tính mỗi tháng.', value: plan.income })}>
          <View style={styles.statTop}>
            <View style={[styles.iconBox, { backgroundColor: C.aquaSoft }]}><Icon name="cash-outline" size={20} color={C.primary} /></View>
            {plan.income ? <View style={styles.chip}><Icon name="checkmark" size={12} color={C.primary} /><Text style={styles.chipText}>Đã đặt</Text></View> : null}
          </View>
          <Text style={styles.statLabel}>Thu nhập dự kiến</Text>
          <Text style={styles.statValue}>{plan.income ? fmt(plan.income) : 'Đặt'}</Text>
        </Pressable>
        <Pressable style={[styles.stat, { flex: 1 }]} onPress={() => open({ key: 'savings', title: 'Mục tiêu tiết kiệm', hint: 'Số tiền bạn muốn để dành mỗi tháng.', value: plan.savings })}>
          <View style={styles.statTop}>
            <View style={[styles.iconBox, { backgroundColor: C.warnSoft }]}><Icon name="wallet-outline" size={20} color={C.warn} /></View>
            {plan.savings && plan.income ? <Text style={styles.pct}>{Math.round(Math.min(1, savedRatio) * 100)}%</Text> : null}
          </View>
          <Text style={styles.statLabel}>Mục tiêu tiết kiệm</Text>
          <Text style={[styles.statValue, { color: C.primary }]}>{plan.savings ? fmt(plan.savings) : 'Đặt'}</Text>
          {plan.savings && plan.income ? (
            <>
              <View style={{ marginTop: 8 }}><ProgressBar value={savedRatio} height={6} color={C.accent} /></View>
              <Text style={styles.statNote}>Đang dư: {fmtShort(Math.max(0, leftover))}</Text>
            </>
          ) : null}
        </Pressable>
      </View>

      {plan.income > 0 ? (
        <View style={[styles.tip, { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={[styles.iconBox, { backgroundColor: C.warnSoft, width: 36, height: 36 }]}><Icon name="bulb-outline" size={18} color={C.warn} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: DISPLAY, fontWeight: '700', fontSize: 14, color: C.ink }}>Có thể chi {fmt(spendable)}</Text>
              <ProgressBarRow ratio={spendable ? stats.expense / spendable : 0} tone={tone} />
            </View>
          </View>
          <Text style={styles.tipText}>
            Đã chi {fmt(stats.expense)} · {stats.expense > spendable ? `vượt ${fmt(stats.expense - spendable)}` : `còn ${fmt(spendable - stats.expense)}`}
          </Text>
          {f !== null ? (
            <Text style={[styles.tipText, f > spendable && { color: C.expense }]}>
              Dự báo cuối tháng: {fmt(f)}{f > spendable ? ` — vượt ${fmtShort(f - spendable)}` : ''}
            </Text>
          ) : null}
          {allocated > 0 ? (
            <Text style={[styles.tipText, allocated > spendable && { color: C.warn }]}>
              Đã phân bổ hạn mức: {fmt(allocated)}{allocated > spendable ? ` — nhiều hơn số có thể chi ${fmtShort(allocated - spendable)}` : ''}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.tip}>
          <View style={[styles.iconBox, { backgroundColor: C.warnSoft, width: 36, height: 36 }]}><Icon name="bulb-outline" size={18} color={C.warn} /></View>
          <Text style={[styles.tipText, { flex: 1, marginTop: 0 }]}>Đặt thu nhập dự kiến để app tính số tiền có thể chi và gợi ý hạn mức cho từng danh mục.</Text>
        </View>
      )}

      <SectionTitle
        right={
          spendable > 0 ? (
            <Pressable onPress={applySuggestion} hitSlop={12} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              <Icon name="sparkles" size={14} color={C.primary} />
              <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>Gợi ý phân bổ</Text>
            </Pressable>
          ) : null
        }
      >
        Hạn mức theo danh mục{'  '}<Text style={styles.count}> {EXPENSE_CATS.length} </Text>
      </SectionTitle>
      <View style={{ gap: 12 }}>
        {EXPENSE_CATS.map((c) => {
          const limit = budgets[c.id] ?? 0;
          const spent = spentOf(c.id);
          const ratio = limit ? spent / limit : 0;
          const color = tone(ratio);
          return (
            <Pressable
              key={c.id}
              style={styles.budget}
              onPress={() => open({ key: c.id, title: `Hạn mức ${c.name}`, hint: 'Số tiền tối đa cho danh mục này mỗi tháng. Để 0 nếu không giới hạn.', value: limit })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <CatIcon id={c.id} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.catName}>{c.name}</Text>
                  <Text style={styles.catSub}>{limit ? `Còn ${daysLeft} ngày · ${ratio > 1 ? `Vượt ${fmtShort(spent - limit)}` : `Dư ${fmtShort(limit - spent)}`}` : 'Chưa đặt hạn mức'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.catSpent, { color: limit && ratio >= 0.8 ? color : C.ink }]}>{fmt(spent)}</Text>
                  {limit ? <Text style={styles.catSub}>/ {fmt(limit)}</Text> : null}
                </View>
              </View>
              {limit ? (
                <>
                  <View style={{ marginTop: 12 }}><ProgressBar value={ratio} height={8} color={color} /></View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={[styles.catSub, { color }]}>{Math.round(ratio * 100)}% {ratio > 1 ? 'đã vượt' : ratio >= 0.8 ? 'đã dùng' : 'mức cho phép'}</Text>
                    <Text style={styles.catSub}>{ratio > 1 ? 'Vượt hạn mức' : ratio >= 0.8 ? 'Gần hết' : 'Tiến độ tốt'}</Text>
                  </View>
                </>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <GoalsPanel />

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

function ProgressBarRow({ ratio, tone }: { ratio: number; tone: (r: number) => string }) {
  return <View style={{ marginTop: 6 }}><ProgressBar value={ratio} height={6} color={tone(ratio)} /></View>;
}

const styles = themed(() => StyleSheet.create({
  h1: { fontFamily: DISPLAY, fontSize: 26, fontWeight: '700', color: C.ink },
  sub: { color: C.sub, marginTop: 2, fontSize: 13 },
  stat: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, boxShadow: `0 4px 16px -4px ${C.shadow}` },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, minHeight: 36 },
  iconBox: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: '600', color: C.primary },
  pct: { fontSize: 12, fontWeight: '700', color: C.sub },
  statLabel: { fontSize: 12, color: C.sub },
  statValue: { fontFamily: DISPLAY, fontSize: 20, fontWeight: '700', color: C.ink, marginTop: 2 },
  statNote: { fontSize: 11, color: C.sub, marginTop: 6 },
  tip: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: C.tint, borderRadius: R.lg, padding: 16, marginTop: 14 },
  tipText: { fontSize: 13, lineHeight: 20, color: C.sub, marginTop: 6 },
  count: { fontSize: 12, fontWeight: '600', color: C.sub, backgroundColor: C.line },
  budget: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, boxShadow: `0 4px 16px -4px ${C.shadow}` },
  catName: { fontFamily: DISPLAY, fontSize: 16, fontWeight: '700', color: C.ink },
  catSub: { fontSize: 12, color: C.sub, marginTop: 2 },
  catSpent: { fontFamily: DISPLAY, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,24,22,0.45)', justifyContent: 'center', padding: 22 },
  sheet: { backgroundColor: C.card, borderRadius: R.lg, padding: 20 },
}));
