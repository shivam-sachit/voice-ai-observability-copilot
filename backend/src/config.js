// Reads and centralizes environment configuration. Every other module imports `config`
// from here rather than touching process.env directly, so there is one place to see what
// the app needs. Missing secrets are allowed at boot (the skeleton still runs); the modules
// that need them fail loudly when actually used.
import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT ?? 3000),
  dbPath: process.env.DB_PATH ?? 'data/observability.db',

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
