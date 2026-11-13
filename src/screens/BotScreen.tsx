import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { C, R, themed } from '../theme';
import { addTransaction, pushChat, clearChat, useStore } from '../store';
import { localReply } from '../localBot';
import { readReceiptOffline } from '../ocr';
import { fmt } from '../format';
import { AiError, askAssistant, resetAssistant } from '../ai';
import { pickImage, type Picked } from '../images';
import type { ChatMsg, Transaction } from '../types';
import { Icon, TxRow, confirm, Text, TextInput } from '../components/ui';

const SUGGESTIONS = ['Cà phê 35k', 'Hôm qua đổ xăng 80k', 'Tháng này tiêu bao nhiêu?', 'Ngân sách ăn uống 3tr'];

export function BotScreen({ onEdit, onClose }: { onEdit: (tx: Transaction) => void; onClose: () => void }) {
  const { chat, transactions, hasKey } = useStore();
  const [text, setText] = useState('');
  const [image, setImage] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [chat.length, busy]);

  async function send(raw?: string) {
    const msg = (raw ?? text).trim();
    const img = image;
    if ((!msg && !img) || busy) return;
    setText('');
    setImage(null);
    pushChat({ role: 'user', text: msg, imageUri: Platform.OS === 'web' ? undefined : img?.uri });

    if (!hasKey) {
      if (img) {
        setBusy(true);
        try {
          const r = await readReceiptOffline(img.uri);
          if (r.readable) {
            const tx = addTransaction({ type: r.type, amount: r.total, category: r.category, note: r.note, date: r.date, photoUri: Platform.OS === 'web' ? undefined : img.uri, source: 'scan' });
            pushChat({ role: 'bot', text: `Mình đọc trên máy được ${fmt(r.total)}. Số này có thể chưa chính xác, bạn chạm vào để sửa nếu sai.`, txIds: [tx.id] });
          } else {
            pushChat({ role: 'bot', text: 'Mình không đọc được số tiền từ ảnh này. Bạn nhắn kiểu “cà phê 35k” giúp nhé.' });
          }
        } catch (e) {
          pushChat({ role: 'bot', text: e instanceof AiError ? e.message : 'Mình không đọc được ảnh này.' });
        } finally {
          setBusy(false);
        }
        if (!msg) return;
      }
      pushChat({ role: 'bot', ...localReply(msg) });
      return;
    }

    setBusy(true);
    try {
      const r = await askAssistant(msg, img ? { base64: img.base64, mimeType: img.mimeType } : undefined);
      pushChat({ role: 'bot', text: r.text, txIds: r.txIds.length ? r.txIds : undefined });
    } catch (e) {
      const txIds = (e as { txIds?: string[] }).txIds;
      const reason = e instanceof AiError ? e.message : 'Có lỗi khi gọi AI.';
      if (!img && msg && !txIds?.length) {
        // AI lỗi thì bot offline xử lý thay để không mất khoản chi của người dùng.
        const local = localReply(msg);
        pushChat({ role: 'bot', text: `${reason}\nMình xử lý bằng chế độ cơ bản: ${local.text}`, txIds: local.txIds });
      } else {
        pushChat({ role: 'bot', text: reason, txIds: txIds?.length ? txIds : undefined });
      }
    } finally {
      setBusy(false);
    }
  }

  async function attach(source: 'camera' | 'library') {
    const img = await pickImage(source);
    if (img) setImage(img);
  }

  function reset() {
    confirm('Xóa cuộc trò chuyện?', 'Các giao dịch đã ghi vẫn được giữ nguyên.', () => {
      clearChat();
      resetAssistant();
    });
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={8}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12} style={{ marginRight: 12 }} accessibilityLabel="Đóng trợ lý">
          <Icon name="chevron-back" size={24} color={C.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Trợ lý</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: hasKey ? C.primary : C.warn }} />
            <Text style={{ color: C.sub, fontSize: 12.5 }}>{hasKey ? 'Chế độ AI — hiểu câu tự nhiên và ảnh hóa đơn' : 'Chế độ cơ bản — không cần mạng'}</Text>
          </View>
        </View>
        {chat.length ? (
          <Pressable onPress={reset} hitSlop={12} accessibilityLabel="Xóa cuộc trò chuyện">
            <Icon name="trash-outline" size={20} color={C.sub} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingBottom: 12, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {chat.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 30 }}>
            <View style={styles.avatar}><Icon name="chatbubble-ellipses" size={26} color={C.primary} /></View>
            <Text style={{ fontSize: 17, fontWeight: '500', color: C.ink, marginTop: 14 }}>Nhắn là ghi</Text>
            <Text style={{ color: C.sub, textAlign: 'center', marginTop: 6, lineHeight: 21, maxWidth: 290 }}>
              Kể cho mình khoản bạn vừa chi hoặc thu, mình ghi vào sổ ngay. Hỏi mình về chi tiêu cũng được.
            </Text>
          </View>
        ) : (
          chat.map((m) => <Bubble key={m.id} msg={m} transactions={transactions} onEdit={onEdit} />)
        )}
        {busy ? (
          <View style={[styles.bubble, styles.bot, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={{ color: C.sub }}>Đang nghĩ…</Text>
          </View>
        ) : null}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }} keyboardShouldPersistTaps="handled">
        {SUGGESTIONS.map((s) => (
          <Pressable key={s} style={styles.sugg} onPress={() => send(s)} disabled={busy}>
            <Text style={{ color: C.primary, fontWeight: '500', fontSize: 13 }}>{s}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {image ? (
        <View style={styles.attach}>
          <Image source={{ uri: image.uri }} style={{ width: 44, height: 44, borderRadius: R.sm }} />
          <Text style={{ flex: 1, color: C.sub, fontSize: 13 }}>Ảnh hóa đơn sẽ gửi kèm</Text>
          <Pressable onPress={() => setImage(null)} hitSlop={12}><Icon name="close-circle" size={22} color={C.faint} /></Pressable>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <Pressable onPress={() => attach('camera')} hitSlop={12} style={styles.iconBtn} accessibilityLabel="Chụp hóa đơn">
          <Icon name="camera" size={22} color={C.primary} />
        </Pressable>
        <Pressable onPress={() => attach('library')} hitSlop={12} style={styles.iconBtn} accessibilityLabel="Chọn ảnh">
          <Icon name="image" size={22} color={C.primary} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Ví dụ: ăn trưa 45k"
          placeholderTextColor={C.faint}
          style={styles.input}
          onSubmitEditing={(e) => send(e.nativeEvent.text)}
          returnKeyType="send"
          submitBehavior="submit"
          accessibilityLabel="Tin nhắn"
        />
        <Pressable onPress={() => send()} disabled={busy || (!text.trim() && !image)} style={[styles.send, { opacity: busy || (!text.trim() && !image) ? 0.4 : 1 }]} accessibilityLabel="Gửi">
          <Icon name="arrow-up" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ msg, transactions, onEdit }: { msg: ChatMsg; transactions: Transaction[]; onEdit: (tx: Transaction) => void }) {
  const mine = msg.role === 'user';
  const txs = (msg.txIds ?? []).map((id) => transactions.find((t) => t.id === id));
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      {msg.imageUri ? <Image source={{ uri: msg.imageUri }} style={{ width: 150, height: 150, borderRadius: R.md, marginBottom: 4, backgroundColor: C.line }} /> : null}
      {msg.text ? (
        <View style={[styles.bubble, mine ? styles.me : styles.bot]}>
          <Text style={{ color: mine ? '#fff' : C.ink, fontSize: 15, lineHeight: 21 }}>{msg.text}</Text>
        </View>
      ) : null}
      {txs.length ? (
        <View style={styles.txCard}>
          {txs.map((t, i) =>
            t ? (
              <TxRow key={t.id} tx={t} onPress={() => onEdit(t)} />
            ) : (
              <Text key={i} style={{ color: C.faint, paddingVertical: 8, fontStyle: 'italic' }}>Giao dịch đã bị xóa</Text>
            ),
          )}
          <Text style={{ color: C.faint, fontSize: 11.5, paddingBottom: 6 }}>Chạm vào để sửa</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  h1: { fontSize: 24, fontWeight: '500', color: C.ink },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '84%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: R.md },
  me: { backgroundColor: C.primary, borderBottomRightRadius: 6 },
  bot: { backgroundColor: C.card, borderBottomLeftRadius: 6, alignSelf: 'flex-start' },
  txCard: { backgroundColor: C.card, borderRadius: R.md, paddingHorizontal: 12, paddingTop: 2, marginTop: 6, width: '84%' },
  sugg: { minHeight: 44, justifyContent: 'center', backgroundColor: C.card, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  attach: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 8, padding: 8, backgroundColor: C.card, borderRadius: R.md },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 10 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: C.card, borderRadius: R.lg, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: C.ink, minWidth: 0 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
}));
