import type { AuthClient } from './types';

function notReady(): never {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase auth is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
  throw new Error('Supabase keys are present, but this starter still signs in with the JWT API. Add the Supabase adapter before switching providers.');
}

export const supabaseAuth: AuthClient = {
  id: 'supabase',
  async signIn() {
    notReady();
  },
  async signUp() {
    notReady();
  },
  async signOut() {
    notReady();
  },
};
