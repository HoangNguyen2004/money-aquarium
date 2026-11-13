import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Geist_400Regular, Geist_500Medium, useFonts } from '@expo-google-fonts/geist';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, themed } from './src/theme';
import { monthKey, today } from './src/format';
import { loadStore, useStore } from './src/store';
import { backgroundUri } from './src/images';
import type { Transaction } from './src/types';
import { Icon, Text } from './src/components/ui';
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
  { id: 'report', label: 'Báo cáo', icon: 'pie-chart' },
  { id: 'plan', label: 'Kế hoạch', icon: 'flag' },
  { id: 'aquarium', label: 'Hồ cá', icon: 'fish' },
];

function Main() {
  const insets = useSafeAreaInsets();
  const { ready, background, game } = useStore();
  const [fontsLoaded, fontsError] = useFonts({ Geist_400Regular, Geist_500Medium });
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
      <View style={{ flex: 1 }}>
        {bot ? <BotScreen onEdit={openEdit} onClose={() => setBot(false)} /> : null}
        {!bot && tab === 'home' ? <HomeScreen month={month} onMonth={setMonth} onAdd={openAdd} onEdit={openEdit} onSettings={() => setSettings(true)} onCafe={() => setTab('aquarium')} /> : null}
        {!bot && tab === 'report' ? <ReportScreen month={month} onMonth={setMonth} /> : null}
        {!bot && tab === 'aquarium' && game.enabled ? <AquariumScreen onAdd={() => setBot(true)} onPlan={() => setTab('plan')} /> : null}
        {!bot && tab === 'plan' ? <PlanScreen /> : null}
      </View>

      {!bot && tab !== 'aquarium' ? (
        <Pressable style={[styles.fab, { bottom: 74 + insets.bottom }]} onPress={() => setBot(true)} accessibilityLabel="Mở trợ lý để ghi giao dịch">
          <Icon name="add" size={30} color="#fff" />
        </Pressable>
      ) : null}

      <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {TABS.filter((t) => t.id !== 'aquarium' || game.enabled).map((t) => {
          const on = t.id === tab && !bot;
          return (
            <Pressable key={t.id} style={styles.tab} onPress={() => { setTab(t.id); setBot(false); }} accessibilityRole="tab" accessibilityLabel={t.label}>
              <Icon name={on ? t.icon : `${t.icon}-outline`} size={22} color={on ? C.primary : C.sub} />
              <Text style={{ fontSize: 11, fontWeight: '500', color: on ? C.primary : C.sub, marginTop: 3 }}>{t.label}</Text>
            </Pressable>
          );
        })}
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
  tabs: { flexDirection: 'row', backgroundColor: C.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
