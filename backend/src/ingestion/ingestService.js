// Orchestrates ingestion end-to-end: fetch from a TranscriptSource -> dedupe against stored
// calls -> ensure the agent row exists (FK) -> store -> optionally analyze each new transcript.
// The /ingest/sync route and the webhook route both call into here.
import {
  getAgentById,
  upsertAgent,
  insertTranscript,
  transcriptExists,
} from '../db/repositories.js'

// Ensure the transcript's agent exists so the FK holds even before agents are synced. A real
// agent sync later fills in name/script/goals (upsert updates the row in place).
function ensureAgent(agentId) {
  if (agentId && !getAgentById(agentId)) upsertAgent({ id: agentId, name: agentId })
}

/**
 * Ingest every transcript a source yields.
 * @param {import('./TranscriptSource.js').TranscriptSource} source
 * @param {{ analyze?: (transcript: object) => Promise<object|null> }} [opts]
 *        `analyze` is injected (Task 7) so ingestion has no hard dependency on the analyzer.
 *        It should return a truthy result when it analyzed, or a falsy value when it chose to
 *        skip (e.g. the agent has no active KPIs yet).
 * @returns {Promise<{ fetched:number, ingested:number, skipped:number, analyzed:number, analyzeSkipped:number, analyzeFailed:number }>}
 */
export async function ingestFromSource(source, { analyze } = {}) {
  const transcripts = await source.fetchRecent()
  let ingested = 0
  let skipped = 0
  let analyzed = 0
  let analyzeSkipped = 0
  let analyzeFailed = 0

  for (const t of transcripts) {
    // Skip records missing a required field (id/agentId — both are NOT NULL) or already stored,
    // so one malformed record can't throw and abort the rest of the batch.
    if (!t.id || !t.agentId || transcriptExists(t.id)) {
      skipped++
      continue
    }
    ensureAgent(t.agentId)
    insertTranscript(t)
    ingested++
    // The transcript stays stored even if analysis fails (it can be retried later via
    // POST /calls/:id/analyze), so one analyzer error never drops the rest of the batch.
    if (analyze) {
      try {
        const result = await analyze(t)
        if (result) analyzed++
        else analyzeSkipped++
      } catch (err) {
        analyzeFailed++
        console.warn(`analysis failed for ${t.id}: ${err.message}`)
      }
    }
  }

  return { fetched: transcripts.length, ingested, skipped, analyzed, analyzeSkipped, analyzeFailed }
}

/**
 * Ingest a single already-normalized transcript (used by the webhook route).
 * @returns {Promise<{ ingested:number, analyzed:number, analyzeFailed:number, duplicate:boolean }>}
 */
export async function ingestOne(transcript, { analyze } = {}) {
  if (!transcript.id || !transcript.agentId || transcriptExists(transcript.id)) {
    return { ingested: 0, analyzed: 0, analyzeSkipped: 0, analyzeFailed: 0, duplicate: true }
  }
  ensureAgent(transcript.agentId)
  insertTranscript(transcript)
  let analyzed = 0
  let analyzeSkipped = 0
  let analyzeFailed = 0
  if (analyze) {
    try {
      if (await analyze(transcript)) analyzed = 1
      else analyzeSkipped = 1
    } catch (err) {
      analyzeFailed = 1
      console.warn(`analysis failed for ${transcript.id}: ${err.message}`)
    }
  }
  return { ingested: 1, analyzed, analyzeSkipped, analyzeFailed, duplicate: false }
}
