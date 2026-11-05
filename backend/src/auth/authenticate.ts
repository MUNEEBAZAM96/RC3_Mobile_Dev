import type { FastifyRequest } from 'fastify';

import { loadConfig } from '../config';
import { AppError } from '../http/errors';
import { authenticateClerkRequest } from './clerk';
import type { Principal } from './principal';
import { principalFromHeader as legacyJwtPrincipal } from './tokens';

export async function resolvePrincipal(request: FastifyRequest): Promise<Principal> {
  const { authMode } = loadConfig();
  if (authMode === 'clerk') return authenticateClerkRequest(request);
  const legacy = legacyJwtPrincipal(request.headers.authorization);
  return { ...legacy, clerkUserId: null };
}

export function requireClerkConfigured(): void {
  if (loadConfig().authMode !== 'clerk') return;
  if (!loadConfig().clerkSecretKey) {
    throw new AppError(
      503,
      'AUTH_NOT_CONFIGURED',
      'Set CLERK_SECRET_KEY on the API. Sign-in runs in the mobile app with Clerk.',
    );
  }
}
