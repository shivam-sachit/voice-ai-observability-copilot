import { Router } from 'express'

// Ingestion trigger endpoint. Stubbed (501) until Task 8.
const router = Router()

// POST /api/ingest/sync — pull recent calls (or load fixtures) -> store -> analyze new ones
router.post('/sync', (req, res) => res.status(501).json({ error: 'not implemented', task: 8 }))

export default router
