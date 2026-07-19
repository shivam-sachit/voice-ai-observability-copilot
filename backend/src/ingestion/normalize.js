// Maps external call shapes to the internal Transcript (see TranscriptSource.js). ALL
// HighLevel / webhook / fixture shape knowledge lives here, so the rest of the app is
// shape-agnostic. HighLevel/webhook field names are best-effort pending live confirmation
// (docs/GHL_API_NOTES.md); each mapper keeps the untouched payload in `raw` so nothing is lost.

const firstDefined = (obj, keys) => {
  for (const k of keys) if (obj?.[k] != null) return obj[k]
  return undefined
}

// Collapse the many possible speaker labels down to our two roles.
function mapSpeaker(s) {
  const v = String(s ?? '').toLowerCase()
  if (['agent', 'assistant', 'ai', 'bot', 'system'].includes(v)) return 'agent'
  return 'caller' // customer / user / human / lead / unknown all map to caller
}

// Accepts an array of turn-like objects OR a plain-string transcript; returns Turn[].
function normalizeTurns(input) {
  if (Array.isArray(input)) {
    return input
      .map((t) => ({
        speaker: mapSpeaker(firstDefined(t, ['speaker', 'role', 'party', 'from'])),
        text: firstDefined(t, ['text', 'message', 'content', 'transcript']) ?? '',
        ts: firstDefined(t, ['ts', 'timestamp', 'time', 'startTime']),
      }))
      .filter((t) => t.text !== '')
  }
  if (typeof input === 'string' && input.trim()) {
    // Best effort for a single-string transcript: parse "Speaker: text" lines.
    return input
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^([A-Za-z ]{1,20}):\s*(.*)$/)
        return m ? { speaker: mapSpeaker(m[1]), text: m[2] } : { speaker: 'caller', text: line }
      })
  }
  return []
}

/** Our own fixture files are authored close to the internal shape. */
export function normalizeFixture(raw) {
  return {
    id: raw.id,
    agentId: raw.agentId,
    contactId: raw.contactId ?? null,
    direction: raw.direction ?? null,
    status: raw.status ?? null,
    durationSec: raw.durationSec ?? null,
    startedAt: raw.startedAt ?? null,
    source: 'fixture',
    turns: normalizeTurns(raw.turns),
    raw,
  }
}

/** A HighLevel call-log object (list item or detail). */
export function normalizeGhlCallLog(raw) {
  return {
    id: firstDefined(raw, ['id', 'callId', 'messageId']),
    agentId: firstDefined(raw, ['agentId', 'agent_id']) ?? raw.agent?.id,
    contactId: firstDefined(raw, ['contactId', 'contact_id']) ?? raw.contact?.id ?? null,
    direction: firstDefined(raw, ['direction']) ?? null,
    status: firstDefined(raw, ['status', 'callStatus']) ?? null,
    durationSec: firstDefined(raw, ['duration', 'callDuration', 'durationSec']) ?? null,
    startedAt: firstDefined(raw, ['startTime', 'startedAt', 'dateAdded', 'createdAt']) ?? null,
    source: 'pull',
    turns: normalizeTurns(firstDefined(raw, ['transcript', 'messages', 'turns'])),
    raw,
  }
}

/** The "Transcript Generated" webhook payload — same fields, marked source 'webhook'. */
export function normalizeWebhook(payload) {
  return { ...normalizeGhlCallLog(payload), source: 'webhook' }
}
