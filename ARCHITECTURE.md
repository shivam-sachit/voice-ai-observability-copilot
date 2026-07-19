# Voice AI Observability Copilot — Architecture

> This document is the single source of truth for how the system is built and **why**.
> It is written so that any one component can be explained in isolation. Read this
> top-to-bottom once and you can defend every decision.

---

## 1. What this is

A tool that automatically audits **HighLevel Voice AI** call transcripts so a human no
longer has to read logs by hand. For each agent it:

1. **Monitors** — ingests call transcripts and evaluates each one against that agent's
   success criteria (KPIs).
2. **Analyzes** — rolls the results into a dashboard that shows where agents fail, gives
   AI-written recommendations to fix the agent's script, and flags the exact call
   segments that need a human ("Use Actions").

The design principle throughout: **the simplest thing that closes the loop and can be
explained line-by-line.** No hidden magic, no heavy frameworks.

---

## 2. How it maps to the assignment

| Assignment requirement | Where it lives |
| --- | --- |
| Ingest & analyze existing transcripts | `backend/src/ingestion/*` + `backend/src/analysis/*` |
| Set observability parameters from the agent's goals/script | KPI hybrid flow — `analysis/suggestKpis.js` + KPI Config UI |
| Identify deviations / failures / missed opportunities | `analysis/analyzeTranscript.js` → `findings[]` |
| Unified dashboard visualizing issues across agents | Vue **Fleet Overview** view |
| Immediate recommendations for prompt/script adjustments | analysis → `recommendations[]`, shown on Agent Detail |
| Highlight "Use Actions" (segments needing a human) | analysis → `use_actions[]`, highlighted in Call view |
| Reside within the customer account | Frontend embedded in the sub-account via an iframe (Custom Menu Link / Custom Page) |

---

## 3. System at a glance

```
┌───────────────────────── HighLevel Sub-Account ─────────────────────────┐
│  Voice AI Agents ──▶ calls happen ──▶ transcripts generated              │
│        │ (agent config / goals)                    │ (webhook OR API pull)│
└────────┼───────────────────────────────────────────┼────────────────────┘
         │                                            │
         ▼                                            ▼
   ┌──────────────────────────── Node backend (Express) ──────────────────┐
   │                                                                       │
   │  ① INGEST   TranscriptSource ─ normalize ─▶ store transcript          │
   │  ② ANALYZE  (transcript + KPIs) ─▶ Claude ─▶ structured findings      │
   │  ③ STORE    SQLite  (agents · kpis · transcripts · analysis)          │
   │  ④ SERVE    REST API  /agents /calls /analysis /kpis /fleet           │
   │                                                                       │
   └───────────────────────────────┬───────────────────────────────────────┘
                                    ▼  (JSON over HTTP)
   ┌──────────────────────── Vue 3 dashboard (Vite) ──────────────────────┐
   │  Fleet Overview · Agent Detail · Call+Transcript · KPI Config         │
   │  embedded inside HighLevel via an iframe                              │
   └───────────────────────────────────────────────────────────────────────┘
```

The backend has exactly **four responsibilities** — ingest, analyze, store, serve — and
each is its own folder. If someone asks "where does X happen?", the answer is always one
of those four.

---

## 4. Repository layout

