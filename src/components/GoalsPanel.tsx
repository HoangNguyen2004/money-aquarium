import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { C, R } from '../theme';
import { addSavingGoal, contributeToGoal, removeGoalContribution, updateSavingGoal, useStore } from '../store';
import { contributed, goalProgress } from '../savings';
import { fmt, shortDate, uid } from '../format';
import { ITEMS } from '../game/rules';
import { Icon as FishIcon } from '../game/view/kit';
import type { AssetId } from '../game/view/assets';
import type { SavingGoal } from '../types';
import { AmountInput, Button, Card, ProgressBar, SectionTitle, Text, TextInput, confirm } from './ui';

export function GoalsPanel() {
  const { goals, game } = useStore();
  const eventId = useRef(uid());
  const [form, setForm] = useState<'create' | 'contribute' | 'edit' | null>(null);
  const [selected, setSelected] = useState<SavingGoal | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(0);
  const [deadline, setDeadline] = useState('');
  const [fishId, setFishId] = useState('');
  const [error, setError] = useState('');
  const owned = ITEMS.filter((i) => i.fish && game.items.includes(i.id));
  const available = owned.filter((i) => !goals.some((g) => g.fishId === i.id && g.id !== selected?.id));
  function close() { setForm(null); setError(''); }
  function save() {
    const why = form === 'contribute' && selected ? contributeToGoal(selected.id, amount, eventId.current)
      : form === 'edit' && selected ? updateSavingGoal(selected.id, name, amount, fishId, deadline)
      : addSavingGoal(name, amount, fishId, deadline);
    if (why) { setError(why); return; }
    close();
  }
  return <>
    <SectionTitle right={<Button label="Tạo mục tiêu" kind="soft" onPress={() => { setSelected(null); setName(''); setAmount(0); setDeadline(''); setFishId(owned.find((i) => !goals.some((g) => g.fishId === i.id))?.id ?? ''); setError(''); setForm('create'); }} />}>Quỹ tiết kiệm thực tế</SectionTitle>
    <Text style={{ color: C.sub, lineHeight: 20, marginBottom: 12 }}>Mỗi mục tiêu có một cư dân đồng hành. Chỉ ghi nhận khoản bạn đã chuyển vào quỹ; tiền còn dư trong ngân sách chưa được tính là tiết kiệm.</Text>
    {!goals.length ? <Card><Text style={{ color: C.sub, lineHeight: 21 }}>Bạn chưa có mục tiêu. Bắt đầu với một khoản phù hợp, không cần khai báo thu nhập.</Text></Card> : null}
    {goals.map((goal) => {
      const total = contributed(goal), progress = goalProgress(goal);
      return <Card key={goal.id} style={{ marginBottom: 12, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <FishIcon id={goal.fishId as AssetId} size={52} />
          <View style={{ flex: 1 }}><Text style={{ fontSize: 16, fontWeight: '500' }}>{goal.name}</Text><Text style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>{game.names[goal.fishId] || ITEMS.find((i) => i.id === goal.fishId)?.name}{goal.deadline ? ` · Hạn ${shortDate(goal.deadline)}` : ''}</Text></View>
          <Text style={{ fontSize: 20, color: C.primary }}>{Math.round(progress * 100)}%</Text>
        </View>
        <ProgressBar value={progress} height={6} />
        <Text style={{ color: C.sub, fontSize: 13 }}>Đã góp {fmt(total)} / {fmt(goal.target)}</Text>
        {progress >= 1 ? <Text style={{ color: C.primary }}>Bạn đã hoàn thành mục tiêu này.</Text> : <Text style={{ color: C.sub, fontSize: 12 }}>Còn {fmt(Math.max(0, goal.target - total))} · Ngoại hình đổi ở mốc 25%, 50%, 100%</Text>}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Góp thêm" onPress={() => { eventId.current=uid(); setSelected(goal); setAmount(0); setError(''); setForm('contribute'); }} style={{ flex: 1 }} />
          <Button label="Sửa mục tiêu" kind="soft" onPress={() => { setSelected(goal); setName(goal.name); setAmount(goal.target); setFishId(goal.fishId); setDeadline(goal.deadline); setError(''); setForm('edit'); }} />
        </View>
        {goal.contributions.slice(-3).reverse().map((entry) => <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, color: C.sub, fontSize: 12 }}>{shortDate(entry.date)} · +{fmt(entry.amount)}</Text>
          <Button label="Hoàn tác" kind="soft" onPress={() => confirm('Hoàn tác khoản ghi nhận?', 'Chỉ sửa sổ mục tiêu trong app, không chuyển tiền ngân hàng.', () => removeGoalContribution(goal.id, entry.id), 'Hoàn tác')} />
        </View>)}
      </Card>;
    })}
    <Modal visible={form !== null} transparent animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: '#071A2699', justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Đóng mục tiêu" style={{ position: 'absolute', width: '100%', height: '100%' }} onPress={close} />
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: '88%', backgroundColor: C.card, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg }} contentContainerStyle={{ padding: 22, paddingBottom: 38, gap: 14 }}>
          <Text style={{ fontSize: 20, fontWeight: '500' }}>{form === 'contribute' ? `Góp vào ${selected?.name}` : form === 'edit' ? 'Sửa mục tiêu' : 'Mục tiêu mới'}</Text>
          {form !== 'contribute' ? <>
            <Text>Tên mục tiêu</Text><TextInput accessibilityLabel="Tên mục tiêu" value={name} onChangeText={setName} placeholder="Ví dụ: Quỹ dự phòng" maxLength={60} style={{ padding: 14, borderWidth: 1, borderColor: C.line, borderRadius: R.md }} />
            <Text>Số tiền cần tích lũy</Text>
          </> : <Text style={{ color: C.sub, lineHeight: 21 }}>Hãy chuyển tiền vào quỹ của bạn trước, rồi ghi nhận số tiền tại đây. App không thực hiện chuyển khoản và không tạo khoản chi tiêu.</Text>}
          <AmountInput value={amount} onChange={setAmount} />
          {form !== 'contribute' ? <>
            <Text>Hạn hoàn thành (không bắt buộc)</Text><TextInput accessibilityLabel="Hạn mục tiêu" placeholder="YYYY-MM-DD" value={deadline} onChangeText={setDeadline} maxLength={10} style={{ padding: 14, borderWidth: 1, borderColor: C.line, borderRadius: R.md }} />
            <Text>Cư dân đồng hành</Text>
            {!available.length ? <Text style={{ color: C.sub }}>Tạo hồ hoặc đón thêm một cư dân chưa gắn mục tiêu ở tab Hồ cá.</Text> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{available.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: fishId === item.id }} accessibilityLabel={`Đồng hành ${item.name}`} onPress={() => setFishId(item.id)} style={{ padding: 10, borderWidth: 1, borderRadius: R.md, borderColor: fishId === item.id ? C.primary : C.line, alignItems: 'center', minWidth: 85 }}><FishIcon id={item.id as AssetId} size={40} /><Text style={{ fontSize: 12 }}>{item.name}</Text></Pressable>)}</View>}
          </> : null}
          {error ? <Text accessibilityRole="alert" style={{ color: C.expense }}>{error}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 10 }}><Button label="Hủy" kind="soft" onPress={close} style={{ flex: 1 }} /><Button label={form === 'contribute' ? 'Đã chuyển, ghi nhận' : 'Lưu mục tiêu'} onPress={save} disabled={form !== 'contribute' && !fishId} style={{ flex: 2 }} /></View>
        </ScrollView>
      </View>
    </Modal>
  </>;
}
