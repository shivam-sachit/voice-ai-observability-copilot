import { Router } from 'express'
import { ah } from './asyncHandler.js'
import { getAgentById, listKpisForAgent, replaceKpisForAgent } from '../db/repositories.js'
import { suggestKpis } from '../analysis/suggestKpis.js'

// Nested under /api/agents/:agentId/kpis (mounted on /api/agents in index.js).
const router = Router()

const CATEGORIES = ['outcome', 'compliance', 'quality', 'experience']

// Whitelist + validate one incoming KPI. Returns a clean object, or null if invalid.
// Note: a client-supplied `id` is intentionally dropped — ids are always generated server-side
// (so a caller can't collide with another agent's KPI primary key).
function cleanKpi(k) {
  if (!k || typeof k.name !== 'string' || !k.name.trim()) return null
  if (typeof k.rubric !== 'string' || !k.rubric.trim()) return null
  return {
    name: k.name.trim(),
    description: typeof k.description === 'string' ? k.description : null,
    category: CATEGORIES.includes(k.category) ? k.category : null,
    rubric: k.rubric.trim(),
    weight: Number.isInteger(k.weight) && k.weight >= 1 && k.weight <= 5 ? k.weight : 3,
  }
}

// GET /api/agents/:agentId/kpis — list KPIs for an agent
router.get('/:agentId/kpis', ah((req, res) => {
  if (!getAgentById(req.params.agentId)) return res.status(404).json({ error: 'agent not found' })
  res.json(listKpisForAgent(req.params.agentId))
}))

// POST /api/agents/:agentId/kpis/suggest — Claude proposes KPIs from the agent's script (NOT saved)
router.post('/:agentId/kpis/suggest', ah(async (req, res) => {
  const agent = getAgentById(req.params.agentId)
  if (!agent) return res.status(404).json({ error: 'agent not found' })
  res.json({ kpis: await suggestKpis(agent) })
}))

// PUT /api/agents/:agentId/kpis — save the user-confirmed KPI set (validated, stored as active)
router.put('/:agentId/kpis', ah((req, res) => {
  const agent = getAgentById(req.params.agentId)
  if (!agent) return res.status(404).json({ error: 'agent not found' })
  const incoming = Array.isArray(req.body?.kpis) ? req.body.kpis : []
  const cleaned = incoming.map(cleanKpi)
  if (cleaned.some((k) => k === null)) {
    return res.status(400).json({ error: 'each KPI needs a non-empty name and rubric' })
  }
  const saved = replaceKpisForAgent(agent.id, cleaned.map((k) => ({ ...k, status: 'active' })))
  res.json({ kpis: saved })
}))

export default router