```
highlevel-assignment/
├─ ARCHITECTURE.md          ← this file
├─ README.md                ← install/run + Team-of-One + real-vs-mocked
├─ backend/
│  ├─ package.json
│  ├─ .env.example          ← GHL_PIT, GHL_LOCATION_ID, ANTHROPIC_API_KEY
│  └─ src/
│     ├─ index.js           ← Express bootstrap, mounts routes
│     ├─ config.js          ← reads/validates env
│     ├─ db/
│     │  ├─ schema.sql       ← the whole data model, readable as a spec
│     │  ├─ connection.js    ← opens the SQLite file (better-sqlite3)
│     │  └─ repositories.js  ← thin CRUD helpers (no SQL leaks into routes)
│     ├─ ghl/
│     │  └─ client.js        ← the ONLY file that knows HighLevel's API + PIT
│     ├─ ingestion/
│     │  ├─ TranscriptSource.js  ← interface (JSDoc contract)
│     │  ├─ FixtureSource.js     ← seeded transcripts
│     │  ├─ GhlPullSource.js     ← pulls call logs via ghl/client
│     │  ├─ normalize.js         ← GHL shape ─▶ internal Transcript shape
│     │  └─ ingestService.js     ← orchestrates: fetch ─▶ store ─▶ analyze
│     ├─ analysis/
│     │  ├─ anthropic.js         ← Claude client + structured-output helper
│     │  ├─ suggestKpis.js       ← agent script ─▶ proposed KPIs
│     │  ├─ analyzeTranscript.js ← transcript + KPIs ─▶ findings
│     │  └─ schemas.js           ← the JSON schemas Claude must fill
│     ├─ services/
│     │  └─ fleet.js             ← aggregation queries for the overview
│     └─ routes/
│        ├─ agents.js  kpis.js  calls.js  fleet.js  webhooks.js
│     └─ fixtures/
│        └─ transcripts/*.json   ← realistic sample calls
└─ frontend/
   ├─ package.json
   ├─ vite.config.js
   └─ src/
      ├─ main.js           ← Vue app + router + Pinia
      ├─ router.js
      ├─ api/client.js     ← typed fetch wrapper to the backend
      ├─ stores/           ← agents.js  calls.js  fleet.js  (Pinia)
      ├─ views/            ← FleetOverview  AgentDetail  CallDetail  KpiConfig
      └─ components/       ← AgentCard  KpiHealthBar  TranscriptViewer …
```

---

## 5. Data model (SQLite)

Four tables. `schema.sql` is the whole thing; here it is annotated.

```
agents
  id            TEXT PK          -- GHL agent id
  name          TEXT
  description   TEXT
  script        TEXT             -- the agent's prompt/instructions
  goals         TEXT (json)      -- the agent's configured goals/actions
  raw           TEXT (json)      -- full GHL config blob, kept for reference
  synced_at     TEXT

kpis                             -- success criteria, per agent
  id            TEXT PK
  agent_id      TEXT FK -> agents.id
  name          TEXT             -- "Confirms appointment date & time"
  description   TEXT             -- what it measures, in plain English
  category      TEXT             -- outcome | compliance | quality | experience
  rubric        TEXT             -- precise instruction Claude uses to judge pass/fail
  weight        INTEGER          -- relative importance (1–5)
  source        TEXT             -- ai_suggested | user
  status        TEXT             -- proposed | active
  created_at    TEXT

transcripts                      -- one row per call
  id            TEXT PK          -- GHL call/message id (or fixture id)
  agent_id      TEXT FK -> agents.id
  contact_id    TEXT
  direction     TEXT             -- inbound | outbound
  status        TEXT             -- completed | no-answer | …
  duration_sec  INTEGER
  started_at    TEXT
  source        TEXT             -- fixture | pull | webhook   (real-vs-mocked provenance)
  turns         TEXT (json)      -- [{ speaker:'agent'|'caller', text, ts }]
  raw           TEXT (json)
  ingested_at   TEXT

analysis_results                 -- one row per analyzed transcript
  id            TEXT PK
  transcript_id TEXT FK -> transcripts.id
  agent_id      TEXT FK -> agents.id
  overall_pass  INTEGER (0/1)
  overall_score INTEGER          -- 0–100
  summary       TEXT
  findings      TEXT (json)      -- [{ type, severity, description, evidence }]
  recommendations TEXT (json)    -- [{ target, suggestion, rationale, priority }]
  use_actions   TEXT (json)      -- [{ turn_start, turn_end, action_type, reason, quote }]
  model         TEXT             -- which Claude model produced this
  analyzed_at   TEXT

kpi_verdicts                     -- normalized so the fleet view can aggregate in SQL
  id            TEXT PK
  analysis_id   TEXT FK -> analysis_results.id
  transcript_id TEXT FK -> transcripts.id
  agent_id      TEXT FK -> agents.id
  kpi_id        TEXT FK -> kpis.id
  verdict       TEXT             -- pass | fail | partial
  confidence    REAL             -- 0–1
  evidence_quote TEXT            -- the exact line from the transcript
  evidence_turn INTEGER          -- index into transcripts.turns
  explanation   TEXT
```

