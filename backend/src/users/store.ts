import { randomUUID } from 'node:crypto';

import pg from 'pg';

import type { Role } from '../auth/principal';

export const DEMO_EMAIL = 'demo@hackathon.dev';
export const DEMO_PASSWORD = 'demo1234';
export const DEMO_USER_ID = 'user-demo';

export interface AppUser {
  id: string;
  clerkUserId: string | null;
  email: string;
  role: Role;
}

export interface UserStore {
  readonly kind: 'memory' | 'postgres';
  findByClerkId(clerkUserId: string): Promise<AppUser | null>;
  findById(id: string): Promise<AppUser | null>;
  upsertFromClerk(input: { clerkUserId: string; email: string; role?: Role }): Promise<AppUser>;
  /** Legacy JWT demo path only. */
  findByEmail(email: string): Promise<LegacyUserRecord | null>;
  createLegacy(input: { email: string; passwordHash: string; role: Role }): Promise<LegacyUserRecord>;
  ensureDemoUser(passwordHash: string): Promise<void>;
}

export interface LegacyUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function memoryUserToApp(record: LegacyUserRecord): AppUser {
  return { id: record.id, clerkUserId: null, email: record.email, role: record.role };
}

export function createMemoryUserStore(): UserStore {
  const byId = new Map<string, LegacyUserRecord>();
  const byEmail = new Map<string, LegacyUserRecord>();
  const byClerk = new Map<string, AppUser>();

  return {
    kind: 'memory',
    async findByClerkId(clerkUserId) {
      return byClerk.get(clerkUserId) ?? null;
    },
    async findById(id) {
      const clerk = [...byClerk.values()].find((row) => row.id === id);
      if (clerk) return clerk;
      const legacy = byId.get(id);
      return legacy ? memoryUserToApp(legacy) : null;
    },
    async upsertFromClerk(input) {
      const existing = byClerk.get(input.clerkUserId);
      const email = normalizeEmail(input.email);
      const role = input.role ?? existing?.role ?? 'user';
      const record: AppUser = {
        id: existing?.id ?? randomUUID(),
        clerkUserId: input.clerkUserId,
        email,
        role,
      };
      byClerk.set(input.clerkUserId, record);
      return record;
    },
    async findByEmail(email) {
      return byEmail.get(normalizeEmail(email)) ?? null;
    },
    async createLegacy(input) {
      const record: LegacyUserRecord = {
        id: randomUUID(),
        email: normalizeEmail(input.email),
        passwordHash: input.passwordHash,
        role: input.role,
      };
      byId.set(record.id, record);
      byEmail.set(record.email, record);
      return record;
    },
    async ensureDemoUser(passwordHash) {
      const existing = byEmail.get(DEMO_EMAIL);
      if (existing) {
        existing.passwordHash = passwordHash;
        existing.role = 'admin';
        return;
      }
      const record: LegacyUserRecord = {
        id: DEMO_USER_ID,
        email: DEMO_EMAIL,
        passwordHash,
        role: 'admin',
      };
      byId.set(record.id, record);
      byEmail.set(record.email, record);
    },
  };
}

const USER_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT UNIQUE,
  email TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));
`;

async function migrateUserColumns(pool: pg.Pool): Promise<void> {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
  `);
}

interface UserRow {
  id: string;
  clerk_user_id: string | null;
  email: string;
  password_hash: string | null;
  role: Role;
}

function appUserFromRow(row: UserRow): AppUser {
  return { id: row.id, clerkUserId: row.clerk_user_id, email: row.email, role: row.role };
}

function legacyFromRow(row: UserRow): LegacyUserRecord | null {
  if (!row.password_hash) return null;
  return { id: row.id, email: row.email, passwordHash: row.password_hash, role: row.role };
}

export async function createPostgresUserStore(databaseUrl: string): Promise<UserStore> {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
  await pool.query(USER_SCHEMA);
  await migrateUserColumns(pool);

  return {
    kind: 'postgres',
    async findByClerkId(clerkUserId) {
      const result = await pool.query<UserRow>('SELECT * FROM users WHERE clerk_user_id = $1', [clerkUserId]);
      const row = result.rows[0];
      return row ? appUserFromRow(row) : null;
    },
    async findById(id) {
      const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
      const row = result.rows[0];
      return row ? appUserFromRow(row) : null;
    },
    async upsertFromClerk(input) {
      const email = normalizeEmail(input.email);
      const role = input.role ?? 'user';
      const existing = await pool.query<UserRow>('SELECT * FROM users WHERE clerk_user_id = $1', [
        input.clerkUserId,
      ]);
      const prior = existing.rows[0];
      const result = await pool.query<UserRow>(
        `INSERT INTO users (id, clerk_user_id, email, role, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (clerk_user_id) DO UPDATE
           SET email = EXCLUDED.email, updated_at = NOW()
         RETURNING *`,
        [prior?.id ?? randomUUID(), input.clerkUserId, email, role],
      );
      const row = result.rows[0];
      if (!row) throw new Error('Failed to upsert Clerk user.');
      return appUserFromRow(row);
    },
    async findByEmail(email) {
      const result = await pool.query<UserRow>('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
      const row = result.rows[0];
      return row ? legacyFromRow(row) : null;
    },
    async createLegacy(input) {
      const record: LegacyUserRecord = {
        id: randomUUID(),
        email: normalizeEmail(input.email),
        passwordHash: input.passwordHash,
        role: input.role,
      };
      await pool.query(
        'INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        [record.id, record.email, record.passwordHash, record.role],
      );
      return record;
    },
    async ensureDemoUser(passwordHash) {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, role)
         VALUES ($1, $2, $3, 'admin')
         ON CONFLICT (id) DO NOTHING`,
        [DEMO_USER_ID, DEMO_EMAIL, passwordHash],
      );
    },
  };
}
