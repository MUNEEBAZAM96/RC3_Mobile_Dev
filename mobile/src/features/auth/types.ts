export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface AuthClient {
  readonly id: 'jwt' | 'supabase';
  signIn(email: string, password: string): Promise<AuthSession>;
  signUp(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
}

export interface TokenClaims {
  sub: string;
  email: string;
  role: string;
  exp?: number;
}
