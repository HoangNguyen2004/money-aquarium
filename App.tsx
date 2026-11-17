import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold } from '@expo-google-fonts/be-vietnam-pro';
import { PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, themed } from './src/theme';
import { monthKey, monthLabel, today } from './src/format';
import { habitStreak } from './src/game/finance';
import { loadStore, useStore } from './src/store';
import { backgroundUri } from './src/images';
import type { Transaction } from './src/types';
import { DISPLAY, Icon, Text } from './src/components/ui';
import { TransactionForm, type ScanSource } from './src/components/TransactionForm';
import { SettingsModal } from './src/components/SettingsModal';
import { HomeScreen } from './src/screens/HomeScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { PlanScreen } from './src/screens/PlanScreen';
import { BotScreen } from './src/screens/BotScreen';
import { AquariumScreen } from './src/screens/AquariumScreen';

type Tab = 'home' | 'report' | 'plan' | 'aquarium';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Tổng quan', icon: 'wallet' },
  { id: 'plan', label: 'Kế hoạch', icon: 'flag' },
  { id: 'report', label: 'Báo cáo', icon: 'pie-chart' },
  { id: 'aquarium', label: 'Hồ cá', icon: 'fish' },
];

function Main() {
  const insets = useSafeAreaInsets();
  const { ready, background, game, transactions, plan, budgets } = useStore();
  const [fontsLoaded, fontsError] = useFonts({ BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const [tab, setTab] = useState<Tab>('home');
  // Trợ lý không còn là tab: dấu cộng mở nó phủ lên tab đang xem.
  const [bot, setBot] = useState(false);
  const [month, setMonth] = useState(monthKey(today()));
  const [form, setForm] = useState<{ open: boolean; editing: Transaction | null; scan: ScanSource | null }>({ open: false, editing: null, scan: null });
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    loadStore();
  }, []);

  // Nạp phông lỗi thì vẫn vào app bằng phông hệ thống, không treo ở màn chờ.
  if (!ready || !(fontsLoaded || fontsError)) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  const streak = habitStreak(game, { transactions, plan, budgets }, today());
  const visible = TABS.filter((t) => t.id !== 'aquarium' || game.enabled);
  const tabButton = (t: (typeof TABS)[number]) => {
    const on = t.id === tab && !bot;
    return (
      <Pressable key={t.id} style={styles.tab} onPress={() => { setTab(t.id); setBot(false); }} accessibilityRole="tab" accessibilityLabel={t.label}>
        <Icon name={on ? t.icon : `${t.icon}-outline`} size={24} color={on ? C.primary : C.sub} />
        <Text style={{ fontSize: 11, fontWeight: on ? '700' : '500', color: on ? C.primary : C.sub, marginTop: 3 }}>{t.label}</Text>
      </Pressable>
    );
  };

  const openAdd = (scan?: ScanSource) => setForm({ open: true, editing: null, scan: scan ?? null });
  const openEdit = (tx: Transaction) => setForm({ open: true, editing: tx, scan: null });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {background ? (
        <>
          <Image source={{ uri: backgroundUri(background) }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
          {/* Lớp phủ màu nền để chữ nằm trực tiếp trên ảnh vẫn đọc được. */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, opacity: 0.72 }]} />
        </>
      ) : null}
      <StatusBar style={C.dark ? 'light' : 'dark'} />
      {!bot ? (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.pill}>
              <Icon name="calendar-outline" size={16} color={C.primary} />
              <Text style={styles.pillText}>{monthLabel(month)}</Text>
            </View>
            {game.enabled && streak > 0 ? (
              <View style={[styles.pill, { backgroundColor: C.warnSoft, boxShadow: 'none' as never }]}>
                <Icon name="flame" size={15} color={C.amber} />
                <Text style={[styles.pillText, { fontSize: 12, color: C.warn }]}>{streak} ngày</Text>
              </View>
            ) : null}
          </View>
          <Pressable onPress={() => setSettings(true)} hitSlop={10} style={styles.gear} accessibilityLabel="Cài đặt">
            <Icon name="settings-outline" size={22} color={C.sub} />
          </Pressable>
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        {bot ? <BotScreen onEdit={openEdit} onClose={() => setBot(false)} /> : null}
        {!bot && tab === 'home' ? <HomeScreen month={month} onMonth={setMonth} onAdd={openAdd} onEdit={openEdit} onCafe={() => setTab('aquarium')} /> : null}
        {!bot && tab === 'report' ? <ReportScreen month={month} onMonth={setMonth} /> : null}
        {!bot && tab === 'aquarium' && game.enabled ? <AquariumScreen onAdd={() => setBot(true)} onPlan={() => setTab('plan')} /> : null}
        {!bot && tab === 'plan' ? <PlanScreen /> : null}
      </View>

      <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {visible.slice(0, 2).map(tabButton)}
        <View style={styles.tab}>
          <Pressable style={styles.fab} onPress={() => setBot(true)} accessibilityRole="button" accessibilityLabel="Mở trợ lý để ghi giao dịch">
            <Icon name="add" size={32} color="#fff" />
          </Pressable>
        </View>
        {visible.slice(2).map(tabButton)}
      </View>

      <TransactionForm
        visible={form.open}
        editing={form.editing}
        startScan={form.scan}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
      />
      <SettingsModal visible={settings} onClose={() => setSettings(false)} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

const styles = themed(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 56 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, boxShadow: `0 2px 8px ${C.shadow}` },
  pillText: { fontFamily: DISPLAY, fontSize: 13, fontWeight: '600', color: C.ink },
  gear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, paddingTop: 10, boxShadow: `0 -4px 24px ${C.shadow}`, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  tab: { flex: 1, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  fab: {
    marginTop: -34,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 10px 24px -4px ${C.accent}66`,
  },
}));
