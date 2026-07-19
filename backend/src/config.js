// Reads and centralizes environment configuration. Every other module imports `config`
// from here rather than touching process.env directly, so there is one place to see what
// the app needs. Missing secrets are allowed at boot (the skeleton still runs); the modules
// that need them fail loudly when actually used.
import 'dotenv/config'

// Parse a numeric env var, falling back when unset/empty/non-numeric. Note Number('') === 0,
// so an empty-but-set PORT must be caught explicitly or it would bind a random port.
const num = (value, fallback) => {
  if (value == null || String(value).trim() === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export const config = {
  port: num(process.env.PORT, 3000),
  dbPath: process.env.DB_PATH ?? 'data/observability.db',
  // CORS allow-origin for the API. Default '*' for local dev; restrict to the embed origin in
  // production. Real request auth arrives with the routes (Task 8).
  corsOrigin: process.env.CORS_ORIGIN ?? '*',

  ghl: {
    baseUrl: process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com',
    apiVersion: process.env.GHL_API_VERSION ?? '2021-07-28',
    pit: process.env.GHL_PIT ?? '',
    locationId: process.env.GHL_LOCATION_ID ?? '',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
  },
}
