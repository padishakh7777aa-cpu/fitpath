CREATE TABLE IF NOT EXISTS users (
  chat_id     INTEGER PRIMARY KEY,
  time        TEXT,
  tz          TEXT,
  weekly      INTEGER NOT NULL DEFAULT 0,
  last_sent   TEXT,
  last_weekly TEXT
);
