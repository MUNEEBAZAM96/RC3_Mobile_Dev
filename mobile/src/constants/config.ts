import { Platform } from 'react-native';

export const DEFAULT_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://127.0.0.1:8080');

export const DEMO_EMAIL = 'demo@hackathon.dev';
export const DEMO_PASSWORD = 'demo1234';
