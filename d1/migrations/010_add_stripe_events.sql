-- Records which Stripe webhook events have already been processed, since
-- Stripe guarantees at-least-once delivery (the same event can arrive more
-- than once) and creating a pack twice for one payment would be a real bug.
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
