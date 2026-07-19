import { Router } from 'express'
import { ah } from './asyncHandler.js'
import { listTranscripts, getTranscriptById, getAnalysisForTranscript } from '../db/repositories.js'
import { analyzeAndStore } from '../analysis/analyzeService.js'

const router = Router()

// GET /api/calls?agentId= — list transcripts with a light analysis summary (score/pass).
// (One analysis lookup per call — fine at this scale; revisit with a join if call volume grows.)
router.get('/', ah((req, res) => {
  const { agentId } = req.query
  const calls = listTranscripts(agentId ? { agentId } : {}).map((t) => {
    const analysis = getAnalysisForTranscript(t.id)
    return {
      ...t,
      analyzed: Boolean(analysis),
      overallScore: analysis?.overallScore ?? null,
      overallPass: analysis?.overallPass ?? null,
    }
  })
  res.json(calls)
}))

// GET /api/calls/:id — one transcript plus its full analysis (null if not analyzed)
router.get('/:id', ah((req, res) => {
  const transcript = getTranscriptById(req.params.id)
  if (!transcript) return res.status(404).json({ error: 'call not found' })
  res.json({ ...transcript, analysis: getAnalysisForTranscript(transcript.id) })
}))

// POST /api/calls/:id/analyze — (re)run analysis on one call
router.post('/:id/analyze', ah(async (req, res) => {
  const transcript = getTranscriptById(req.params.id)
  if (!transcript) return res.status(404).json({ error: 'call not found' })
  const analysis = await analyzeAndStore(transcript)
  if (!analysis) return res.status(409).json({ error: 'agent has no active KPIs — configure KPIs first' })
  res.json({ analysis })
}))

export default router
