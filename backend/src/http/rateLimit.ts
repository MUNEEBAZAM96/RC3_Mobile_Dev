import type { FastifyInstance, FastifyRequest } from 'fastify';

import { AppError } from './errors';

const WINDOW_SECONDS = 10;
const LIMIT = 100;

interface Bucket {
  windowStart: number;
  count: number;
}

const buckets = new Map<string, Bucket>();

function clientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || request.ip;
}

function enforceRateLimit(request: FastifyRequest): void {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / WINDOW_SECONDS) * WINDOW_SECONDS;
  const key = `${clientIp(request)}:${windowStart}`;
  const bucket = buckets.get(key) ?? { windowStart, count: 0 };
  bucket.count += 1;
  buckets.set(key, bucket);

  if (buckets.size > 1000) {
    for (const [storedKey, stored] of buckets) {
      if (stored.windowStart !== windowStart) buckets.delete(storedKey);
    }
  }

  if (bucket.count > LIMIT) {
    const retryAfter = Math.max(1, windowStart + WINDOW_SECONDS - now);
    throw new AppError(429, 'RATE_LIMITED', 'Too many requests. Try again shortly.', { retry_after: retryAfter });
  }
}

export function registerRateLimit(app: FastifyInstance): void {
  app.addHook('onRequest', async (request) => {
    const path = request.url.split('?')[0] ?? request.url;
    if (path.startsWith('/api/v1/')) enforceRateLimit(request);
  });
}
