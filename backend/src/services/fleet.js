// Aggregation for the Fleet Overview — plain SQL over kpi_verdicts / analysis_results.
// No AI at read-time: the dashboard reads pre-computed analyses, so it's instant.
// --- Implemented in Task 8. ---
// Contract:
//   getFleetSummary() -> [ { agentId, name, healthScore, kpiPassRates, openUseActions } ]
//   getTopFailures()  -> [ { description, count } ]   across the fleet
export {}
