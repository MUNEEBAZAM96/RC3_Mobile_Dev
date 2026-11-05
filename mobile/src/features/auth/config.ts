export type AuthProviderName = 'clerk' | 'jwt' | 'supabase';

export function authProvider(): AuthProviderName {
  const value = process.env.EXPO_PUBLIC_AUTH_PROVIDER;
  if (value === 'clerk' || value === 'jwt' || value === 'supabase') return value;
  return 'clerk';
}

export function isClerkAuth(): boolean {
  return authProvider() === 'clerk';
}

export function clerkPublishableKey(): string | undefined {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  return key ? key : undefined;
}
