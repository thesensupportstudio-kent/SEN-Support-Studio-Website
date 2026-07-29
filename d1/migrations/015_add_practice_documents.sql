-- PDFs of the actual flashcards used in a session, uploaded by staff so the
-- family can download the same sheet from their portal's practice page.
CREATE TABLE IF NOT EXISTS practice_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  file_name TEXT NOT NULL,
  file_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_practice_documents_client ON practice_documents(client_id);
