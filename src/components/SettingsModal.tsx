import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { C, R, THEMES, themed } from '../theme';
import { clearAll, loadSampleData, setBackground, setGameEnabled, setHasKey, setTheme, useStore } from '../store';
import { dropBackground, keepBackground, pickImage } from '../images';
import { removeApiKey, saveApiKey } from '../secrets';
import { resetAssistant } from '../ai';
import { Button, Card, Icon, confirm, notify, Text, TextInput } from './ui';

export function SettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { hasKey, transactions, themeId, background, game } = useStore();
  const [key, setKey] = useState('');

  useEffect(() => {
    if (visible) setKey('');
  }, [visible]);

  async function save() {
    const k = key.trim();
    if (!k) return;
    try {
      await saveApiKey(k);
      setHasKey(true);
      setKey('');
      notify('Đã lưu', 'Quét hóa đơn và trợ lý AI đã sẵn sàng.');
    } catch {
      notify('Không lưu được', 'Thử lại nhé.');
    }
  }

  async function chooseBackground() {
    const img = await pickImage('library');
    if (!img) return;
    try {
      setBackground(keepBackground(img.uri, background));
    } catch {
      notify('Không đặt được ảnh nền', 'Thử chọn ảnh khác nhé.');
    }
  }

  function remove() {
    confirm('Gỡ API key?', 'Quét hóa đơn sẽ chuyển sang đọc trên máy, trợ lý quay về chế độ cơ bản.', async () => {
      await removeApiKey();
      setHasKey(false);
      resetAssistant();
    }, 'Gỡ');
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.header}>
          <Text style={styles.title}>Cài đặt</Text>
          <Pressable onPress={onClose} hitSlop={12}><Text style={{ fontSize: 16, color: C.primary, fontWeight: '500' }}>Xong</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { marginTop: 0 }]}>Giao diện</Text>
          <Card>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {Object.entries(THEMES).map(([id, t]) => {
                const on = id === themeId;
                return (
                  <Pressable key={id} onPress={() => setTheme(id)} style={{ alignItems: 'center', gap: 6 }} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`Giao diện ${t.name}`}>
                    <View style={[styles.swatch, { backgroundColor: t.bg, borderColor: on ? C.primary : C.line, borderWidth: on ? 2 : 1 }]}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.primary }} />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: on ? '500' : '400', color: on ? C.ink : C.sub }}>{t.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Button label={background ? 'Đổi ảnh nền' : 'Chọn ảnh nền từ máy'} kind="soft" icon="image" onPress={chooseBackground} style={{ marginTop: 16 }} />
            {background ? (
              <Button label="Bỏ ảnh nền" kind="danger" icon="close" onPress={() => { dropBackground(background); setBackground(null); }} style={{ marginTop: 10 }} />
            ) : null}
            {Platform.OS === 'web' ? <Text style={styles.p}>Bản web chỉ giữ ảnh nền đến khi tải lại trang.</Text> : null}
          </Card>

          <Text style={styles.label}>Hồ cá của tôi</Text>
          <Card>
            <Text style={[styles.p, { marginTop: 0 }]}>
              Tab trò chơi: hồ cá lớn lên theo thói quen ghi chép. {game.enabled ? 'Tắt đi thì tab ẩn, hồ cá và số liệu thu chi vẫn giữ nguyên.' : 'Đang tắt. Hồ cá của bạn vẫn còn nguyên.'}
            </Text>
            <Button label={game.enabled ? 'Tắt tab Hồ cá của tôi' : 'Bật tab Hồ cá của tôi'} kind="soft" icon="fish" onPress={() => setGameEnabled(!game.enabled)} style={{ marginTop: 12 }} />
          </Card>

          <Text style={styles.label}>Tính năng AI</Text>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name={hasKey ? 'checkmark-circle' : 'key-outline'} size={22} color={hasKey ? C.primary : C.warn} />
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: C.ink }}>{hasKey ? 'Đã có API key' : 'Chưa có API key'}</Text>
            </View>
            <Text style={styles.p}>
              Không có key, app vẫn đọc hóa đơn ngay trên máy (đoán theo chữ in nên kém chính xác hơn). Có key thì AI đọc hóa đơn kỹ hơn và trợ lý hiểu câu tự nhiên qua Claude API. Bạn tạo key tại platform.claude.com rồi dán vào đây.
              Key chỉ lưu trên máy này{Platform.OS === 'web' ? ' (bản web lưu trong trình duyệt, chỉ nên dùng để thử)' : ', trong kho bảo mật của hệ điều hành'}.
              Mỗi lần quét hoặc nhắn AI sẽ tính phí vào tài khoản API của bạn.
            </Text>
            {hasKey ? (
              <Button label="Gỡ API key" kind="danger" icon="trash" onPress={remove} style={{ marginTop: 14 }} />
            ) : (
              <>
                <TextInput
                  value={key}
                  onChangeText={setKey}
                  placeholder="sk-ant-…"
                  placeholderTextColor={C.faint}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  accessibilityLabel="API key"
                />
                <Button label="Lưu key" onPress={save} disabled={!key.trim()} style={{ marginTop: 10 }} />
              </>
            )}
          </Card>

          <Text style={styles.label}>Dữ liệu</Text>
          <Card>
            <Text style={[styles.p, { marginTop: 0 }]}>Sổ có {transactions.length} giao dịch, lưu ngay trên máy này.</Text>
            <Button
              label="Nạp dữ liệu mẫu"
              kind="soft"
              icon="flask-outline"
              onPress={() => {
                loadSampleData();
                notify('Đã nạp', 'Đã thêm giao dịch mẫu của 2 tháng gần đây để bạn xem thử báo cáo.');
              }}
              style={{ marginTop: 12 }}
            />
            <Button
              label="Xóa toàn bộ dữ liệu"
              kind="danger"
              icon="trash"
              onPress={() => confirm('Xóa toàn bộ dữ liệu?', 'Mọi giao dịch, hạn mức, kế hoạch, cuộc trò chuyện và hồ cá của bạn sẽ bị xóa, không khôi phục được.', () => { clearAll(); resetAssistant(); })}
              style={{ marginTop: 10 }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = themed(() => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  swatch: { width: 52, height: 52, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '500', color: C.ink },
  label: { fontSize: 13, fontWeight: '500', color: C.sub, marginTop: 14, marginBottom: 8, paddingHorizontal: 4 },
  p: { color: C.sub, lineHeight: 20, marginTop: 10, fontSize: 13.5 },
  input: { backgroundColor: C.bg, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.ink, marginTop: 14 },
}));
