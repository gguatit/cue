-- Cue Test Lab: answers live only in D1.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS answers (
  question_id INTEGER PRIMARY KEY,
  question_type TEXT NOT NULL,
  answer TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  answer TEXT NOT NULL,
  correct INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS attempts_session_time
  ON attempts (session_id, created_at);

CREATE INDEX IF NOT EXISTS attempts_question
  ON attempts (question_id);

CREATE TABLE IF NOT EXISTS reveals (
  session_id TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, question_id)
);
