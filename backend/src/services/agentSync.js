// Brings agents into the DB. Uses the real GHL API when a PIT is configured; otherwise loads
// the fixture agents (the demo path). GHL's agent shape is unconfirmed (see GHL_API_NOTES), so
// the mapping is defensive and keeps the raw payload.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { upsertAgent } from '../db/repositories.js'
import * as ghl from '../ghl/client.js'

const AGENTS_FIXTURE = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'agents.json')

const firstDefined = (obj, keys) => {
  for (const k of keys) if (obj?.[k] != null) return obj[k]
  return undefined
}
// Pick the agents array defensively: the response may be a bare array or wrap it under one of
// several keys (unconfirmed shape). Only accept a candidate that is actually an array.
const firstArray = (...candidates) => candidates.find(Array.isArray) ?? []
const extractAgents = (res) =>
  Array.isArray(res) ? res : firstArray(res?.agents, res?.data, res?.items)

function normalizeGhlAgent(a) {
  return {
    id: firstDefined(a, ['id', 'agentId', '_id']),
    name: firstDefined(a, ['name', 'agentName']) ?? 'Unnamed agent',
    description: firstDefined(a, ['description', 'summary']) ?? null,
    script: firstDefined(a, ['prompt', 'instructions', 'script', 'systemPrompt']) ?? null,
    goals: firstDefined(a, ['goals', 'actions', 'objectives']) ?? null,
    raw: a,
  }
}

/** @returns {Promise<{ source:'ghl'|'fixture', count:number }>} */
export async function syncAgents() {
  if (ghl.isConfigured()) {
    const agents = extractAgents(await ghl.listAgents()).map(normalizeGhlAgent).filter((a) => a.id)
    for (const a of agents) upsertAgent(a)
    return { source: 'ghl', count: agents.length }
  }
  const agents = JSON.parse(readFileSync(AGENTS_FIXTURE, 'utf8'))
  for (const a of agents) upsertAgent(a)
  return { source: 'fixture', count: agents.length }
}
