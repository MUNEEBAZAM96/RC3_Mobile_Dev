import { authProvider } from './config';
import { jwtAuth } from './jwtAuth';
import { supabaseAuth } from './supabaseAuth';
import type { AuthClient } from './types';

export function getAuthClient(): AuthClient {
  const provider = authProvider();
  if (provider === 'clerk') {
    throw new Error('Clerk auth uses useSignIn / useSignUp on the login screens, not getAuthClient().');
  }
  if (provider === 'supabase') return supabaseAuth;
  return jwtAuth;
}