**Why the split between `analysis_results` (JSON columns) and `kpi_verdicts` (normalized)?**
We *aggregate* KPI verdicts ("what % of this agent's calls confirmed the appointment?"),
so those live in a real table we can `GROUP BY`. We only ever *display* recommendations /
use-actions / findings, so they stay as JSON on the analysis row. That's a deliberate,
defensible normalization boundary — normalize what you query, JSON-blob what you render.

---

## 6. Ingestion — one interface, three sources

Everything that produces transcripts implements the same tiny contract, so the rest of the
system never knows or cares where a transcript came from. **This is the real-vs-mocked
seam.**

```js
// TranscriptSource.js  (the contract, expressed in JSDoc)
/**
 * @typedef {Object} RawCall  – whatever the source returns
 * @returns {Promise<Transcript[]>}  – normalized internal transcripts
 */
class TranscriptSource {
  async fetchRecent(sinceIso) { throw new Error('implement me'); }
}
```

| Implementation | Source of data | Status |
| --- | --- | --- |
| `FixtureSource` | `fixtures/transcripts/*.json` (seeded, realistic) | **mocked data**, real pipeline |
| `GhlPullSource` | `GET /voice-ai/dashboard/call-logs` via `ghl/client` | **real** — works when calls exist |
| webhook endpoint | `POST /webhooks/transcript` from GHL "Transcript Generated" trigger | **real** — real-time path |

All three pass through `normalize.js`, which maps the external shape to our internal
`Transcript` (`{ id, agentId, turns:[{speaker,text,ts}], direction, durationSec, … }`).
`ingestService.js` is the orchestrator: **fetch → dedupe → store → analyze → store result.**

To go from "demo on fixtures" to "live production", you change one line — which
`TranscriptSource` you construct. Nothing downstream changes. That single swap point is the
whole "functional vs mocked" story, and it's honest.

---

## 7. HighLevel API client (`ghl/client.js`)

The **only** file that knows HighLevel exists. Authenticated with a **Private Integration
Token** (a single token minted per sub-account — no OAuth dance for the assignment).

```
Base URL : https://services.leadconnectorhq.com
Headers  : Authorization: Bearer <GHL_PIT>
           Version: 2021-07-28
```

Confirmed endpoints it wraps:

| Method | Purpose |
| --- | --- |
| `GET /voice-ai/agents` | list agents (feeds `agents` table) |
| `GET /voice-ai/agents/:id` | agent config → script/goals for KPI suggestion |
| `GET /voice-ai/dashboard/call-logs` | list call logs (pull ingestion) |
| `GET /voice-ai/dashboard/call-logs/:id` | one call + its transcript |
| `GET /conversations/locations/:loc/messages/:id/transcription` | fallback transcript source for LC-Phone/IVR calls |

Scopes the PIT needs: `voice-ai-agents.readonly`, `voice-ai-dashboard.readonly`,
`conversations/message.readonly`.

Production note (README): swap the PIT for OAuth 2.0 — same client, the only change is how
the `Authorization` header's token is obtained and refreshed.

---

## 8. Analysis engine — the "AI brain"

Two **Claude structured-output** calls. Both force Claude to fill a fixed JSON schema (via
tool-use), so the output is always machine-readable — no fragile parsing of prose.

### 8a. `suggestKpis(agent)` — sets the observability parameters

Input: the agent's `name`, `description`, `script`, `goals`.
Output schema:

```json
{ "kpis": [
  { "name": "…", "description": "…",
    "category": "outcome|compliance|quality|experience",
    "rubric": "precise, testable instruction for judging a transcript",
    "weight": 1 }
] }
```

The `rubric` is the important field — it's the exact instruction the analyzer later uses to
score a call, so KPIs are self-describing. These come back as `status:'proposed'`; the user
confirms/edits them in the KPI Config UI, at which point they become `status:'active'`.
**That confirm step is the "hybrid" — AI proposes, human owns.**

