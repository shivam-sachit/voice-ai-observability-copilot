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
 * @returns {Promise<{ fetched: number, ingested: number, skipped: number, analyzed: number }>}
 */
export async function ingestFromSource(source, { analyze } = {}) {
  const transcripts = await source.fetchRecent()
  let ingested = 0
  let skipped = 0
  let analyzed = 0

  for (const t of transcripts) {
    if (!t.id || transcriptExists(t.id)) {
      skipped++
      continue
    }
    ensureAgent(t.agentId)
    insertTranscript(t)
    ingested++
    if (analyze) {
      await analyze(t)
      analyzed++
    }
  }

  return { fetched: transcripts.length, ingested, skipped, analyzed }
}

/** Ingest a single already-normalized transcript (used by the webhook route). */
export async function ingestOne(transcript, { analyze } = {}) {
  if (!transcript.id || transcriptExists(transcript.id)) {
    return { ingested: 0, analyzed: 0, duplicate: true }
  }
  ensureAgent(transcript.agentId)
  insertTranscript(transcript)
  if (analyze) await analyze(transcript)
  return { ingested: 1, analyzed: analyze ? 1 : 0, duplicate: false }
}
