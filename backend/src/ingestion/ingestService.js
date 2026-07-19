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
 * @param {{ analyze?: (transcript: object) => Promise<void> }} [opts]
 *        `analyze` is injected in Task 7 so ingestion has no hard dependency on the analyzer.
 * @returns {Promise<{ fetched:number, ingested:number, skipped:number, analyzed:number, analyzeFailed:number }>}
 */
export async function ingestFromSource(source, { analyze } = {}) {
  const transcripts = await source.fetchRecent()
  let ingested = 0
  let skipped = 0
  let analyzed = 0
  let analyzeFailed = 0

  for (const t of transcripts) {
    if (!t.id || transcriptExists(t.id)) {
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
        await analyze(t)
        analyzed++
      } catch (err) {
        analyzeFailed++
        console.warn(`analysis failed for ${t.id}: ${err.message}`)
      }
    }
  }

  return { fetched: transcripts.length, ingested, skipped, analyzed, analyzeFailed }
}

/** Ingest a single already-normalized transcript (used by the webhook route). */
export async function ingestOne(transcript, { analyze } = {}) {
  if (!transcript.id || transcriptExists(transcript.id)) {
    return { ingested: 0, analyzed: 0, duplicate: true }
  }
  ensureAgent(transcript.agentId)
  insertTranscript(transcript)
  let analyzed = 0
  let analyzeFailed = 0
  if (analyze) {
    try {
      await analyze(transcript)
      analyzed = 1
    } catch (err) {
      analyzeFailed = 1
      console.warn(`analysis failed for ${transcript.id}: ${err.message}`)
    }
  }
  return { ingested: 1, analyzed, analyzeFailed, duplicate: false }
}
