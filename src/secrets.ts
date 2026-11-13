import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Trên iOS/Android khóa nằm trong Keychain/Keystore. Bản web không có kho bảo mật
// nên rơi về localStorage — chỉ nên dùng bản web để thử nghiệm.
const NAME = 'anthropic_api_key';

export async function getApiKey(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return await AsyncStorage.getItem(NAME);
    return await SecureStore.getItemAsync(NAME);
  } catch {
    return null;
  }
}

export async function saveApiKey(key: string): Promise<void> {
  if (Platform.OS === 'web') await AsyncStorage.setItem(NAME, key);
  else await SecureStore.setItemAsync(NAME, key);
}

export async function removeApiKey(): Promise<void> {
  if (Platform.OS === 'web') await AsyncStorage.removeItem(NAME);
  else await SecureStore.deleteItemAsync(NAME);
}

export async function hasApiKey(): Promise<boolean> {
  return !!(await getApiKey());
}
