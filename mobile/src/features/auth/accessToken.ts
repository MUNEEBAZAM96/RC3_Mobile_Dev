import { getToken as getJwtToken } from './token';
import { isClerkAuth } from './config';

type TokenProvider = () => Promise<string | null>;

let clerkTokenProvider: TokenProvider | null = null;

export function setClerkTokenProvider(provider: TokenProvider | null): void {
  clerkTokenProvider = provider;
}

export async function getAccessToken(): Promise<string | null> {
  if (isClerkAuth()) {
    if (!clerkTokenProvider) return null;
    return clerkTokenProvider();
  }
  return getJwtToken();
}
