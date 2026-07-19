import { Router } from 'express'
import { ah } from './asyncHandler.js'
import { getAgentById, listKpisForAgent, replaceKpisForAgent } from '../db/repositories.js'
import { suggestKpis } from '../analysis/suggestKpis.js'

// Nested under /api/agents/:agentId/kpis (mounted on /api/agents in index.js).
const router = Router()

// GET /api/agents/:agentId/kpis — list KPIs for an agent
router.get('/:agentId/kpis', ah((req, res) => {
  res.json(listKpisForAgent(req.params.agentId))
}))

// POST /api/agents/:agentId/kpis/suggest — Claude proposes KPIs from the agent's script (NOT saved)
router.post('/:agentId/kpis/suggest', ah(async (req, res) => {
  const agent = getAgentById(req.params.agentId)
  if (!agent) return res.status(404).json({ error: 'agent not found' })
  res.json({ kpis: await suggestKpis(agent) })
}))

// PUT /api/agents/:agentId/kpis — save the user-confirmed KPI set (stored as active)
router.put('/:agentId/kpis', ah((req, res) => {
  const agent = getAgentById(req.params.agentId)
  if (!agent) return res.status(404).json({ error: 'agent not found' })
  const incoming = Array.isArray(req.body?.kpis) ? req.body.kpis : []
  const saved = replaceKpisForAgent(agent.id, incoming.map((k) => ({ ...k, status: 'active' })))
  res.json({ kpis: saved })
}))

export default router
