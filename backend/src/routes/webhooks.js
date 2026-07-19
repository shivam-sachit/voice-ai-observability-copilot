import { Router } from 'express'

// Inbound webhook endpoints from HighLevel. Stubbed (501) until Task 8.
const router = Router()

// POST /api/webhooks/transcript — receive the GHL "Transcript Generated" payload,
// then ingest + analyze it. This is the real-time observability path.
router.post('/transcript', (req, res) => res.status(501).json({ error: 'not implemented', task: 8 }))

export default router
