-- Voice AI Observability Copilot — data model (SQLite).
-- One file holds everything. `db:init` runs this once to create the tables.
-- This file IS the data-model documentation; read it top-to-bottom to understand storage.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Voice AI agents, mirrored from HighLevel.
CREATE TABLE IF NOT EXISTS agents (
  id           TEXT PRIMARY KEY,            -- GHL agent id
  name         TEXT NOT NULL,
  description  TEXT,
  script       TEXT,                        -- the agent's prompt/instructions
  goals        TEXT,                        -- JSON: configured goals/actions
  raw          TEXT,                        -- JSON: full GHL config blob (kept for reference)
  synced_at    TEXT
);

-- Success criteria per agent. Suggested by AI, confirmed by the user (source/status track that).
CREATE TABLE IF NOT EXISTS kpis (
  id           TEXT PRIMARY KEY,
  agent_id     TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  category     TEXT,                         -- outcome | compliance | quality | experience
  rubric       TEXT NOT NULL,                -- precise instruction the analyzer uses to judge
  weight       INTEGER NOT NULL DEFAULT 3,   -- 1..5 relative importance
  source       TEXT NOT NULL DEFAULT 'ai_suggested',  -- ai_suggested | user
  status       TEXT NOT NULL DEFAULT 'proposed',      -- proposed | active
  created_at   TEXT
);

-- One row per call. `turns` is the normalized transcript; `source` records provenance.
CREATE TABLE IF NOT EXISTS transcripts (
  id           TEXT PRIMARY KEY,             -- GHL call/message id (or fixture id)
  agent_id     TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  contact_id   TEXT,
  direction    TEXT,                         -- inbound | outbound
  status       TEXT,
  duration_sec INTEGER,
  started_at   TEXT,
  source       TEXT NOT NULL,                -- fixture | pull | webhook
  turns        TEXT NOT NULL,                -- JSON: [{ speaker, text, ts }]
  raw          TEXT,
  ingested_at  TEXT
);

-- One row per analyzed transcript. Display-only fields are JSON; verdicts are normalized below.
CREATE TABLE IF NOT EXISTS analysis_results (
  id              TEXT PRIMARY KEY,
  transcript_id   TEXT NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  agent_id        TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  overall_pass    INTEGER,                   -- 0/1
  overall_score   INTEGER,                   -- 0..100
  summary         TEXT,
  findings        TEXT,                      -- JSON: [{ type, severity, description, evidence }]
  recommendations TEXT,                      -- JSON: [{ target, suggestion, rationale, priority }]
  use_actions     TEXT,                      -- JSON: [{ turn_start, turn_end, action_type, reason, quote }]
  model           TEXT,                      -- which Claude model produced this
  analyzed_at     TEXT
);

-- Per-KPI verdicts, normalized so the fleet view can aggregate pass-rates in SQL.
CREATE TABLE IF NOT EXISTS kpi_verdicts (
  id             TEXT PRIMARY KEY,
  analysis_id    TEXT NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
  transcript_id  TEXT NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  agent_id       TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  kpi_id         TEXT NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
  verdict        TEXT NOT NULL,              -- pass | fail | partial
  confidence     REAL,                       -- 0..1
  evidence_quote TEXT,                        -- exact transcript line cited
  evidence_turn  INTEGER,                     -- index into transcripts.turns
  explanation    TEXT
);

-- Indexes for the aggregation queries the fleet/agent views need.
CREATE INDEX IF NOT EXISTS idx_transcripts_agent ON transcripts(agent_id);
CREATE INDEX IF NOT EXISTS idx_kpis_agent        ON kpis(agent_id);
CREATE INDEX IF NOT EXISTS idx_verdicts_agent_kpi ON kpi_verdicts(agent_id, kpi_id);
CREATE INDEX IF NOT EXISTS idx_analysis_agent    ON analysis_results(agent_id);
