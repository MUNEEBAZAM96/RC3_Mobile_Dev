import './loadEnv.js';
import { hashPassword } from './auth/password';
import { buildApp } from './app';
import { loadConfig } from './config';
import { createHouseholdStore } from './household/store';
import { DEMO_PASSWORD, createMemoryUserStore, createPostgresUserStore } from './users/store';

async function main(): Promise<void> {
  const config = loadConfig();
  const users = config.databaseUrl
    ? await createPostgresUserStore(config.databaseUrl)
    : createMemoryUserStore();
  if (config.authMode === 'jwt') {
    await users.ensureDemoUser(await hashPassword(DEMO_PASSWORD));
  }

  const household = await createHouseholdStore();
  const app = await buildApp(users, household);
  await app.listen({ host: '0.0.0.0', port: config.port });
  console.log(
    `[api] listening on :${config.port} (users=${users.kind}, household=${household.kind}, auth=${config.authMode})`,
  );
}

main().catch((err) => {
  console.error(`[api] startup failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
