// The ONLY file that knows HighLevel's API exists. It is a thin TRANSPORT: it authenticates
// with the Private Integration Token, calls the confirmed endpoints, and returns the raw
// parsed JSON. It deliberately does NOT map responses to our domain shape — that is the
// ingestion layer's job (normalize.js), so all HighLevel-shape knowledge stays in one place
// on each side of the boundary.
//
// If we later move to OAuth, only the Authorization header's token source changes here.
// Exact response shapes and some query-param names are pending confirmation against a live
// sandbox — see docs/GHL_API_NOTES.md ("NOT yet confirmed").
import { config } from '../config.js'

const { baseUrl, apiVersion, pit, locationId } = config.ghl

/** True when a PIT is configured, so callers can fall back to fixtures gracefully. */
export function isConfigured() {
  return Boolean(pit)
}

function assertConfigured() {
  if (!pit) {
    throw new Error('GHL_PIT is not set — add it to backend/.env (see .env.example), or use the fixture source.')
  }
}

function buildUrl(path, query = {}) {
  const url = new URL(path, baseUrl) // path starts with "/", resolves against the origin
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== '') url.searchParams.set(key, value)
  }
  return url
}

function safeJson(text) {
  try { return JSON.parse(text) } catch { return null }
}

/**
 * Make an authenticated request and return parsed JSON. Throws a descriptive error (with
 * .status and .body) on any non-2xx response.
 */
async function request(path, { method = 'GET', query, body } = {}) {
  assertConfigured()
  const res = await fetch(buildUrl(path, query), {
    method,
    headers: {
      Authorization: `Bearer ${pit}`,
      Version: apiVersion,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const data = text ? safeJson(text) : null

  if (!res.ok) {
    const detail = data?.message || data?.error || text?.slice(0, 300) || res.statusText
    const err = new Error(`GHL ${method} ${path} -> ${res.status}: ${detail}`)
    err.status = res.status
    err.body = data
    throw err
  }
  return data
}

// --- Voice AI agents -------------------------------------------------------
/** GET /voice-ai/agents — list the sub-account's Voice AI agents. */
export function listAgents({ limit } = {}) {
  return request('/voice-ai/agents', { query: { locationId, limit } })
}

/** GET /voice-ai/agents/:id — one agent's full config (script/goals for KPI suggestion). */
export function getAgent(agentId) {
  return request(`/voice-ai/agents/${encodeURIComponent(agentId)}`, { query: { locationId } })
}

// --- Voice AI call logs (transcripts) --------------------------------------
/** GET /voice-ai/dashboard/call-logs — list calls, optionally filtered. */
export function listCallLogs({ agentId, startDate, endDate, limit } = {}) {
  return request('/voice-ai/dashboard/call-logs', {
    query: { locationId, agentId, startDate, endDate, limit },
  })
}

/** GET /voice-ai/dashboard/call-logs/:id — one call log, including its transcript. */
export function getCallLog(callId) {
  return request(`/voice-ai/dashboard/call-logs/${encodeURIComponent(callId)}`, { query: { locationId } })
}

// NOTE (pagination): GHL list endpoints are paginated. Once the response envelope is
// confirmed against a live sandbox (offset/limit vs cursor — see GHL_API_NOTES.md), the
// list* helpers should loop until all pages are fetched. For now they request a single page;
// the ingestion layer logs how many it received so nothing is silently truncated.
