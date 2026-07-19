import { Router } from 'express'
import { ah } from './asyncHandler.js'
import { listAgents, getAgentById, listKpisForAgent } from '../db/repositories.js'
import { getAgentHealth } from '../services/fleet.js'
import { syncAgents } from '../services/agentSync.js'

const router = Router()

// GET /api/agents — every agent with its health rollup
router.get('/', ah((req, res) => {
  res.json(listAgents().map((a) => ({ ...a, health: getAgentHealth(a.id) })))
}))

// POST /api/agents/sync — pull agents from GHL, or load fixtures
router.post('/sync', ah(async (req, res) => {
  res.json(await syncAgents())
}))

// GET /api/agents/:id — agent detail + its KPIs + health
router.get('/:id', ah((req, res) => {
  const agent = getAgentById(req.params.id)
  if (!agent) return res.status(404).json({ error: 'agent not found' })
  res.json({ ...agent, kpis: listKpisForAgent(agent.id), health: getAgentHealth(agent.id) })
}))

export default router
