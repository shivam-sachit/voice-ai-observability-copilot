import { TranscriptSource } from './TranscriptSource.js'
// Reads seeded transcripts from src/fixtures/transcripts/*.json (authored in Task 6) and
// returns them as internal Transcripts. This is the "mocked data, real pipeline" source.
// --- Implemented in Task 5. ---
export class FixtureSource extends TranscriptSource {
  async fetchRecent(/* sinceIso */) {
    throw new Error('not implemented — Task 5 (FixtureSource)')
  }
}
