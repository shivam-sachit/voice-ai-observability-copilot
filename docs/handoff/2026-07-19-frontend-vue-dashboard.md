# Handoff — Voice AI Observability Copilot: build the Vue frontend

## Next-session prompt (copy-paste)

```
Read docs/handoff/2026-07-19-frontend-vue-dashboard.md first, then CLAUDE.md, ARCHITECTURE.md,
and DECISIONS.md. Project: a "Voice AI Observability Copilot" for the FSB hiring assignment.

The backend is complete, tested, and reviewed. Your job is the frontend (Vue 3 + Vite + Pinia),
starting with Task 9. Follow every working directive in the handoff and CLAUDE.md — especially:
I must be able to own and explain every line (manual code review + interview), so keep it
transparent and boring; write/adjust the blueprint before big code; build in reviewable chunks
and explain each piece; append an ADR to DECISIONS.md for every non-trivial decision; keep
CLAUDE.md's "Current status" current; commit incrementally to main with clean messages (author
is already set repo-local; no AI attribution).

Immediate next action: Task 9 — flesh out the three Pinia stores (agents/calls/fleet) and
frontend/src/api/client.js against the finished REST API (endpoints + response shapes are in the
handoff), then Tasks 10–11 build the four views. After Task 11, run a Fable /review on the
frontend slice (Task 19), then Task 12 (iframe embed into a HL sub-account + install/run docs +
README + demo script). We committed to an educate-me walkthrough at the very end — don't skip it.

Dev loop: `cd backend && npm run dev` (port 3000, self-inits schema) then `npm run seed` to load
fixtures; `cd frontend && npm run dev` (port 5173, Vite proxies /api → 3000). Live AI analysis
needs ANTHROPIC_API_KEY in backend/.env — without it, agents/calls still show but analysis is
skipped. No PRs are in play; work on main.
```

---

## Where things stand

This is a hiring take-home: build a tool that ingests HighLevel Voice AI **call transcripts**,
grades each call against per-agent **KPIs**, and surfaces failures + AI recommendations + flagged
"Use Action" segments in a dashboard embedded inside HighLevel. Deliverables: a public GitHub
repo (Node backend + Vue frontend), sandbox install/run docs, a short demo video, and a README
covering architecture, "Team of One" ownership, and what's functional vs mocked.

**The entire backend is done, verified, and reviewed.** The whole loop works over HTTP: sync
agents → AI-suggest KPIs → user confirms → ingest + analyze → fleet/agent/call rollups →
re-analyze. It's been through a 4-cycle Opus audit (16 fixes, ship-ready) and a model-diverse
Fable review (10 more fixes). Backend tasks 1–8 and review task 18 are complete.

**The frontend is a runnable skeleton only** — it builds and navigates, but the views are
placeholder text and the Pinia stores are stubs with commented-out action signatures. Building it
for real is the remaining work (tasks 9–12, plus the frontend review task 19).

Repo: https://github.com/shivam-sachit/voice-ai-observability-copilot (public, personal account
`shivam-sachit`, not the Fibr org). Branch `main`, everything pushed.

## Commits this session (all on `main`, pushed)

```
b8e3622  fix(backend): apply Fable /review findings (backend slice)
f2af60b  feat(api): REST endpoints over the services — the backend loop is complete
162c3f6  feat(analysis): Claude structured-output analysis engine (KPI suggestion + grading)
8339bcb  feat(fixtures): add solar-qualifier agent, more calls, and a seed script
ed3e5fe  docs: record review-cadence decision (ADR-023)
0e2c56f  docs: record audit-loop outcome (4 cycles, ship-ready)
28a6f02  fix(backend): address audit cycle-3 findings
2996fc2  fix(backend): address audit cycle-2 findings
41e5f4a  fix(backend): address audit cycle-1 findings
a67bc5e  feat(ingestion): transcript adapter (normalize + fixture/pull sources + service)
230dd86  feat(ghl): PIT-authenticated HighLevel API client
c10a85a  feat(db): SQLite storage layer — connection, init, repositories
1f2b359  chore: scaffold runnable monorepo skeleton (backend + frontend)
923e39e  docs: record public repository URL in project guide
0b85b89  docs: log version-control and CLAUDE.md decisions (ADR-017/018)
a6c52c5  docs: add architecture blueprint, decision log, and platform research
```

Re-derive current state anytime with `git log --oneline` and `git status --porcelain`.

**Working tree (as of 2026-07-19):** clean before this handoff. This handoff file is a **new,
untracked** file — commit it on its own (I intend to commit + push it as part of the handoff) so
it doesn't ride along with unrelated frontend work.

