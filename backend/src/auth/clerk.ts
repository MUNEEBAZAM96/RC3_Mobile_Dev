import { createClerkClient, verifyToken } from '@clerk/backend';
import type { FastifyRequest } from 'fastify';

import { loadConfig } from '../config';
import { AppError } from '../http/errors';
import type { Principal } from './principal';

let clerk: ReturnType<typeof createClerkClient> | null = null;

function getClerk() {
  if (!clerk) {
    const secretKey = loadConfig().clerkSecretKey;
    if (!secretKey) {
      throw new AppError(503, 'AUTH_NOT_CONFIGURED', 'CLERK_SECRET_KEY is not set on the API.');
    }
    clerk = createClerkClient({ secretKey });
  }
  return clerk;
}

function bearerToken(header: string | undefined): string {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '');
  if (!match) throw new AppError(401, 'UNAUTHENTICATED', 'Authorization header must be "Bearer <token>".');
  return match[1];
}

export async function authenticateClerkRequest(request: FastifyRequest): Promise<Principal> {
  const config = loadConfig();
  const token = bearerToken(request.headers.authorization);
  let payload: Awaited<ReturnType<typeof verifyToken>>;
  try {
    payload = await verifyToken(token, { secretKey: config.clerkSecretKey! });
  } catch (error) {
    throw new AppError(
      401,
      'UNAUTHENTICATED',
      error instanceof Error ? error.message : 'Invalid Clerk session.',
    );
  }

  const clerkUserId = payload?.sub;
  if (!clerkUserId) throw new AppError(401, 'UNAUTHENTICATED', 'Clerk token is missing a subject.');

  const user = await getClerk().users.getUser(clerkUserId);
  const email =
    user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    '';

  return {
    sub: clerkUserId,
    email,
    role: 'user',
    clerkUserId,
  };
}
