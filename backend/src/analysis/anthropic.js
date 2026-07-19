// Claude client + a helper that forces structured (JSON-schema) output. The ONLY file that
// knows Anthropic exists; swapping providers touches only here.
import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config.js'

let client = null

function getClient() {
  if (!config.anthropic.apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set — add it to backend/.env (see .env.example)')
  }
  if (!client) client = new Anthropic({ apiKey: config.anthropic.apiKey })
  return client
}

/** True when an API key is configured (lets callers degrade gracefully). */
export function isConfigured() {
  return Boolean(config.anthropic.apiKey)
}

/**
 * Ask Claude for a response constrained to `schema` (structured outputs). For a normal
 * (end_turn) completion the first text block is valid JSON, but the guarantee does NOT hold
 * when the model refuses or hits max_tokens — those are handled explicitly so a truncated or
 * refused response is a clear error, not an opaque JSON.parse crash.
 * @returns {Promise<{ data: object, model: string }>}
 */
export async function structured({ schema, system, user, maxTokens = 8192 }) {
  const res = await getClient().messages.create({
    model: config.anthropic.model,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    output_config: { format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: user }],
  })

  if (res.stop_reason === 'refusal') throw new Error('Claude declined the request (refusal)')
  if (res.stop_reason === 'max_tokens') {
    throw new Error(`Claude response was truncated (max_tokens=${maxTokens}) — raise maxTokens`)
  }
  const text = res.content.find((b) => b.type === 'text')?.text
  if (!text) throw new Error('Claude returned no text block')
  try {
    return { data: JSON.parse(text), model: res.model }
  } catch (err) {
    throw new Error(`Claude returned non-JSON (stop_reason=${res.stop_reason}): ${err.message}`)
  }
}
