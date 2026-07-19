ALTER TABLE clients ADD COLUMN password_hash TEXT;
ALTER TABLE clients ADD COLUMN password_salt TEXT;

CREATE TABLE IF NOT EXISTS client_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_sessions_token ON client_sessions(token);
CREATE INDEX IF NOT EXISTS idx_client_sessions_client ON client_sessions(client_id);

CREATE TABLE IF NOT EXISTS client_password_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  token TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'setup',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_password_tokens_token ON client_password_tokens(token);
CREATE INDEX IF NOT EXISTS idx_client_password_tokens_client ON client_password_tokens(client_id);

-- 'ongoing' packs never run out - total_sessions/remaining_sessions stay -1
-- as a sentinel rather than being decremented, so a client can pay-per-session
-- without staff creating a new pack every time. service_key matches a key in
-- site/js/payment-links.js so the portal knows which Tide link to show.
ALTER TABLE session_packs ADD COLUMN pack_type TEXT NOT NULL DEFAULT 'fixed';
ALTER TABLE session_packs ADD COLUMN service_key TEXT;
