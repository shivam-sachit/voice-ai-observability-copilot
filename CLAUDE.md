# Voice AI Observability Copilot — Project Guide

> Orientation, engineering conventions, and current status for this repository.
> New to the repo? Read this file, then `ARCHITECTURE.md`, then `DECISIONS.md`.

## Read order
1. **`ARCHITECTURE.md`** — how the system works: diagram, repo layout, data model, module
   responsibilities, the ingestion seam, the analysis prompt/schema, the API, the frontend,
   and how it embeds in HighLevel.
2. **`DECISIONS.md`** — the decision log (ADRs): every non-trivial decision, the alternatives
   considered, and why we chose what we chose. ADR-001..016 so far.
3. **`docs/GHL_API_NOTES.md`** — HighLevel platform research: confirmed endpoints, scopes,
   webhooks, the iframe-vs-CustomJS integration finding, and the few response shapes still to
   verify against a live sandbox.

## What this is
A **Voice AI Observability Copilot** for HighLevel. It ingests Voice AI **call transcripts**,
evaluates each one against that agent's **KPIs**, and surfaces failures, AI-written
**recommendations**, and flagged **"Use Action"** segments in a dashboard **embedded inside
HighLevel**. Deliverables: this repo (Node backend + Vue frontend), sandbox install/run docs,
a short demo video, and a README covering architecture, "Team of One" ownership, and what is
functional vs mocked.

## Stack (rationale for each is in `DECISIONS.md`)
- **Frontend:** Vue 3 + Vite + Pinia, hosted externally, **embedded in HighLevel via an
  iframe** (Custom Menu Link / Custom Page) — not Custom JS injection (ADR-002).
- **Backend:** Node + **Express** + **SQLite** (`better-sqlite3`) (ADR-005/006).
- **HighLevel auth:** **Private Integration Token** for the build; OAuth is the production
  path (ADR-003).
- **KPIs:** hybrid — the tool suggests KPIs from the agent's script/goals, the user confirms
  (ADR-004).
- **AI:** Claude via structured output (tool-use), two calls — `suggestKpis` and
  `analyzeTranscript` (ADR-008/013).
- **Ingestion:** one `TranscriptSource` interface, three implementations — fixtures / GHL
  pull / webhook — which is the functional-vs-mocked seam (ADR-001/010).

## Engineering conventions
- **Ownership first.** Every part of this codebase should be understandable and explainable
  by its author. Prefer boring, transparent, widely-known tools over clever abstractions; no
  hidden magic.
- **Design before code.** Architecture and decisions are documented before implementation.
  Build in small, reviewable steps, each its own commit — no single large dump.
- **Keep the decision log current.** Append an ADR to `DECISIONS.md` for every non-trivial
  decision, including the alternatives rejected and why.
- **Keep the "Current status" section below current** so the next work session can resume
  immediately.
- **Don't re-run discovery.** Platform research already done lives in `docs/GHL_API_NOTES.md`.
- **Review cadence (ADR-023).** On-demand Opus audit-loop, plus a model-diverse **Fable
  `/review`** (adapted to the slice's commit range, since we're on linear `main`) at slice
  boundaries — after Task 8, after Task 11, and a light pass before submission.

---

## Current status  (last updated: 2026-07-19)

**Phase:** Backend core (Tasks 1–5) built and audit-hardened (4-cycle Opus audit → ship-ready). Next: Task 6.

**Done**
- [x] Assignment scoped; HighLevel API discovery complete (`docs/GHL_API_NOTES.md`).
- [x] Architecture blueprint (`ARCHITECTURE.md`).
- [x] Decision log (`DECISIONS.md`, ADR-001..025).
- [x] Repo initialized (`main`); pushed to public remote
  `shivam-sachit/voice-ai-observability-copilot`.
- [x] Monorepo skeleton scaffolded and **verified runnable** (backend boots, `/api/health`
  → 200; frontend builds). Deps installed; `package-lock.json` committed in both packages.
  Feature files exist as stubs that state their contract in comments.
- [x] SQLite storage layer (Task 3): `db/connection.js`, `db/init.js` (`npm run db:init`),
  `db/repositories.js`. Verified with a smoke test across agents/kpis/transcripts/analysis.
