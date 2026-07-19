// Maps an external call shape (GHL call-log, "Transcript Generated" webhook payload, or a
// fixture) to our internal Transcript. ALL shape-specific mapping lives here, so the rest of
// the app only ever sees the internal Transcript defined in TranscriptSource.js.
// --- Implemented in Task 5 (ingestion adapter). ---
// Contract:
//   normalizeGhlCallLog(raw) -> Transcript
//   normalizeWebhook(payload) -> Transcript
//   normalizeFixture(raw) -> Transcript
export {}
