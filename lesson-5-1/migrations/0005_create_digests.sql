CREATE TABLE digests (
  period_end TEXT PRIMARY KEY,
  period_start TEXT NOT NULL,
  links_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS links_created_at_idx ON links(created_at);
