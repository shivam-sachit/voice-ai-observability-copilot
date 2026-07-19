// Orchestrates ingestion end-to-end: fetch from a TranscriptSource -> dedupe against what's
// already stored -> store new transcripts -> analyze each -> store the analysis.
// The webhook route and the /ingest/sync route both call into here.
// --- Implemented in Task 5; analysis wiring completed in Task 7. ---
// Contract:
//   ingestFromSource(source) -> { ingested: number, analyzed: number }
//   ingestOne(transcript)    -> { transcriptId, analysisId }
export {}
