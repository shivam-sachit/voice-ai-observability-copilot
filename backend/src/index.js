// Express bootstrap. Its only jobs: parse JSON, enable CORS, expose a health check, and
// mount the feature routers under /api. All real logic lives in the routers/services they
// delegate to (stubbed until their tasks land).
import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { initDb } from './db/init.js'

import agentsRouter from './routes/agents.js'
import kpisRouter from './routes/kpis.js'
import callsRouter from './routes/calls.js'
import fleetRouter from './routes/fleet.js'
import ingestRouter from './routes/ingest.js'
import webhooksRouter from './routes/webhooks.js'

initDb() // ensure the schema exists (idempotent) so the server is self-sufficient on boot

const app = express()
app.use(cors({ origin: config.corsOrigin }))
app.use(express.json({ limit: '2mb' }))

// Health check — proves the server is up (used by the smoke test and by the dev proxy).
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'voice-ai-observability', time: new Date().toISOString() })
})

// Feature routers. `kpisRouter` also mounts under /api/agents because its paths are nested
// as /:agentId/kpis/... — Express falls through to it when agentsRouter has no match.
app.use('/api/agents', agentsRouter)
app.use('/api/agents', kpisRouter)
app.use('/api/calls', callsRouter)
app.use('/api/fleet', fleetRouter)
app.use('/api/ingest', ingestRouter)
app.use('/api/webhooks', webhooksRouter)

// Centralized error handler — every async route forwards rejections here via asyncHandler.
// Intentional 4xx responses use res.status() directly and never reach here, so anything that
// lands here is unexpected: log it in full (with stack) and return a plain 500. We do NOT relay
// err.status — an upstream 401/429 from the Anthropic SDK must not masquerade as our status.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`${req.method} ${req.originalUrl} failed:`, err)
  res.status(500).json({ error: err?.message ?? 'internal server error' })
})

app.listen(config.port, () => {
  console.log(`backend listening on http://localhost:${config.port}`)
})
