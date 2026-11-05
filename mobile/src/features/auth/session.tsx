import { useAuth, useUser } from '@clerk/clerk-expo';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getAuthClient } from './client';
import { isClerkAuth } from './config';
import { setClerkTokenProvider } from './accessToken';
import { clearToken, decodeToken, getToken, setToken } from './token';
import type { TokenClaims } from './types';

interface SessionValue {
  isLoaded: boolean;
  isSignedIn: boolean;
  token: string | null;
  claims: TokenClaims | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

function JwtSessionProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [token, setTokenState] = useState<string | null>(null);
  const auth = useMemo(() => getAuthClient(), []);

  useEffect(() => {
    getToken()
      .then(setTokenState)
      .finally(() => setIsLoaded(true));
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await auth.signIn(email, password);
      await setToken(session.token);
      setTokenState(session.token);
    },
    [auth],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const session = await auth.signUp(email, password);
      await setToken(session.token);
      setTokenState(session.token);
    },
    [auth],
  );

  const signOut = useCallback(async () => {
    await auth.signOut();
    await clearToken();
    setTokenState(null);
  }, [auth]);

  const value = useMemo(
    () => ({
      isLoaded,
      isSignedIn: Boolean(token),
      token,
      claims: decodeToken(token),
      signIn,
      signUp,
      signOut,
    }),
    [isLoaded, token, signIn, signUp, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function ClerkSessionProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut: clerkSignOut } = useAuth();
  const { user } = useUser();
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    setClerkTokenProvider(async () => {
      if (!isSignedIn) return null;
      return getToken();
    });
    return () => setClerkTokenProvider(null);
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setTokenState(null);
      return;
    }
    void getToken().then(setTokenState);
  }, [isLoaded, isSignedIn, getToken, user?.id]);

  const signOut = useCallback(async () => {
    await clerkSignOut();
    setTokenState(null);
  }, [clerkSignOut]);

  const claims = useMemo<TokenClaims | null>(() => {
    if (!isSignedIn || !user) return null;
    const email = user.primaryEmailAddress?.emailAddress ?? '';
    return { sub: user.id, email, role: 'user' };
  }, [isSignedIn, user]);

  const unsupported = useCallback(async () => {
    throw new Error('Use the Clerk sign-in screen. Email and password are handled by Clerk.');
  }, []);

  const signedIn = Boolean(isSignedIn);

  const value = useMemo(
    () => ({
      isLoaded,
      isSignedIn: signedIn,
      token,
      claims,
      signIn: unsupported,
      signUp: unsupported,
      signOut,
    }),
    [isLoaded, signedIn, token, claims, unsupported, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  if (isClerkAuth()) return <ClerkSessionProvider>{children}</ClerkSessionProvider>;
  return <JwtSessionProvider>{children}</JwtSessionProvider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
