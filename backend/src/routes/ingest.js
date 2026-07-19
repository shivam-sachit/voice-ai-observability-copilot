import { Router } from 'express'
import { ah } from './asyncHandler.js'
import { FixtureSource } from '../ingestion/FixtureSource.js'
import { GhlPullSource } from '../ingestion/GhlPullSource.js'
import { ingestFromSource } from '../ingestion/ingestService.js'
import { isConfigured as ghlConfigured } from '../ghl/client.js'
import { isConfigured as anthropicConfigured } from '../analysis/anthropic.js'
import { analyzeAndStore } from '../analysis/analyzeService.js'

const router = Router()

// POST /api/ingest/sync — pull recent calls (GHL if configured, else fixtures) -> store ->
// analyze new ones (only when an Anthropic key is present).
router.post('/sync', ah(async (req, res) => {
  const usePull = ghlConfigured()
  const source = usePull ? new GhlPullSource({ agentId: req.body?.agentId }) : new FixtureSource()
  const analyze = anthropicConfigured() ? analyzeAndStore : undefined
  const result = await ingestFromSource(source, { analyze })
  res.json({ source: usePull ? 'ghl-pull' : 'fixture', analysisEnabled: Boolean(analyze), ...result })
}))

export default router
