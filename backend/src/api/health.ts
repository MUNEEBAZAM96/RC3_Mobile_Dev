import type { FastifyInstance } from 'fastify';

import type { UserStore } from '../users/store';

export function registerHealth(app: FastifyInstance, users: UserStore): void {
  app.get('/health', async () => ({
    ok: true,
    service: 'hackathon-starter',
    database: users.kind,
  }));
}
