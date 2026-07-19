// Reads an agent's script/goals and asks Claude to propose KPIs (each with a testable rubric).
// These come back as status:'proposed'; the user confirms/edits them in the KPI Config UI.
import { structured } from './anthropic.js'
import { KPI_SUGGESTION_SCHEMA } from './schemas.js'

const SYSTEM = `You are a senior conversation-analytics consultant who designs observability metrics for Voice AI phone agents.
Given an agent's purpose and script, propose a small set of measurable, independently-checkable success criteria (KPIs) that a reviewer could grade from a call transcript.
Each KPI must be objectively verifiable from what was said. Prefer 4-7 high-signal KPIs over an exhaustive list.
Categories: outcome (did the call achieve its goal), compliance (did the agent follow required steps or policy), quality (clarity, accuracy), experience (caller effort, tone).
The "rubric" field must be a precise instruction telling a grader exactly how to decide pass/fail for that KPI from a transcript.`

/**
 * @param {{ name:string, description?:string, script?:string, goals?:any }} agent
 * @returns {Promise<Array>} proposed KPIs (source:'ai_suggested', status:'proposed')
 */
export async function suggestKpis(agent) {
  const user = [
    `Agent name: ${agent.name}`,
    `Description: ${agent.description ?? '(none)'}`,
    `Script / instructions:\n${agent.script ?? '(none)'}`,
    `Configured goals: ${JSON.stringify(agent.goals ?? [])}`,
    '',
    'Propose the KPIs.',
  ].join('\n')

  const { data } = await structured({ schema: KPI_SUGGESTION_SCHEMA, system: SYSTEM, user })
  return data.kpis.map((k) => ({ ...k, source: 'ai_suggested', status: 'proposed' }))
}
