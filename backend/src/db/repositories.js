// The ONLY place SQL lives. Routes and services call these named functions and work with
// plain camelCase domain objects; the snake_case column names and JSON (de)serialization are
// contained here. Every function takes an optional `db` so scripts/tests can pass their own
// connection; by default they use the app-wide one.
import { randomUUID } from 'node:crypto'
import { getDb } from './connection.js'

// --- small helpers ---------------------------------------------------------
const nowIso = () => new Date().toISOString()
const toJson = (v) => (v == null ? null : JSON.stringify(v))
const fromJson = (v) => (v == null ? null : JSON.parse(v))

// --- row -> domain mappers (snake_case column -> camelCase field) ----------
const mapAgent = (r) => ({
  id: r.id, name: r.name, description: r.description, script: r.script,
  goals: fromJson(r.goals), raw: fromJson(r.raw), syncedAt: r.synced_at,
})
const mapKpi = (r) => ({
  id: r.id, agentId: r.agent_id, name: r.name, description: r.description,
  category: r.category, rubric: r.rubric, weight: r.weight,
  source: r.source, status: r.status, createdAt: r.created_at,
})
const mapTranscript = (r) => ({
  id: r.id, agentId: r.agent_id, contactId: r.contact_id, direction: r.direction,
  status: r.status, durationSec: r.duration_sec, startedAt: r.started_at,
  source: r.source, turns: fromJson(r.turns), raw: fromJson(r.raw), ingestedAt: r.ingested_at,
})
const mapAnalysis = (r) => ({
  id: r.id, transcriptId: r.transcript_id, agentId: r.agent_id,
  overallPass: !!r.overall_pass, overallScore: r.overall_score, summary: r.summary,
  findings: fromJson(r.findings), recommendations: fromJson(r.recommendations),
  useActions: fromJson(r.use_actions), model: r.model, analyzedAt: r.analyzed_at,
})
const mapVerdict = (r) => ({
  id: r.id, analysisId: r.analysis_id, transcriptId: r.transcript_id, agentId: r.agent_id,
  kpiId: r.kpi_id, verdict: r.verdict, confidence: r.confidence,
  evidenceQuote: r.evidence_quote, evidenceTurn: r.evidence_turn, explanation: r.explanation,
})

// --- agents ----------------------------------------------------------------
export function upsertAgent(agent, db = getDb()) {
  db.prepare(`
    INSERT INTO agents (id, name, description, script, goals, raw, synced_at)
    VALUES (@id, @name, @description, @script, @goals, @raw, @synced_at)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, description=excluded.description, script=excluded.script,
      goals=excluded.goals, raw=excluded.raw, synced_at=excluded.synced_at
  `).run({
    id: agent.id,
    name: agent.name,
    description: agent.description ?? null,
    script: agent.script ?? null,
    goals: toJson(agent.goals),
    raw: toJson(agent.raw),
    synced_at: nowIso(),
  })
  return getAgentById(agent.id, db)
}

export function listAgents(db = getDb()) {
  return db.prepare(`SELECT * FROM agents ORDER BY name`).all().map(mapAgent)
}

export function getAgentById(id, db = getDb()) {
  const row = db.prepare(`SELECT * FROM agents WHERE id = ?`).get(id)
  return row ? mapAgent(row) : null
}

// --- kpis ------------------------------------------------------------------
// Replace an agent's entire KPI set in one transaction. Deleting old KPIs cascades to their
// kpi_verdicts (see schema FKs): when the success criteria change, prior verdicts are stale,
// so re-analysis is expected. Used by "save confirmed KPIs" (status 'active').
export function replaceKpisForAgent(agentId, kpis, db = getDb()) {
  const del = db.prepare(`DELETE FROM kpis WHERE agent_id = ?`)
  const ins = db.prepare(`
    INSERT INTO kpis (id, agent_id, name, description, category, rubric, weight, source, status, created_at)
    VALUES (@id, @agent_id, @name, @description, @category, @rubric, @weight, @source, @status, @created_at)
  `)
  const tx = db.transaction((list) => {
    del.run(agentId)
    for (const k of list) {
      ins.run({
        id: k.id ?? randomUUID(),
        agent_id: agentId,
        name: k.name,
        description: k.description ?? null,
        category: k.category ?? null,
        rubric: k.rubric,
        weight: k.weight ?? 3,
        source: k.source ?? 'user',
        status: k.status ?? 'active',
        created_at: nowIso(),
      })
    }
  })
  tx(kpis)
  return listKpisForAgent(agentId, db)
}

export function listKpisForAgent(agentId, db = getDb()) {
  return db.prepare(`SELECT * FROM kpis WHERE agent_id = ? ORDER BY weight DESC, name`)
    .all(agentId).map(mapKpi)
}

