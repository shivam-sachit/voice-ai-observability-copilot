import { Router } from 'express'

// Fleet aggregate endpoint. Stubbed (501) until Task 8.
const router = Router()

// GET /api/fleet — cross-agent aggregates for the overview
router.get('/', (req, res) => res.status(501).json({ error: 'not implemented', task: 8 }))

export default router
