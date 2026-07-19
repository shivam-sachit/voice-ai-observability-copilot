// Wires analysis to storage. This is the `analyze` callback the ingestion layer accepts
// (kept here, not in ingestService, so ingestion has no hard dependency on the analyzer).
import { listActiveKpisForAgent, insertAnalysis } from '../db/repositories.js'
import { analyzeTranscript } from './analyzeTranscript.js'

/**
 * Evaluate a transcript against its agent's ACTIVE KPIs and store the result.
 * No-op (returns null) when the agent has no active KPIs — there's nothing to grade against yet.
 * @param {object} transcript internal Transcript
 * @returns {Promise<object|null>} the stored analysis, or null if skipped
 */
export async function analyzeAndStore(transcript) {
  const kpis = listActiveKpisForAgent(transcript.agentId)
  if (kpis.length === 0) return null
  const analysis = await analyzeTranscript(transcript, kpis)
  return insertAnalysis(analysis)
}
