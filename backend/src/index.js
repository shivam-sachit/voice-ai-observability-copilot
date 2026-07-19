// Express bootstrap. Its only jobs: parse JSON, enable CORS, expose a health check, and
// mount the feature routers under /api. All real logic lives in the routers/services they
// delegate to (stubbed until their tasks land).
import express from 'express'
import cors from 'cors'
import { config } from './config.js'

import agentsRouter from './routes/agents.js'
import kpisRouter from './routes/kpis.js'
import callsRouter from './routes/calls.js'
import fleetRouter from './routes/fleet.js'
import ingestRouter from './routes/ingest.js'
import webhooksRouter from './routes/webhooks.js'

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

app.listen(config.port, () => {
  console.log(`backend listening on http://localhost:${config.port}`)
})