export function listActiveKpisForAgent(agentId, db = getDb()) {
  return db.prepare(`SELECT * FROM kpis WHERE agent_id = ? AND status = 'active' ORDER BY weight DESC, name`)
    .all(agentId).map(mapKpi)
}

// --- transcripts -----------------------------------------------------------
// INSERT OR IGNORE makes ingestion idempotent: re-ingesting the same call id is a no-op.
export function insertTranscript(t, db = getDb()) {
  db.prepare(`
    INSERT OR IGNORE INTO transcripts
      (id, agent_id, contact_id, direction, status, duration_sec, started_at, source, turns, raw, ingested_at)
    VALUES
      (@id, @agent_id, @contact_id, @direction, @status, @duration_sec, @started_at, @source, @turns, @raw, @ingested_at)
  `).run({
    id: t.id,
    agent_id: t.agentId,
    contact_id: t.contactId ?? null,
    direction: t.direction ?? null,
    status: t.status ?? null,
    duration_sec: t.durationSec ?? null,
    started_at: t.startedAt ?? null,
    source: t.source,
    turns: toJson(t.turns ?? []),
    raw: toJson(t.raw),
    ingested_at: nowIso(),
  })
  return getTranscriptById(t.id, db)
}

export function transcriptExists(id, db = getDb()) {
  return !!db.prepare(`SELECT 1 FROM transcripts WHERE id = ?`).get(id)
}

export function getTranscriptById(id, db = getDb()) {
  const row = db.prepare(`SELECT * FROM transcripts WHERE id = ?`).get(id)
  return row ? mapTranscript(row) : null
}

export function listTranscripts({ agentId } = {}, db = getDb()) {
  const rows = agentId
    ? db.prepare(`SELECT * FROM transcripts WHERE agent_id = ? ORDER BY started_at DESC`).all(agentId)
    : db.prepare(`SELECT * FROM transcripts ORDER BY started_at DESC`).all()
  return rows.map(mapTranscript)
}

// --- analysis --------------------------------------------------------------
// One current analysis per transcript: re-analyzing replaces the previous result (and its
// verdicts, via cascade). Writes analysis_results + kpi_verdicts atomically.
export function insertAnalysis(analysis, db = getDb()) {
  const analysisId = randomUUID()
  const delPrev = db.prepare(`DELETE FROM analysis_results WHERE transcript_id = ?`)
  const insAnalysis = db.prepare(`
    INSERT INTO analysis_results
      (id, transcript_id, agent_id, overall_pass, overall_score, summary, findings, recommendations, use_actions, model, analyzed_at)
    VALUES
      (@id, @transcript_id, @agent_id, @overall_pass, @overall_score, @summary, @findings, @recommendations, @use_actions, @model, @analyzed_at)
  `)
  const insVerdict = db.prepare(`
    INSERT INTO kpi_verdicts
      (id, analysis_id, transcript_id, agent_id, kpi_id, verdict, confidence, evidence_quote, evidence_turn, explanation)
    VALUES
      (@id, @analysis_id, @transcript_id, @agent_id, @kpi_id, @verdict, @confidence, @evidence_quote, @evidence_turn, @explanation)
  `)
  const tx = db.transaction(() => {
    delPrev.run(analysis.transcriptId)
    insAnalysis.run({
      id: analysisId,
      transcript_id: analysis.transcriptId,
      agent_id: analysis.agentId,
      overall_pass: analysis.overallPass ? 1 : 0,
      overall_score: analysis.overallScore ?? null,
      summary: analysis.summary ?? null,
      findings: toJson(analysis.findings ?? []),
      recommendations: toJson(analysis.recommendations ?? []),
      use_actions: toJson(analysis.useActions ?? []),
      model: analysis.model ?? null,
      analyzed_at: nowIso(),
    })
    for (const v of analysis.verdicts ?? []) {
      insVerdict.run({
        id: randomUUID(),
        analysis_id: analysisId,
        transcript_id: analysis.transcriptId,
        agent_id: analysis.agentId,
        kpi_id: v.kpiId,
        verdict: v.verdict,
        confidence: v.confidence ?? null,
        evidence_quote: v.evidenceQuote ?? null,
        evidence_turn: v.evidenceTurn ?? null,
        explanation: v.explanation ?? null,
      })
    }
  })
  tx()
  return getAnalysisForTranscript(analysis.transcriptId, db)
}

// Returns the analysis plus its verdicts, or null if the transcript hasn't been analyzed.
export function getAnalysisForTranscript(transcriptId, db = getDb()) {
  const row = db.prepare(`SELECT * FROM analysis_results WHERE transcript_id = ?`).get(transcriptId)
  if (!row) return null
  const verdicts = db.prepare(`SELECT * FROM kpi_verdicts WHERE analysis_id = ?`)
    .all(row.id).map(mapVerdict)
  return { ...mapAnalysis(row), verdicts }
}
