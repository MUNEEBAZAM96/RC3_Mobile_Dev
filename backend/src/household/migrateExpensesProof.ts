import type Database from 'better-sqlite3';
import type pg from 'pg';

const PROOF_COLUMNS = ['proof_url', 'proof_public_id'] as const;

export function migrateSqliteExpenseProofColumns(db: Database.Database): void {
  for (const column of PROOF_COLUMNS) {
    try {
      db.exec(`ALTER TABLE expenses ADD COLUMN ${column} TEXT`);
    } catch {
      // column already exists
    }
  }
}

export async function migratePostgresExpenseProofColumns(pool: pg.Pool): Promise<void> {
  for (const column of PROOF_COLUMNS) {
    await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS ${column} TEXT`);
  }
}
