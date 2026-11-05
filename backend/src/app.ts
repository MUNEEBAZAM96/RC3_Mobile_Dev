import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import { registerHouseholdCoach } from './ai/coachRoutes';
import { registerAi } from './ai/routes';
import { registerHealth } from './api/health';
import { registerPing } from './api/ping';
import { registerAuth } from './auth/routes';
import { loadConfig } from './config';
import { registerErrorHandling, registerJsonParser } from './http/errors';
import { registerRateLimit } from './http/rateLimit';
import { registerHousehold } from './household/routes';
import type { HouseholdStore } from './household/types';
import type { UserStore } from './users/store';

export const BODY_LIMIT_BYTES = 8 * 1024 * 1024;

export async function buildApp(users: UserStore, household: HouseholdStore): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: loadConfig().logLevel },
    bodyLimit: BODY_LIMIT_BYTES,
    trustProxy: true,
  });

  await app.register(cors, { origin: true });
  registerErrorHandling(app);
  registerJsonParser(app);
  registerRateLimit(app);

  registerHealth(app, users, household);
  registerPing(app);
  registerAuth(app, users);
  registerAi(app);
  registerHousehold(app, household);
  registerHouseholdCoach(app, household);

  return app;
}
