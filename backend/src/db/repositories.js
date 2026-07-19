// Thin CRUD helpers over the tables — the ONLY place that writes SQL. Routes/services call
// these named functions; they never see SQL directly.
// --- Implemented in Task 3. ---
// Planned surface:
//   agents:      upsertAgent, listAgents, getAgentById
//   kpis:        replaceKpisForAgent, listKpisForAgent, listActiveKpisForAgent
//   transcripts: insertTranscript, listTranscripts, getTranscriptById, transcriptExists
//   analysis:    insertAnalysis (writes analysis_results + kpi_verdicts), getAnalysisForTranscript
export {}
