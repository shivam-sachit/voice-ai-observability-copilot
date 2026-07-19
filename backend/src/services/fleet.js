// Aggregation for the Fleet Overview and Agent Detail — plain SQL over stored analyses, no AI
// at read-time, so the dashboard is instant.
import { listAgents } from '../db/repositories.js'
import {
  countTranscriptsForAgent,
  analysisAggForAgent,
  kpiVerdictCountsForAgent,
} from '../db/aggregations.js'

/** Health rollup for a single agent. */
export function getAgentHealth(agentId) {
  const totalCalls = countTranscriptsForAgent(agentId)
  const { analyzed, avgScore, useActionCount } = analysisAggForAgent(agentId)

  // Fold the (kpiId, verdict) tallies into one row per KPI with a pass-rate.
  const byKpi = new Map()
  for (const r of kpiVerdictCountsForAgent(agentId)) {
    if (!byKpi.has(r.kpiId)) {
      byKpi.set(r.kpiId, { kpiId: r.kpiId, name: r.kpiName, pass: 0, fail: 0, partial: 0 })
    }
    byKpi.get(r.kpiId)[r.verdict] = r.count
  }
  const kpiPassRates = [...byKpi.values()].map((k) => {
    const total = k.pass + k.fail + k.partial
    return { ...k, total, passRate: total ? Math.round((k.pass / total) * 100) : null }
  })

  const healthScore = avgScore != null ? Math.round(avgScore) : null
  return { totalCalls, analyzedCalls: analyzed, avgScore: healthScore, healthScore, useActionCount, kpiPassRates }
}

/** Every agent with its health rollup — the Fleet Overview payload. */
export function getFleetSummary() {
  return listAgents().map((a) => ({ id: a.id, name: a.name, ...getAgentHealth(a.id) }))
}
