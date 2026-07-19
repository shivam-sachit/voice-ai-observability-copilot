// Aggregation queries for the fleet/agent-health views. Kept alongside the repository (the
// only place SQL lives), separated only for readability. All read-only.
import { getDb } from './connection.js'

export function countTranscriptsForAgent(agentId, db = getDb()) {
  return db.prepare(`SELECT COUNT(*) AS c FROM transcripts WHERE agent_id = ?`).get(agentId).c
}

// One row: how many analyses, their average score, and total open "use actions".
// json_array_length (SQLite JSON1, bundled with better-sqlite3) counts the use_actions array.
export function analysisAggForAgent(agentId, db = getDb()) {
  return db.prepare(`
    SELECT COUNT(*)                                        AS analyzed,
           AVG(overall_score)                             AS avgScore,
           COALESCE(SUM(json_array_length(use_actions)), 0) AS openUseActions
    FROM analysis_results
    WHERE agent_id = ?
  `).get(agentId)
}

// Per-KPI verdict tallies for one agent (the fleet view's pass-rate bars).
export function kpiVerdictCountsForAgent(agentId, db = getDb()) {
  return db.prepare(`
    SELECT v.kpi_id AS kpiId, k.name AS kpiName, v.verdict AS verdict, COUNT(*) AS count
    FROM kpi_verdicts v
    JOIN kpis k ON k.id = v.kpi_id
    WHERE v.agent_id = ?
    GROUP BY v.kpi_id, v.verdict
  `).all(agentId)
}
