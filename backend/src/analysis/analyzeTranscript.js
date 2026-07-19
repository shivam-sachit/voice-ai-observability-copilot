// Scores one transcript against an agent's active KPIs. Every verdict and use-action cites an
// exact transcript quote + turn index (so the UI can highlight the segment). Returns the shape
// db/repositories.insertAnalysis expects.
import { structured } from './anthropic.js'
import { ANALYSIS_SCHEMA } from './schemas.js'

const SYSTEM = `You are a meticulous QA analyst grading a Voice AI phone call against a fixed set of success criteria (KPIs).
You are given the agent's KPIs (each with a grading rubric) and the full call transcript with turn indices in brackets.
Evaluate the call strictly against the provided KPIs. For every KPI return a verdict (pass/fail/partial), your confidence (0-1), a one-line explanation, and the SINGLE most relevant piece of evidence: the exact quote and its turn index.
Only ever cite text that appears verbatim in the transcript, and use the exact turn index shown in brackets.
Identify concrete findings: deviations from the script, outright failures, and missed opportunities.
Give specific, actionable recommendations to improve the agent's prompt or script.
Flag "use actions": contiguous transcript segments (by turn range) a human should review, either because they need human intervention or because they reveal a coaching/script-training gap.
Use the exact KPI names provided; do not invent new KPIs.`

/**
 * @param {{ id:string, agentId:string, turns:Array<{speaker:string,text:string}> }} transcript
 * @param {Array<{ id:string, name:string, category?:string, weight?:number, rubric?:string }>} kpis active KPIs
 * @returns {Promise<object>} analysis in the internal shape (see insertAnalysis)
 */
export async function analyzeTranscript(transcript, kpis) {
  const kpiText = kpis
    .map((k) => `- ${k.name} [${k.category ?? 'n/a'}, weight ${k.weight ?? 3}]: ${k.rubric ?? ''}`)
    .join('\n')
  const turnsText = transcript.turns
    .map((t, i) => `[${i}] ${t.speaker}: ${t.text}`)
    .join('\n')

  const user = `KPIs:\n${kpiText}\n\nTranscript (turn index in brackets):\n${turnsText}`
  const { data, model } = await structured({ schema: ANALYSIS_SCHEMA, system: SYSTEM, user })

  // Map Claude's kpi_name back to our kpi_id; drop any verdict that doesn't match a real KPI
  // (kpi_verdicts.kpi_id is NOT NULL + FK, so an unmatched name must not be stored).
  const idByName = new Map(kpis.map((k) => [k.name, k.id]))

  return {
    transcriptId: transcript.id,
    agentId: transcript.agentId,
    overallPass: data.overall_pass,
    overallScore: data.overall_score,
    summary: data.summary,
    findings: data.findings,
    recommendations: data.recommendations,
    useActions: data.use_actions,
    model,
    verdicts: data.kpi_verdicts
      .map((v) => ({
        kpiId: idByName.get(v.kpi_name) ?? null,
        verdict: v.verdict,
        confidence: v.confidence,
        evidenceQuote: v.evidence_quote,
        evidenceTurn: v.evidence_turn,
        explanation: v.explanation,
      }))
      .filter((v) => v.kpiId != null),
  }
}
