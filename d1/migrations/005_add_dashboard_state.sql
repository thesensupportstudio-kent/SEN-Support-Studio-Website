CREATE TABLE IF NOT EXISTS dashboard_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_viewed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
