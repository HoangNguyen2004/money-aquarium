import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { notify } from './components/ui';

export interface Picked {
  uri: string;
  base64: string;
  mimeType: string;
}

export async function pickImage(source: 'camera' | 'library'): Promise<Picked | null> {
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5, base64: true };
  let res: ImagePicker.ImagePickerResult;
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        notify('Chưa có quyền camera', 'Hãy cho phép ứng dụng dùng camera trong phần Cài đặt của điện thoại.');
        return null;
      }
      res = await ImagePicker.launchCameraAsync(opts);
    } else {
      res = await ImagePicker.launchImageLibraryAsync(opts);
    }
  } catch {
    notify('Không mở được ảnh', source === 'camera' ? 'Thiết bị này không mở được camera. Thử chọn ảnh từ thư viện.' : 'Thử lại nhé.');
    return null;
  }
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  let base64 = a.base64 ?? '';
  let mimeType = a.mimeType ?? 'image/jpeg';
  // Trên web, ảnh trả về dạng data URI.
  const m = /^data:(image\/[a-z+]+);base64,(.*)$/i.exec(a.uri);
  if (m) {
    mimeType = m[1];
    if (!base64) base64 = m[2];
  }
  if (!base64) {
    notify('Không đọc được ảnh', 'Thử chọn ảnh khác nhé.');
    return null;
  }
  return { uri: a.uri, base64, mimeType };
}

/** Chép ảnh nền vào thư mục tài liệu của app (ảnh từ trình chọn ảnh nằm ở bộ nhớ tạm, hệ điều hành có thể xóa). Trả về giá trị để lưu. */
export function keepBackground(uri: string, old: string | null): string {
  if (Platform.OS === 'web') return uri;
  // Tên mới mỗi lần để Image không dùng lại ảnh cũ trong bộ nhớ đệm.
  const name = `bg-${Date.now()}.jpg`;
  new File(uri).copy(new File(Paths.document, name));
  dropBackground(old);
  return name;
}

export function dropBackground(stored: string | null) {
  if (!stored || Platform.OS === 'web') return;
  try {
    new File(Paths.document, stored).delete();
  } catch {
    // file đã mất: không còn gì để xóa
  }
}

/** Chỉ lưu tên file vì đường dẫn thư mục tài liệu trên iOS đổi sau mỗi lần cập nhật app. */
export function backgroundUri(stored: string): string {
  return Platform.OS === 'web' ? stored : new File(Paths.document, stored).uri;
}
