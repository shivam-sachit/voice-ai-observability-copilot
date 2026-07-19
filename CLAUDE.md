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

---

## Current status  (last updated: 2026-07-19)

**Phase:** Documentation complete; git initialized; implementation not started.

**Done**
- [x] Assignment scoped; HighLevel API discovery complete (`docs/GHL_API_NOTES.md`).
- [x] Architecture blueprint (`ARCHITECTURE.md`).
- [x] Decision log (`DECISIONS.md`, ADR-001..016).
- [x] Repo initialized; docs committed as the first commit.

**Build roadmap**
- [ ] **2. Scaffold monorepo skeleton** ← NEXT: folders, `package.json` ×2, `.gitignore`,
  `schema.sql`, `.env.example`, empty module stubs with contracts in comments.
- [ ] 3. SQLite data model + storage layer
- [ ] 4. GHL API client with PIT auth
- [ ] 5. Ingestion adapter (fixtures + pull + webhook)
- [ ] 6. Seed realistic transcript fixtures
- [ ] 7. Claude analysis engine + KPI suggestion
- [ ] 8. Backend REST API endpoints
- [ ] 9. Vue dashboard scaffold + Pinia stores + API client
- [ ] 10. Fleet + Agent-detail + Call-transcript views
- [ ] 11. KPI config UI (AI-suggested + confirm)
- [ ] 12. GHL iframe embed + install/run docs + README + demo script

**Immediate next step:** Task 2 — scaffold the monorepo skeleton (no business logic yet).

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
