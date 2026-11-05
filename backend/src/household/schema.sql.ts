export const POSTGRES_HOUSEHOLD_SCHEMA = `
CREATE TABLE IF NOT EXISTS household_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  joined_at TEXT
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  unit TEXT NOT NULL,
  requested_qty INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  payer_id TEXT NOT NULL REFERENCES household_members(id),
  split_type TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  proof_url TEXT,
  proof_public_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_splits (
  expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES household_members(id),
  share_amount NUMERIC(12, 2) NOT NULL,
  PRIMARY KEY (expense_id, member_id)
);

CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES household_members(id),
  recipient_id TEXT NOT NULL REFERENCES household_members(id),
  amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS household_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const SQLITE_HOUSEHOLD_SCHEMA = `
CREATE TABLE IF NOT EXISTS household_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  joined_at TEXT
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  unit TEXT NOT NULL,
  requested_qty INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  payer_id TEXT NOT NULL,
  split_type TEXT NOT NULL,
  expense_date TEXT NOT NULL DEFAULT (date('now')),
  proof_url TEXT,
  proof_public_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (payer_id) REFERENCES household_members(id)
);

CREATE TABLE IF NOT EXISTS expense_splits (
  expense_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  share_amount REAL NOT NULL,
  PRIMARY KEY (expense_id, member_id),
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES household_members(id)
);

CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sender_id) REFERENCES household_members(id),
  FOREIGN KEY (recipient_id) REFERENCES household_members(id)
);

CREATE TABLE IF NOT EXISTS household_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
