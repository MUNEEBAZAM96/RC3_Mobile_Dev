import type Database from 'better-sqlite3';
import type pg from 'pg';

const OPTIONAL_MEMBER_COLUMNS = ['phone', 'email', 'notes', 'joined_at'] as const;

export function migrateSqliteMemberColumns(db: Database.Database): void {
  for (const column of OPTIONAL_MEMBER_COLUMNS) {
    try {
      db.exec(`ALTER TABLE household_members ADD COLUMN ${column} TEXT`);
    } catch {
      // column already exists
    }
  }
}

export async function migratePostgresMemberColumns(pool: pg.Pool): Promise<void> {
  for (const column of OPTIONAL_MEMBER_COLUMNS) {
    await pool.query(`ALTER TABLE household_members ADD COLUMN IF NOT EXISTS ${column} TEXT`);
  }
}
