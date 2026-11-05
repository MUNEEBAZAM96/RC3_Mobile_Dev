import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { loadConfig } from '../config';
import { resolvePrincipal, requireClerkConfigured } from './authenticate';
import { hashPassword, verifyPassword } from './password';
import { signToken } from './tokens';
import { AppError } from '../http/errors';
import { parseBody } from '../http/validate';
import type { AppUser, UserStore } from '../users/store';

const Credentials = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
});

function publicUser(user: AppUser) {
  return { id: user.id, email: user.email, role: user.role };
}

async function meFromClerk(users: UserStore, request: import('fastify').FastifyRequest) {
  requireClerkConfigured();
  const auth = await resolvePrincipal(request);
  if (!auth.clerkUserId) throw new AppError(401, 'UNAUTHENTICATED', 'Clerk session required.');
  const user = await users.upsertFromClerk({ clerkUserId: auth.clerkUserId, email: auth.email });
  return { user: publicUser(user) };
}

export function registerAuth(app: FastifyInstance, users: UserStore): void {
  const { authMode } = loadConfig();

  app.get('/api/v1/me', async (request) => {
    if (authMode === 'clerk') return meFromClerk(users, request);

    const legacy = await resolvePrincipal(request);
    const user = await users.findById(legacy.sub);
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'This account is no longer available.');
    return { user: publicUser(user) };
  });

  if (authMode === 'clerk') return;

  app.post('/api/v1/auth/signup', async (request) => {
    const { email, password } = parseBody(Credentials, request.body);
    const existing = await users.findByEmail(email);
    if (existing) throw new AppError(409, 'EMAIL_IN_USE', 'An account with that email already exists.');

    const legacy = await users.createLegacy({
      email,
      passwordHash: await hashPassword(password),
      role: 'user',
    });
    const token = signToken({ sub: legacy.id, email: legacy.email, role: legacy.role });
    return { token, user: { id: legacy.id, email: legacy.email, role: legacy.role } };
  });

  app.post('/api/v1/auth/login', async (request) => {
    const { email, password } = parseBody(Credentials, request.body);
    const legacy = await users.findByEmail(email);
    if (!legacy || !(await verifyPassword(password, legacy.passwordHash))) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Email or password is incorrect.');
    }
    const token = signToken({ sub: legacy.id, email: legacy.email, role: legacy.role });
    return { token, user: { id: legacy.id, email: legacy.email, role: legacy.role } };
  });
}
