-- Words/letter-sounds a practitioner adds after a session, for the family to
-- practise at home via the client portal's flashcard/quiz game, or print out.
CREATE TABLE IF NOT EXISTS practice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  kind TEXT NOT NULL DEFAULT 'word',
  main_text TEXT NOT NULL,
  example_text TEXT,
  emoji TEXT,
  image_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_practice_items_client ON practice_items(client_id);
