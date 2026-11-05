import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gharsplit.last_lan_api';

export async function getLastLanApiUrl(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function setLastLanApiUrl(url: string): Promise<void> {
  try {
    const trimmed = url.trim();
    if (trimmed.length === 0) return;
    if (trimmed.includes('127.0.0.1') || trimmed.includes('localhost')) return;
    await AsyncStorage.setItem(KEY, trimmed);
  } catch {
    // ignore
  }
}
