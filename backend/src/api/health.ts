import type { FastifyInstance } from 'fastify';

import { hasAiKey } from '../ai/providers';
import { hasUpliftKey } from '../ai/uplift';
import { hasGroqKey, loadConfig } from '../config';
import type { HouseholdStore } from '../household/types';
import type { UserStore } from '../users/store';

export function registerHealth(app: FastifyInstance, users: UserStore, household: HouseholdStore): void {
  app.get('/health', async () => {
    const config = loadConfig();
    return {
      ok: true,
      service: 'hackathon-starter',
      database: users.kind,
      household: household.kind,
      ai: {
        provider: config.aiProvider,
        groq: hasGroqKey() && hasAiKey(),
        uplift: hasUpliftKey(),
      },
    };
  });
}
