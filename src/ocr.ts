import { Platform } from 'react-native';
import { AiError } from './ai';
import { parseReceiptText, type ReceiptGuess } from './receipt';

/** Đọc hóa đơn ngay trên máy (ML Kit trên Android, Vision trên iOS), không cần API key hay mạng. */
export async function readReceiptOffline(uri: string): Promise<ReceiptGuess> {
  if (Platform.OS === 'web') throw new AiError('Bản web chưa đọc được ảnh trên máy. Dùng app trên điện thoại, hoặc thêm API key trong Cài đặt.');
  let lines: string[];
  try {
    // require tại chỗ: module native không có trong Expo Go, lúc đó chỉ tính năng này báo lỗi chứ app không sập.
    const ocr = require('expo-text-extractor') as typeof import('expo-text-extractor');
    if (!ocr.isSupported) throw new Error('unsupported');
    lines = await ocr.extractTextFromImage(uri);
  } catch {
    throw new AiError('Máy này chưa đọc được chữ trong ảnh (cần bản cài đặt đầy đủ của app, không phải Expo Go). Bạn nhập tay giúp nhé.');
  }
  return parseReceiptText(lines.join('\n'));
}
