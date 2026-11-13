import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { C, R, themed } from '../theme';
import { EXPENSE_CATS, INCOME_CATS, cat } from '../categories';
import { addDays, dayLabel, shortDate, today } from '../format';
import type { Transaction, TxType } from '../types';
import { addTransaction, deleteTransaction, updateTransaction, useStore } from '../store';
import { pickImage } from '../images';
import { AiError, scanReceipt } from '../ai';
import { readReceiptOffline } from '../ocr';
import { AmountInput, Button, Icon, confirm, Text, TextInput } from './ui';

export type ScanSource = 'camera' | 'library';

interface Props {
  visible: boolean;
  editing?: Transaction | null;
  startScan?: ScanSource | null;
  onClose: () => void;
}

type Banner = { kind: 'ok' | 'warn'; text: string } | null;

export function TransactionForm({ visible, editing, startScan, onClose }: Props) {
  const { hasKey } = useStore();
  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState('food');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  useEffect(() => {
    if (!visible) return;
    setType(editing?.type ?? 'expense');
    setAmount(editing?.amount ?? 0);
    setCategory(editing?.category ?? 'food');
    setNote(editing?.note ?? '');
    setDate(editing?.date ?? today());
    setPhotoUri(editing?.photoUri);
    setScanned(false);
    setScanning(false);
    setBanner(null);
    if (!editing && startScan) scan(startScan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  async function scan(source: ScanSource) {
    const img = await pickImage(source);
    if (!img) return;
    setPhotoUri(img.uri);
    setScanning(true);
    setBanner(null);
    try {
      const r = hasKey ? await scanReceipt(img.base64, img.mimeType) : await readReceiptOffline(img.uri);
      if (!r.readable || !(r.total > 0)) {
        setBanner({ kind: 'warn', text: 'Không đọc được số tiền từ ảnh này. Bạn nhập tay giúp nhé.' });
      } else {
        setType(r.type);
        setAmount(r.total);
        setCategory(r.category);
        setNote(r.note || r.merchant);
        setDate(r.date);
        setScanned(true);
        setBanner({ kind: 'ok', text: hasKey ? 'AI đã điền từ hóa đơn. Kiểm tra lại rồi bấm Lưu.' : 'Đã đọc trên máy, có thể chưa chính xác. Kiểm tra kỹ số tiền rồi bấm Lưu.' });
      }
    } catch (e) {
      setBanner({ kind: 'warn', text: e instanceof AiError ? e.message : 'Không đọc được hóa đơn. Bạn nhập tay giúp nhé.' });
    } finally {
      setScanning(false);
    }
  }

  function changeType(t: TxType) {
    setType(t);
    if (cat(category).type !== t) setCategory(t === 'expense' ? 'food' : 'salary');
  }

  function save() {
    if (!(amount > 0)) return;
    // Bản web không lưu ảnh (data URI quá lớn so với bộ nhớ trình duyệt).
    const photo = Platform.OS === 'web' ? undefined : photoUri;
    const finalNote = note.trim() || cat(category).name;
    if (editing) updateTransaction(editing.id, { type, amount, category, note: finalNote, date, photoUri: photo });
    else addTransaction({ type, amount, category, note: finalNote, date, photoUri: photo, source: scanned ? 'scan' : 'manual' });
    onClose();
  }

  function remove() {
    if (!editing) return;
    confirm('Xóa giao dịch?', `${editing.note} sẽ bị xóa khỏi sổ.`, () => {
      deleteTransaction(editing.id);
      onClose();
    });
  }

  const cats = type === 'expense' ? EXPENSE_CATS : INCOME_CATS;
  const accent = type === 'expense' ? C.expense : C.income;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}><Text style={styles.cancel}>Hủy</Text></Pressable>
          <Text style={styles.title}>{editing ? 'Sửa giao dịch' : 'Thêm giao dịch'}</Text>
          <Pressable onPress={save} hitSlop={12} disabled={!(amount > 0)}>
            <Text style={[styles.cancel, { color: amount > 0 ? C.primary : C.faint, fontWeight: '500' }]}>Lưu</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.segment}>
            {(['expense', 'income'] as const).map((t) => (
              <Pressable key={t} onPress={() => changeType(t)} style={[styles.segItem, type === t && { backgroundColor: C.card }]}>
                <Text style={{ fontWeight: '500', color: type === t ? (t === 'expense' ? C.expense : C.income) : C.sub }}>
                  {t === 'expense' ? 'Khoản chi' : 'Khoản thu'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.amountBox}>
            {scanning ? (
              <View style={{ alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                <ActivityIndicator color={C.primary} />
                <Text style={{ color: C.sub }}>Đang đọc hóa đơn…</Text>
              </View>
            ) : (
              <AmountInput value={amount} onChange={setAmount} color={accent} autoFocus={!editing && !startScan} />
            )}
          </View>

          {banner ? (
            <View style={[styles.banner, { backgroundColor: banner.kind === 'ok' ? C.primarySoft : C.warnSoft }]}>
              <Icon name={banner.kind === 'ok' ? 'sparkles' : 'alert-circle'} size={18} color={banner.kind === 'ok' ? C.primary : C.warn} />
              <Text style={{ flex: 1, color: C.ink, fontSize: 13.5, lineHeight: 19 }}>{banner.text}</Text>
            </View>
          ) : null}

          {!editing ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Button label="Chụp hóa đơn" icon="camera" kind="soft" onPress={() => scan('camera')} disabled={scanning} style={{ flex: 1 }} />
              <Button label="Chọn ảnh" icon="image" kind="soft" onPress={() => scan('library')} disabled={scanning} style={{ flex: 1 }} />
            </View>
          ) : null}

          {photoUri ? (
            <View style={styles.photoRow}>
              <Image source={{ uri: photoUri }} style={styles.photo} />
              <Text style={{ flex: 1, color: C.sub, fontSize: 13 }}>Ảnh hóa đơn đính kèm</Text>
              <Pressable onPress={() => setPhotoUri(undefined)} hitSlop={12}><Icon name="close-circle" size={22} color={C.faint} /></Pressable>
            </View>
          ) : null}

          <Text style={styles.label}>Danh mục</Text>
          <View style={styles.grid}>
            {cats.map((c) => {
              const on = c.id === category;
              return (
                <Pressable key={c.id} onPress={() => setCategory(c.id)} style={[styles.chip, on && { backgroundColor: c.color, borderColor: c.color }]}>
                  <Icon name={c.icon} size={16} color={on ? '#fff' : c.color} />
                  <Text style={{ color: on ? '#fff' : C.ink, fontWeight: '500', fontSize: 13.5 }}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Ghi chú</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Ví dụ: Ăn trưa với đồng nghiệp"
            placeholderTextColor={C.faint}
            style={styles.input}
            maxLength={80}
          />

          <Text style={styles.label}>Ngày</Text>
          <View style={styles.dateRow}>
            <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={12} style={styles.dateBtn} accessibilityLabel="Ngày trước">
              <Icon name="chevron-back" size={18} color={C.sub} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontWeight: '500', color: C.ink, fontSize: 15 }}>{dayLabel(date)}</Text>
              <Text style={{ color: C.sub, fontSize: 12 }}>{shortDate(date)}</Text>
            </View>
            <Pressable onPress={() => setDate(addDays(date, 1))} disabled={date >= today()} hitSlop={12} style={styles.dateBtn} accessibilityLabel="Ngày sau">
              <Icon name="chevron-forward" size={18} color={date >= today() ? C.line : C.sub} />
            </Pressable>
          </View>

          <Button label={editing ? 'Lưu thay đổi' : 'Lưu giao dịch'} onPress={save} disabled={!(amount > 0) || scanning} style={{ marginTop: 24 }} />
          {editing ? <Button label="Xóa giao dịch" kind="danger" icon="trash" onPress={remove} style={{ marginTop: 10 }} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = themed(() => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: Platform.OS === 'android' ? 18 : 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  title: { fontSize: 16, fontWeight: '500', color: C.ink },
  cancel: { fontSize: 16, color: C.sub },
  segment: { flexDirection: 'row', backgroundColor: C.line, borderRadius: R.md, padding: 4 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: R.md - 4 },
  amountBox: { backgroundColor: C.card, borderRadius: R.lg, paddingVertical: 22, paddingHorizontal: 18, marginTop: 14, alignItems: 'center', minHeight: 90, justifyContent: 'center' },
  banner: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: R.md, marginTop: 12 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R.md, padding: 10, marginTop: 12 },
  photo: { width: 48, height: 48, borderRadius: R.sm, backgroundColor: C.line },
  label: { fontSize: 13, fontWeight: '500', color: C.sub, marginTop: 20, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.card },
  input: { backgroundColor: C.card, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.ink },
  dateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: 8 },
  dateBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
}));
