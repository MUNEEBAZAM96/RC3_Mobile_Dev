import * as SecureStore from 'expo-secure-store';

import { DEFAULT_BASE_URL } from '../../constants/config';

const BASE_URL_KEY = 'hackathon.baseUrl';

export async function getBaseUrl(): Promise<string> {
  return (await SecureStore.getItemAsync(BASE_URL_KEY)) ?? DEFAULT_BASE_URL;
}

export async function setBaseUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(BASE_URL_KEY, url.trim().replace(/\/+$/, ''));
}