- [x] GHL API client (Task 4): `ghl/client.js` — PIT-authed transport for listAgents /
  getAgent / listCallLogs / getCallLog. Verified with a mocked fetch (URL, headers, errors).
- [x] Ingestion adapter (Task 5): `normalize.js`, `FixtureSource`, `GhlPullSource`,
  `ingestService` (fetch → dedupe → ensure-agent → store; analyzer injected in Task 7). Two
  fixture calls seeded. Verified: fixtures load + dedupe; normalizers handle array + string.
- [x] Audit loop (Opus, 4 cycles): 16 findings fixed across 3 commits (null-safety, hot-path
  indexes + UNIQUE invariant, batch resilience, config/CORS edge cases); 1 false positive
  declined, 1 reasoned scope decision. Final cycle returned SHIP-READY.
- [x] Fixtures + seed (Task 6): 2 agents (booking + solar qualifier), 6 transcripts with
  varied outcomes/failure modes; `src/db/seed.js` (`npm run seed`, idempotent). Verified load.
- [x] Analysis engine (Task 7): `analysis/{anthropic,schemas,suggestKpis,analyzeTranscript,
  analyzeService}.js` — Claude structured outputs, default `claude-opus-4-8`. Verified with a
  stubbed Claude API (mapping + FK-safe verdict filtering + full analyze→store path).
- [x] REST API (Task 8): `routes/*` over the services; `services/{fleet,agentSync}.js`,
  `db/aggregations.js`; asyncHandler + central error middleware; server self-inits schema on
  boot; config-driven degradation (fixtures/GHL, analysis on/off). **Backend loop is complete.**
  Verified with a 12-check in-process HTTP integration test.

**Build roadmap**
- [x] 2. Scaffold monorepo skeleton — runnable; feature files are stubs stating their contract.
- [x] 3. SQLite data model + storage layer — connection, init, repositories (verified).
- [x] 4. GHL API client with PIT auth — thin transport (verified with mocked fetch).
- [x] 5. Ingestion adapter — normalize + FixtureSource + GhlPullSource + ingestService (verified).
- [x] 6. Seed realistic transcript fixtures — 2 agents, 6 calls + `npm run seed` (verified).
- [x] 7. Claude analysis engine + KPI suggestion — structured outputs (verified via mock).
- [x] 8. Backend REST API endpoints — full loop over HTTP (verified with 12-check test).
- [ ] **18. Fable /review: backend slice** ← NEXT (per ADR-023, before starting the frontend)
- [ ] 8. Backend REST API endpoints
- [ ] 9. Vue dashboard scaffold + Pinia stores + API client
- [ ] 10. Fleet + Agent-detail + Call-transcript views
- [ ] 11. KPI config UI (AI-suggested + confirm)
- [ ] 12. GHL iframe embed + install/run docs + README + demo script
- [ ] **Educate-me walkthrough** (after Task 12) — teach the user the full system
  end-to-end so they can own and defend every part in the interview.

**Immediate next step:** Task 18 — Fable `/review` on the backend slice (commit range for
Tasks 6–8: fixtures, seed, analysis engine, routes/services). Validate → fix → commit. Then
Task 9 (Vue dashboard scaffold).

**Repository:** https://github.com/shivam-sachit/voice-ai-observability-copilot — public,
personal account (`shivam-sachit`), remote `origin`, default branch `main`.

**Environment:** Windows, Node 24 / npm 11. Secrets live in `backend/.env` (see
`.env.example`): `GHL_PIT`, `GHL_LOCATION_ID`, `ANTHROPIC_API_KEY`.

## Document map
| File | Purpose |
| --- | --- |
| `CLAUDE.md` (this) | Orientation + engineering conventions + live status |
| `ARCHITECTURE.md` | How the system works |
| `DECISIONS.md` | Why — the ADR decision log |
| `docs/GHL_API_NOTES.md` | HighLevel API research |
| `README.md` | (later) install/run + Team-of-One + functional-vs-mocked |

<sub>This file also serves as the repository's Claude Code project context (auto-loaded by the Claude Code CLI).</sub>
