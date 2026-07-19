// The JSON schemas Claude must fill via structured output (tool-use). These are the contract
// between the AI and the app — the analyzer and the dashboard both depend on these shapes.
// --- Implemented in Task 7 (analysis engine). ---
//
// KPI_SUGGESTION_SCHEMA:
//   { kpis: [ { name, description, category, rubric, weight } ] }
//
// ANALYSIS_SCHEMA:
//   { overall_pass, overall_score, summary,
//     kpi_verdicts:    [ { kpi_name, verdict, confidence, evidence_quote, evidence_turn, explanation } ],
//     findings:        [ { type, severity, description, evidence } ],
//     recommendations: [ { target, suggestion, rationale, priority } ],
//     use_actions:     [ { turn_start, turn_end, action_type, reason, quote } ] }
export {}