### 8b. `analyzeTranscript(transcript, activeKpis)` — the core evaluation

Input: the normalized transcript turns + the agent's active KPIs (each with its rubric).
Output schema (this is what drives the entire dashboard):

```json
{
  "overall_pass": true,
  "overall_score": 0,
  "summary": "one-line what-happened",
  "kpi_verdicts": [
    { "kpi_name": "…", "verdict": "pass|fail|partial", "confidence": 0.0,
      "evidence_quote": "exact transcript line",
      "evidence_turn": 7, "explanation": "…" }
  ],
  "findings": [
    { "type": "deviation|failure|missed_opportunity",
      "severity": "low|med|high", "description": "…", "evidence": "…" }
  ],
  "recommendations": [
    { "target": "prompt|script|config",
      "suggestion": "concrete edit to make",
      "rationale": "why", "priority": "low|med|high" }
  ],
  "use_actions": [
    { "turn_start": 5, "turn_end": 8,
      "action_type": "human_intervention|script_training",
      "reason": "why a human is needed here", "quote": "…" }
  ]
}
```

Every verdict and use-action carries a **turn index + exact quote**, which is what lets the
Call view highlight the precise segment. The prompt instructs Claude to only cite text that
literally appears in the transcript (so highlights always resolve). The model is the latest
Claude (recorded in `analysis_results.model` for provenance).

**Closing the loop:** raw transcript → per-KPI verdicts (Monitor) → findings +
recommendations + flagged segments (Analyze). Optional stretch that literally closes the
"flywheel": an *Apply fix* button that writes an improved prompt back to the agent via
`voice-ai-agents.write` — documented but gated behind a confirm, since it mutates the
customer's agent.

---

## 9. REST API surface

Thin controllers over the services. Predictable REST.

| Method + path | Does |
| --- | --- |
| `POST /api/agents/sync` | pull agents from GHL (or load fixtures) into DB |
| `GET  /api/agents` | list agents with rolled-up health |
| `GET  /api/agents/:id` | agent detail + KPIs + aggregate |
| `POST /api/agents/:id/kpis/suggest` | Claude proposes KPIs (not saved) |
| `PUT  /api/agents/:id/kpis` | save the user-confirmed KPI set |
| `GET  /api/agents/:id/kpis` | list KPIs |
| `POST /api/ingest/sync` | pull recent calls (or fixtures) → store → analyze new |
| `GET  /api/calls?agentId=` | list transcripts for an agent |
| `GET  /api/calls/:id` | transcript + its analysis |
| `POST /api/calls/:id/analyze` | (re)run analysis on one call |
| `POST /api/webhooks/transcript` | receive "Transcript Generated" → ingest + analyze |
| `GET  /api/fleet` | cross-agent aggregates for the overview |

---

## 10. Frontend (Vue 3 + Vite + Pinia)

Four views, a shallow component tree, three small stores. Nothing clever.

| View (route) | Shows |
| --- | --- |
| **Fleet Overview** `/` | one card per agent: health score, per-KPI pass-rate bars, count of open Use-Actions; plus a "top recurring failures across the fleet" list |
| **Agent Detail** `/agents/:id` | agent header (name + script summary), KPI health breakdown, aggregated recommendations, and the list of calls (pass/fail + score) |
| **KPI Config** `/agents/:id/kpis` | the AI-suggested KPIs, editable, with a Confirm button (the hybrid flow) |
| **Call Detail** `/calls/:id` | the transcript rendered as turns, **Use-Action segments highlighted**, a side panel of per-KPI verdicts (click evidence → scrolls to the turn), findings, and recommendations |

- **Stores:** `agents`, `calls`, `fleet` (Pinia). Each store owns its slice of state and the
  API calls that fill it — components stay presentational.
- **API client** (`api/client.js`): one typed `fetch` wrapper; every network call goes
  through it, so there's one place to reason about requests/errors.
- **Key components:** `AgentCard`, `KpiHealthBar`, `ScoreBadge`, `TranscriptViewer`,
  `TurnBubble`, `VerdictPanel`, `RecommendationCard`, `UseActionChip`.

---

## 11. HighLevel integration (how it "resides in the customer account")

