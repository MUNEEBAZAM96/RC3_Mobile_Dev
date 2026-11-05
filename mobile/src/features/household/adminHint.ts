import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_HINT_KEY = 'gharsplit.admin_hint_seen';

export async function hasSeenAdminHint(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ADMIN_HINT_KEY);
    return value === '1';
  } catch {
    return true;
  }
}

export async function markAdminHintSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ADMIN_HINT_KEY, '1');
  } catch {
    // ignore
  }
}
