import type { FastifyInstance } from 'fastify';

export function registerPing(app: FastifyInstance): void {
  app.get('/api/v1/ping', async () => ({ pong: true }));
}
