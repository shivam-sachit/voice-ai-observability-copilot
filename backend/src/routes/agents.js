import { Router } from 'express'

// Agent endpoints. Handlers are stubbed (501) until Task 8 wires them to the services.
const router = Router()

// GET /api/agents — list agents with rolled-up health
router.get('/', (req, res) => res.status(501).json({ error: 'not implemented', task: 8 }))

// POST /api/agents/sync — pull agents from GHL (or load fixtures) into the DB
router.post('/sync', (req, res) => res.status(501).json({ error: 'not implemented', task: 8 }))

// GET /api/agents/:id — agent detail + KPIs + aggregate health
router.get('/:id', (req, res) => res.status(501).json({ error: 'not implemented', task: 8 }))

export default router
