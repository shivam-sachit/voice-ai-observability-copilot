// Opens the SQLite database (better-sqlite3). Two things every connection must do:
//   1. journal_mode = WAL  — better read/write concurrency, one extra file on disk.
//   2. foreign_keys = ON   — SQLite enforces FKs only when asked, PER CONNECTION.
// A lazily-created singleton (getDb) serves the running app; openDb makes fresh, isolated
// connections (used by scripts and tests).
import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { config } from '../config.js'

/**
 * Open a new SQLite connection at `path`, creating the parent directory if needed.
 * @param {string} [path] defaults to config.dbPath
 * @returns {import('better-sqlite3').Database}
 */
export function openDb(path = config.dbPath) {
  mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

let singleton = null

/** The app-wide connection (created on first use). */
export function getDb() {
  if (!singleton) singleton = openDb()
  return singleton
}

/** Close the app-wide connection (used on shutdown / in tests). */
export function closeDb() {
  if (singleton) {
    singleton.close()
    singleton = null
  }
}