**PRs:** none. We commit directly to `main` (a deliberate choice — see ADR-017).

## The working directives to carry forward (the user's explicit ask)

These shape *how* to build, not just what. They're recorded durably in `CLAUDE.md` (conventions)
and `DECISIONS.md` (ADRs); listed here so nothing is lost in translation:

1. **Ownership above all.** The user is submitting this and will be interviewed on it, and it goes
   through a manual "non-slop" code review. Every part must be understandable and defensible by
   the user. Favor boring, transparent, widely-known tools over clever abstractions. No hidden
   magic. This is *why* the stack is Express + SQLite + plain Vue/Pinia rather than anything
   heavier.
2. **Blueprint before code; build in reviewable chunks.** Update `ARCHITECTURE.md` if the frontend
   plan changes, then build a piece at a time and explain what each piece does as it lands. Do not
   dump the whole frontend at once.
3. **Preserve every decision.** Append a new ADR to `DECISIONS.md` for each non-trivial choice
   (component structure, charting approach, state shape, styling method…), with the alternatives
   you rejected and why. Keep `CLAUDE.md`'s "Current status" section updated at the end of the
   session.
4. **Don't re-run discovery.** HighLevel platform research is already in `docs/GHL_API_NOTES.md`.
   The repo is meant to be self-onboarding via `CLAUDE.md`.
5. **Git discipline.** Linear history on `main`, one clean commit per coherent chunk (not one big
   dump — that reads as generated). Commit author is set repo-local to `Sachit Shivam
   <sachit.shivam@gmail.com>` (do not touch global config). No AI attribution in commit messages;
   no force-push / amend / rebase. The user has been fine with committing each task as it lands.
6. **Review cadence (ADR-023).** After Task 11, run a **Fable** `/review` against the frontend
   slice's commit range (that's Task 19), validate the findings yourself, fix, commit — the same
   validate-then-fix discipline used on the backend. The on-demand Opus audit-loop is also
   available if you want a second lens.
7. **The educate-me walkthrough** is a promised final step once everything is built — a teaching
   pass so the user can defend the whole system. Tracked in the CLAUDE.md roadmap; don't drop it.

## The frontend work (your focus)

Plan and screen list live in **`ARCHITECTURE.md` §10–11**. Summary:

- **Stack:** Vue 3 (Composition API) + Vite + Pinia. Hosted externally, embedded in a HighLevel
  sub-account via an **iframe** (Custom Menu Link / Custom Page) — not Custom JS injection (ADR-002).
- **What exists:** `frontend/src/` has `main.js`, `router.js` (4 routes wired), `App.vue` (bare
  top-bar shell), `api/client.js` (a small typed `get/post/put` fetch wrapper — already works),
  three Pinia stores (`stores/{agents,calls,fleet}.js` — **stubs**, actions commented out), and
  four placeholder views (`views/{FleetOverview,AgentDetail,KpiConfig,CallDetail}.vue`).
  `components/` is empty (just a `.gitkeep`).
- **Task 9** — flesh out the stores + `api/client.js` against the real API.
- **Task 10** — Fleet Overview (agent cards + KPI pass-rate bars + fleet failures), Agent Detail
  (KPI breakdown + recommendations + call list), Call Detail (transcript with **highlighted
  Use-Action segments**, per-KPI verdicts, click-evidence-to-scroll).
- **Task 11** — KPI Config (AI-suggests from the agent's script, user edits/confirms — the hybrid
  flow, ADR-004).

**The finished REST API the frontend consumes** (base `/api`, all verified working):

| Method + path | Returns |
| --- | --- |
| `POST /agents/sync` | `{ source, count }` — loads fixtures (or GHL if a PIT is set) |
| `GET /agents` | array of agents, each with a `health` rollup |
| `GET /agents/:id` | agent + `kpis` + `health` |
| `GET /agents/:agentId/kpis` | array of KPIs (404 if agent unknown) |
| `POST /agents/:agentId/kpis/suggest` | `{ kpis: [...] }` — AI-proposed, **not saved** |
| `PUT /agents/:agentId/kpis` `{ kpis }` | saves them active; `400` if a KPI lacks name/rubric |
| `GET /calls?agentId=` | transcripts, each with `{ analyzed, overallScore, overallPass }` |
| `GET /calls/:id` | `{ ...transcript, analysis }` (analysis is `null` if not analyzed) |
| `POST /calls/:id/analyze` | `{ analysis }`; `409` if the agent has no active KPIs |
| `POST /ingest/sync` | `{ source, ingested, analyzed, analyzeSkipped, analyzeFailed, ... }` |
| `GET /fleet` | `{ agents: [...] }` — see health shape below |
| `POST /webhooks/transcript` | GHL "Transcript Generated" → ingest+analyze |

