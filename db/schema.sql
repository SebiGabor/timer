-- Schema SQL pentru baza de date Turso (libSQL / SQLite)
-- Notă: Aplicația rulează automat aceste instrucțiuni din Setări -> „Testează & Inițializează DB”.

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  tag TEXT,
  target_minutes INTEGER,
  auto_advance INTEGER NOT NULL DEFAULT 0,
  sections_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS session_logs (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  recipe_title TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  planned_seconds INTEGER NOT NULL,
  actual_seconds INTEGER NOT NULL,
  sections_result_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recipes_updated_at ON recipes(updated_at);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON session_logs(started_at DESC);
