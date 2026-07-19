import { Router } from 'express'
import { ah } from './asyncHandler.js'
import { getFleetSummary } from '../services/fleet.js'

const router = Router()

// GET /api/fleet — cross-agent health rollup for the overview
router.get('/', ah((req, res) => {
  res.json({ agents: getFleetSummary() })
}))

export default router
