# Voice AI Observability Copilot

An observability layer for **HighLevel Voice AI agents**. It ingests call transcripts,
evaluates each one against that agent's success criteria (KPIs), and surfaces failures,
AI-written recommendations, and the exact call segments that need a human — in a dashboard
that embeds inside HighLevel.

> Moves the "Monitor" and "Analyze" phases from manual log review to an automated
> validation flywheel.

## What it does

- **Monitor** — ingests Voice AI transcripts and scores each call against per-agent KPIs,
  flagging deviations, failures, and missed opportunities.
- **Analyze** — a dashboard that shows KPI health across all agents, gives concrete
  recommendations to improve each agent's prompt/script, and highlights **"Use Action"**
  segments (the specific turns needing human intervention or script training).

## Architecture in one line

`transcripts → ingest (adapter) → analyze vs KPIs (Claude) → store (SQLite) → serve (Express) → dashboard (Vue, embedded in HighLevel)`

The backend has four responsibilities — **ingest, analyze, store, serve** — each its own
folder. Full detail in **[ARCHITECTURE.md](ARCHITECTURE.md)**; the reasoning behind every
choice is in **[DECISIONS.md](DECISIONS.md)**.

## Tech

| Layer | Choice |
| --- | --- |
| Frontend | Vue 3 + Vite + Pinia (embedded in HighLevel via an iframe) |
| Backend | Node + Express |
| Storage | SQLite (`better-sqlite3`) |
| AI | Claude (structured output) |
| HighLevel auth | Private Integration Token (OAuth = production path) |

## Repository layout

```
backend/    Node + Express API (ingest · analyze · store · serve)
frontend/   Vue 3 dashboard
docs/       Platform research (HighLevel API notes)
ARCHITECTURE.md   How the system works
DECISIONS.md      Why — the decision log (ADRs)
CLAUDE.md         Project guide + current status
```

## Getting started

> Detailed sandbox install/run steps are added in a later step (see `CLAUDE.md` → Current
> status). Quick local run:

```bash
# Backend
cd backend
cp .env.example .env         # fill in GHL_PIT, GHL_LOCATION_ID, ANTHROPIC_API_KEY
npm install
npm run dev                  # http://localhost:3000  (GET /api/health)

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

## Status

Early build. The skeleton runs end-to-end (server boots, dashboard navigates); feature
modules are being filled in the order tracked in `CLAUDE.md`. What is functional vs. mocked
(notably transcript ingestion) is documented there and will be summarized here on completion.
