import { loadConfig } from '../config';
import { createPostgresHouseholdStore } from './postgresStore';
import { createSqliteHouseholdStore } from './sqliteStore';
import type { HouseholdStore } from './types';

export async function createHouseholdStore(): Promise<HouseholdStore> {
  const config = loadConfig();
  if (config.databaseUrl) {
    return createPostgresHouseholdStore(config.databaseUrl);
  }
  return createSqliteHouseholdStore(config.householdSqlitePath);
}
