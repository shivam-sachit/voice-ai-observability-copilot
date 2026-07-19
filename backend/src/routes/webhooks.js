import { Router } from 'express'
import { ah } from './asyncHandler.js'
import { normalizeWebhook } from '../ingestion/normalize.js'
import { ingestOne } from '../ingestion/ingestService.js'
import { isConfigured as anthropicConfigured } from '../analysis/anthropic.js'
import { analyzeAndStore } from '../analysis/analyzeService.js'

const router = Router()

// POST /api/webhooks/transcript — GHL "Transcript Generated" payload -> normalize -> ingest +
// analyze. This is the real-time observability path.
router.post('/transcript', ah(async (req, res) => {
  const transcript = normalizeWebhook(req.body ?? {})
  if (!transcript.id) return res.status(400).json({ error: 'payload missing a call id' })
  if (!transcript.agentId) return res.status(400).json({ error: 'payload missing an agent id' })
  const analyze = anthropicConfigured() ? analyzeAndStore : undefined
  res.json(await ingestOne(transcript, { analyze }))
}))

export default router
