// Pulls real call logs from HighLevel via ghl/client and normalizes them to Transcripts.
// Works whenever the sub-account actually has calls. The list/detail envelope and field names
// are unconfirmed (see docs/GHL_API_NOTES.md); the code is defensive and falls back gracefully.
import { TranscriptSource } from './TranscriptSource.js'
import { normalizeGhlCallLog } from './normalize.js'
import * as ghl from '../ghl/client.js'

const extractItems = (res) =>
  Array.isArray(res) ? res : (res?.callLogs ?? res?.calls ?? res?.data ?? res?.items ?? [])
const callId = (it) => it.id ?? it.callId ?? it.messageId

export class GhlPullSource extends TranscriptSource {
  constructor({ agentId } = {}) {
    super()
    this.agentId = agentId
  }

  async fetchRecent(sinceIso) {
    const list = await ghl.listCallLogs({ agentId: this.agentId, startDate: sinceIso })
    const items = extractItems(list)
    // Single page for now — log the count so truncation is never silent (see GHL_API_NOTES).
    console.log(`GhlPullSource: received ${items.length} call log(s) (single page; pagination TODO)`)
    // Transcripts live on the call-log detail endpoint; fetch each, falling back to the list
    // item if the detail call fails, so one bad record doesn't drop the whole batch.
    const details = await Promise.all(
      items.map(async (it) => {
        try {
          return await ghl.getCallLog(callId(it))
        } catch {
          return it
        }
      }),
    )
    // Drop null detail bodies and any record we couldn't derive an id for.
    return details.filter(Boolean).map(normalizeGhlCallLog).filter((t) => t.id)
  }
}
