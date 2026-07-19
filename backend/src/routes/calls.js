import { Router } from 'express'

// Call/transcript endpoints. Stubbed (501) until Task 8.
const router = Router()

// GET /api/calls?agentId= — list transcripts (optionally filtered by agent)
router.get('/', (req, res) => res.status(501).json({ error: 'not implemented', task: 8 }))

// GET /api/calls/:id — one transcript plus its analysis
router.get('/:id', (req, res) => res.status(501).json({ error: 'not implemented', task: 8 }))

// POST /api/calls/:id/analyze — (re)run analysis on one call
router.post('/:id/analyze', (req, res) => res.status(501).json({ error: 'not implemented', task: 8 }))

export default router
