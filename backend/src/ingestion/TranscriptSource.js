/**
 * TranscriptSource — the one contract every transcript producer implements.
 * This is the real-vs-mocked seam: swap the implementation and nothing downstream changes.
 *
 * Internal shapes the whole app agrees on:
 * @typedef {Object} Turn
 * @property {'agent'|'caller'} speaker
 * @property {string} text
 * @property {number} [ts]                seconds from call start (optional)
 *
 * @typedef {Object} Transcript
 * @property {string} id
 * @property {string} agentId
 * @property {string} [contactId]
 * @property {'inbound'|'outbound'} [direction]
 * @property {string} [status]
 * @property {number} [durationSec]
 * @property {string} [startedAt]
 * @property {'fixture'|'pull'|'webhook'} source
 * @property {Turn[]} turns
 * @property {object} [raw]
 */
export class TranscriptSource {
  /**
   * @param {string} [sinceIso] only return calls newer than this timestamp
   * @returns {Promise<Transcript[]>}
   */
  async fetchRecent(sinceIso) {
    throw new Error('TranscriptSource.fetchRecent must be implemented by a subclass')
  }
}
