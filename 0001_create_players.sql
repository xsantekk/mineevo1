CREATE TABLE IF NOT EXISTS players (
  player_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  total_ore INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  plasma INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS players_ranking_idx
  ON players(level DESC, total_ore DESC, player_id ASC);

CREATE UNIQUE INDEX IF NOT EXISTS players_username_unique
  ON players(lower(trim(username)));
