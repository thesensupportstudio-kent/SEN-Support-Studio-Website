CREATE TABLE IF NOT EXISTS google_auth (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  access_token TEXT,
  refresh_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  scope TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
