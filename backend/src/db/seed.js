// Loads the fixture agents + transcripts into the database. Runnable via `npm run seed`.
// Idempotent: agents upsert, transcripts INSERT OR IGNORE (safe to re-run).
// Analysis is NOT run here — that is wired in Task 7. After the analyzer exists, either
// re-seed with it injected or call POST /api/ingest/sync.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getDb, closeDb } from './connection.js'
import { initDb } from './init.js'
import { upsertAgent } from './repositories.js'
import { FixtureSource } from '../ingestion/FixtureSource.js'
import { ingestFromSource } from '../ingestion/ingestService.js'

const AGENTS_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'agents.json')

export async function seed() {
  initDb(getDb()) // ensure the schema exists

  const agents = JSON.parse(readFileSync(AGENTS_PATH, 'utf8'))
  for (const agent of agents) upsertAgent(agent)

  const transcripts = await ingestFromSource(new FixtureSource())
  return { agents: agents.length, ...transcripts }
}

// Run directly: `node src/db/seed.js` (npm run seed).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await seed()
  console.log(`seeded ${result.agents} agent(s); transcripts:`, {
    ingested: result.ingested,
    skipped: result.skipped,
    fetched: result.fetched,
  })
  closeDb()
}
