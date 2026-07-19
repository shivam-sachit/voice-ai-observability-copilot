// Applies schema.sql to create the tables (idempotent — every statement is IF NOT EXISTS).
// Import initDb() from anywhere, or run this file directly via `npm run db:init`.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getDb } from './connection.js'
import { config } from '../config.js'

const here = dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = join(here, 'schema.sql')

/**
 * Create the schema on the given connection.
 * @param {import('better-sqlite3').Database} [db] defaults to the app connection
 */
export function initDb(db = getDb()) {
  db.exec(readFileSync(SCHEMA_PATH, 'utf8'))
  return db
}

// Run directly: `node src/db/init.js` (works cross-platform via file-URL comparison).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = initDb()
  console.log(`database initialized at ${config.dbPath}`)
  db.close()
}