- The frontend is a normal web app hosted at a URL (locally: Vite dev server + a tunnel).
- Inside the sub-account, add a **Custom Menu Link / Custom Page** pointing at that URL.
  HighLevel renders it in an **iframe** and passes the **location (sub-account) context**
  (e.g. `locationId`) via the link — the app reads it to scope its data.
- The **backend** authenticates to GHL with the **PIT** for that same location.
- We deliberately do **not** use the Custom JS injection panel (from the screenshot): it's
  agency-level, needs manual review (~10-day SLA), and is fragile against GHL DOM changes.
  The iframe embed is cleaner, review-free, and fully owned by us. (Documented in README as
  the reasoned trade-off.)

---

## 12. What is functional vs mocked (honest boundary)

| Piece | Real / Functional | Mocked | Notes |
| --- | --- | --- | --- |
| GHL API client + auth (PIT) | ✅ | | Real endpoints, real token |
| Agent ingestion | ✅ | | Pulls real agents if present; fixtures otherwise |
| Transcript **pipeline** (normalize→store→analyze) | ✅ | | Fully real |
| Transcript **data** | ✅ (webhook + pull wired) | ⚠️ demoed on fixtures | Live data needs real calls placed in the sandbox; adapter swap is one line |
| KPI suggestion (Claude) | ✅ | | Real |
| Transcript analysis (Claude) | ✅ | | Real |
| Dashboard (all views) | ✅ | | Real |
| iframe embed in sub-account | ✅ | | Real |
| Apply-fix write-back to agent | | ⚠️ optional stretch | Gated behind confirm |

---

## 13. End-to-end walkthroughs (interview crib)

**A. "How do KPIs get set for an agent?"**
`POST /agents/:id/kpis/suggest` → `suggestKpis()` reads the agent's script/goals →
Claude returns proposed KPIs (each with a rubric) → shown in KPI Config → user edits →
`PUT /agents/:id/kpis` saves them as `active`. AI proposes, human owns.

**B. "What happens when a call comes in?"**
GHL fires "Transcript Generated" → `POST /webhooks/transcript` → `normalize.js` maps it to
our `Transcript` → stored → `analyzeTranscript()` runs it against the agent's active KPIs →
`analysis_results` + `kpi_verdicts` rows written. The call now appears on the dashboard with
verdicts, recommendations, and highlighted segments. (Same path for `POST /ingest/sync`,
just pulling instead of receiving.)

**C. "How does the Fleet Overview compute health?"**
`GET /fleet` → `services/fleet.js` runs `GROUP BY` over `kpi_verdicts` per agent
(pass-rate per KPI, count of high-severity findings, open use-actions) → returns compact
aggregates → the store fills the cards. No AI at read-time; it's plain SQL over stored
analyses, so it's instant and explainable.

---

## 14. Team-of-One ownership (for the README)

- **Product:** scoped to the two loops the brief names (Monitor, Analyze) and resisted
  scope creep; the KPI "hybrid" is the product bet — automation that a human still owns.
- **Design:** four views, one job each; evidence-linked highlighting so a finding is never
  an unfalsifiable claim — you can always click to the transcript line.
- **Engineering:** four-responsibility backend, one integration seam (TranscriptSource),
  one file that knows GHL, one file that knows Claude. Boring on purpose.
- **QA:** fixtures double as test data; deterministic structured-output schemas make the
  analyzer assertable; the real-vs-mocked table is the test matrix.

---

## 15. Tech choices & why (defensible one-liners)

- **Express + SQLite** — most universally understood; one-file DB, zero infra; transparent
  request flow (no DI/decorators hiding control flow).
- **better-sqlite3** — synchronous, so no async pooling ceremony; queries read like SQL.
- **PIT over OAuth** — one token, minimal surface; OAuth documented as the production path.
- **Claude structured output (tool-use)** — reliable JSON, no prose-parsing; schemas are the
  contract between AI and app.
- **iframe embed over Custom JS** — no review SLA, not DOM-fragile, fully owned.
- **Vue 3 + Vite + Pinia** — required stack; kept shallow so every component is obvious.
```
