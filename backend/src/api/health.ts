import type { FastifyInstance } from 'fastify';

import type { HouseholdStore } from '../household/types';
import type { UserStore } from '../users/store';

export function registerHealth(app: FastifyInstance, users: UserStore, household: HouseholdStore): void {
  app.get('/health', async () => ({
    ok: true,
    service: 'hackathon-starter',
    database: users.kind,
    household: household.kind,
  }));
}