**Health rollup shape** (from `/fleet` and `/agents/:id`.health):
`{ totalCalls, analyzedCalls, avgScore, healthScore, useActionCount, kpiPassRates: [{ kpiId, name, pass, fail, partial, total, passRate }] }`.

**Analysis shape** (`GET /calls/:id`.analysis): `{ overallPass, overallScore, summary,
findings:[{type,severity,description,evidence}], recommendations:[{target,suggestion,rationale,priority}],
useActions:[{turn_start,turn_end,action_type,reason,quote}], model, analyzedAt,
verdicts:[{kpiId, verdict, confidence, evidenceQuote, evidenceTurn, explanation}] }`.

**Transcript shape:** `{ id, agentId, direction, status, durationSec, startedAt, source,
turns:[{speaker:'agent'|'caller', text, ts}], ... }`. The Call Detail view highlights the turns
referenced by `verdicts[].evidenceTurn` and by `useActions[].turn_start..turn_end` — that
evidence-to-transcript link is the core UX and a graded "Use Actions" requirement.

**Design matters here** — "Product Thinking + UI/UX" and "seamlessly integrated into HighLevel"
are explicit scoring criteria. The HighLevel marketplace UI is a clean light theme with blue
accents; matching that reads as "integrated." Consider the `frontend-design` skill for the views
and the `dataviz` skill for the KPI health bars / score badges.

## Things to keep in mind (gotchas from this session)

- **Live AI needs a key.** KPI suggestion and analysis call Claude. Without `ANTHROPIC_API_KEY` in
  `backend/.env`, those endpoints throw (surface as `500`) and ingest just stores transcripts
  (`analyzeSkipped`). The dashboard should degrade gracefully: agents + transcripts render, but
  analysis/health are empty until a key is set and KPIs are confirmed. For the demo, set a key and
  confirm KPIs for at least one agent before ingesting.
- **Default model is `claude-opus-4-8`** (best analysis quality — analysis is graded). Override
  with `ANTHROPIC_MODEL=claude-sonnet-5` for cheaper/faster runs. Confirmed valid via the
  `claude-api` skill (ADR-024).
- **Windows environment.** Node 24 / npm 11. The `LF will be replaced by CRLF` warnings on every
  commit are cosmetic — `.gitattributes` normalizes to LF in the repo. `better-sqlite3` 12
  installed via a prebuilt binary (no native compile needed).
- **Dev DB** is `backend/data/observability.db` (gitignored). The server self-inits the schema on
  boot; run `npm run seed` to load the 2 fixture agents + 6 transcripts.
- **Local test scripts are NOT in the repo.** During the backend build I wrote throwaway tests
  (`test-db`, `test-ghl`, `test-ingest`, `test-analysis`, `test-analysis-store`, `test-api`) in the
  session scratchpad — they're machine-local and uncommitted. They all pass; a new session on the
  same machine can re-run them, otherwise write fresh ones. Two reusable tricks they use: (a) the
  Anthropic/GHL SDKs go through global `fetch`, so you can stub it — but the Anthropic SDK captures
  `fetch` at client construction, so use one stable stub reading a mutable payload rather than
  reassigning `fetch` between calls; (b) `process.exit()` while a better-sqlite3 WAL connection is
  open triggers a libuv assert on Windows — call `closeDb()` first.
- **No auth on the API yet** — it's the first HTTP surface, CORS is configurable via `CORS_ORIGIN`,
  real request auth is a documented production follow-up. Fine for the sandbox demo.

## Pointers (where the rest of the context lives)

- `CLAUDE.md` — project guide, engineering conventions, and the live "Current status" + roadmap.
  Auto-loaded by Claude Code every session.
- `ARCHITECTURE.md` — how the system works; §5 data model, §8 analysis schema, §10–11 frontend +
  iframe integration.
- `DECISIONS.md` — the full ADR log (ADR-001…025), including the addenda from the audit and Fable
  review. Read ADR-002 (iframe), ADR-004 (hybrid KPIs), ADR-011 (Vue/Pinia), ADR-023 (review
  cadence) before frontend work.
- `docs/GHL_API_NOTES.md` — HighLevel API research (endpoints, scopes, webhooks, iframe-vs-CustomJS).
- Assistant memory (machine-local, not in the repo): `highlevel-voice-ai-copilot-assignment`,
  `user-needs-full-code-ownership`, `maintain-decision-log-with-reasoning`.
