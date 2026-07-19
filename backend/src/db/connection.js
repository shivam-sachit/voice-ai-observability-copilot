// Opens the SQLite database (better-sqlite3) and applies schema.sql.
// --- Implemented in Task 3 (SQLite data model + storage layer). ---
// Contract:
//   openDb(path?) -> Database   a live better-sqlite3 connection with foreign keys on
//   getDb()       -> Database   a lazily-created singleton connection for the app
export function openDb(/* path = config.dbPath */) {
  throw new Error('not implemented — Task 3 (db/connection)')
}
