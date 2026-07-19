CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_name TEXT,
  parent_email TEXT NOT NULL,
  parent_phone TEXT,
  child_name TEXT,
  school TEXT,
  status TEXT NOT NULL DEFAULT 'enquiry',
  notes TEXT,
  portal_token TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email ON clients(parent_email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_portal_token ON clients(portal_token);

CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  type TEXT NOT NULL,
  summary TEXT NOT NULL,
  detail TEXT,
  file_key TEXT,
  due_date TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_interactions_client ON interactions(client_id);

CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  form_type TEXT NOT NULL,
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_token ON assignments(token);
CREATE INDEX IF NOT EXISTS idx_assignments_client ON assignments(client_id);

CREATE TABLE IF NOT EXISTS google_auth (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  access_token TEXT,
  refresh_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  scope TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dashboard_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_viewed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS session_packs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  service_label TEXT NOT NULL,
  session_minutes INTEGER NOT NULL DEFAULT 60,
  total_sessions INTEGER NOT NULL,
  remaining_sessions INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_session_packs_client ON session_packs(client_id);

CREATE TABLE IF NOT EXISTS pack_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pack_id INTEGER NOT NULL REFERENCES session_packs(id),
  client_id INTEGER NOT NULL REFERENCES clients(id),
  calendar_event_id TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  cancelled_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pack_bookings_pack ON pack_bookings(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_bookings_client ON pack_bookings(client_id);
