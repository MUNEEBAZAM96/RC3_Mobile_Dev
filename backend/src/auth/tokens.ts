import jwt from 'jsonwebtoken';

import { loadConfig } from '../config';
import { AppError } from '../http/errors';
import type { Principal, Role } from './principal';

export type { Principal, Role };

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

interface LegacyJwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export function signToken(principal: Omit<Principal, 'clerkUserId'>, expiresInSeconds = TOKEN_TTL_SECONDS): string {
  const payload: LegacyJwtPayload = {
    sub: principal.sub,
    email: principal.email,
    role: principal.role,
  };
  return jwt.sign(payload, loadConfig().jwtSecret, { algorithm: 'HS256', expiresIn: expiresInSeconds });
}

export function verifyLegacyToken(token: string): Omit<Principal, 'clerkUserId'> {
  try {
    return jwt.verify(token, loadConfig().jwtSecret, { algorithms: ['HS256'] }) as LegacyJwtPayload;
  } catch {
    throw new AppError(401, 'UNAUTHENTICATED', 'Token is missing, invalid, or expired.');
  }
}

/** Legacy JWT only. Prefer `resolvePrincipal` for Clerk. */
export function principalFromHeader(header: string | undefined): Omit<Principal, 'clerkUserId'> {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '');
  if (!match) throw new AppError(401, 'UNAUTHENTICATED', 'Authorization header must be "Bearer <jwt>".');
  return verifyLegacyToken(match[1]);
}
