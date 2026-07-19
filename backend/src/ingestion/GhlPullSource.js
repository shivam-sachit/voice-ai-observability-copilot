import { TranscriptSource } from './TranscriptSource.js'
// Pulls real call logs from HighLevel via ghl/client and normalizes them to Transcripts.
// Works whenever the sub-account actually has calls. --- Implemented in Task 5. ---
export class GhlPullSource extends TranscriptSource {
  async fetchRecent(/* sinceIso */) {
    throw new Error('not implemented — Task 5 (GhlPullSource)')
  }
}
