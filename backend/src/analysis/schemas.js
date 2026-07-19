// The JSON schemas Claude must fill (structured outputs). These are the contract between the
// AI and the app — the analyzer and the dashboard both depend on these shapes.
// Structured-output rules honored here: every object has additionalProperties:false and lists
// all properties in `required`; no min/max/length constraints (unsupported).

export const KPI_SUGGESTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kpis'],
  properties: {
    kpis: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'description', 'category', 'rubric', 'weight'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string', enum: ['outcome', 'compliance', 'quality', 'experience'] },
          rubric: { type: 'string' },
          weight: { type: 'integer', enum: [1, 2, 3, 4, 5] },
        },
      },
    },
  },
}

export const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'overall_pass', 'overall_score', 'summary',
    'kpi_verdicts', 'findings', 'recommendations', 'use_actions',
  ],
  properties: {
    overall_pass: { type: 'boolean' },
    overall_score: { type: 'integer' }, // 0..100
    summary: { type: 'string' },
    kpi_verdicts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kpi_name', 'verdict', 'confidence', 'evidence_quote', 'evidence_turn', 'explanation'],
        properties: {
          kpi_name: { type: 'string' },
          verdict: { type: 'string', enum: ['pass', 'fail', 'partial'] },
          confidence: { type: 'number' }, // 0..1
          evidence_quote: { type: 'string' },
          evidence_turn: { type: 'integer' },
          explanation: { type: 'string' },
        },
      },
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'severity', 'description', 'evidence'],
        properties: {
          type: { type: 'string', enum: ['deviation', 'failure', 'missed_opportunity'] },
          severity: { type: 'string', enum: ['low', 'med', 'high'] },
          description: { type: 'string' },
          evidence: { type: 'string' },
        },
      },
    },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['target', 'suggestion', 'rationale', 'priority'],
        properties: {
          target: { type: 'string', enum: ['prompt', 'script', 'config'] },
          suggestion: { type: 'string' },
          rationale: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'med', 'high'] },
        },
      },
    },
    use_actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['turn_start', 'turn_end', 'action_type', 'reason', 'quote'],
        properties: {
          turn_start: { type: 'integer' },
          turn_end: { type: 'integer' },
          action_type: { type: 'string', enum: ['human_intervention', 'script_training'] },
          reason: { type: 'string' },
          quote: { type: 'string' },
        },
      },
    },
  },
}
