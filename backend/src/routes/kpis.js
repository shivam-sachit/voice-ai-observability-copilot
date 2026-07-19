import { Router } from 'express'

// KPI endpoints, nested under /api/agents/:agentId/kpis. Stubbed (501) until Task 8.
const router = Router()

// GET /api/agents/:agentId/kpis — list KPIs for an agent
router.get('/:agentId/kpis', (req, res) => res.status(501).json({ error: 'not implemented', task: 8 }))

// POST /api/agents/:agentId/kpis/suggest — Claude proposes KPIs from the agent's script (not saved)
router.post('/:agentId/kpis/suggest', (req, res) => res.status(501).json({ error: 'not implemented', task: 8 }))

// PUT /api/agents/:agentId/kpis — save the user-confirmed KPI set
router.put('/:agentId/kpis', (req, res) => res.status(501).json({ error: 'not implemented', task: 8 }))

export default router
