// Reads seeded transcripts from src/fixtures/transcripts/*.json and returns them as internal
// Transcripts. This is the "mocked data, real pipeline" source used for the demo.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TranscriptSource } from './TranscriptSource.js'
import { normalizeFixture } from './normalize.js'

const DEFAULT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'transcripts')

export class FixtureSource extends TranscriptSource {
  constructor(dir = DEFAULT_DIR) {
    super()
    this.dir = dir
  }

  async fetchRecent(sinceIso) {
    let files
    try {
      files = readdirSync(this.dir).filter((f) => f.endsWith('.json'))
    } catch {
      return [] // no fixtures directory yet
    }
    const transcripts = []
    for (const f of files) {
      try {
        transcripts.push(normalizeFixture(JSON.parse(readFileSync(join(this.dir, f), 'utf8'))))
      } catch (err) {
        console.warn(`skipping malformed fixture ${f}: ${err.message}`)
      }
    }
    return sinceIso
      ? transcripts.filter((t) => !t.startedAt || t.startedAt >= sinceIso)
      : transcripts
  }
}
