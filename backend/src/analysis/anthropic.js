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
 * Ask Claude for a response constrained to `schema` (structured outputs). The API guarantees
 * the first text block is valid JSON matching the schema, so we parse it directly.
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
  const text = res.content.find((b) => b.type === 'text')?.text
  if (!text) throw new Error('Claude returned no text block')
  return { data: JSON.parse(text), model: res.model }
}
