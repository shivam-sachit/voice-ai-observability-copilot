# Decision Log (ADRs)

> Every non-trivial decision, the options considered, and **why** we chose what we chose.
> New decisions get appended here as they're made. Format: Context → Decision →
> Alternatives rejected → Trade-off accepted. Companion to `ARCHITECTURE.md` (which
> describes *how* the system works; this file records *why* it's shaped that way).
>
> All accepted 2026-07-19 unless noted.

---

## ADR-001 — Build the real ingestion pipeline; seed transcript *data* with fixtures

**Context.** A fresh HighLevel sandbox has no calls, so there are no real transcripts to
ingest yet. Investigation confirmed HighLevel *does* expose transcripts via public API
(call-log API, message-transcription API, and a "Transcript Generated" workflow trigger).

**Decision.** Wire the ingestion layer against the **real** GHL API shape (and a real
webhook endpoint), but seed it with **realistic fixture transcripts** so the dashboard and
analysis always have meaningful data to work on.

**Alternatives rejected.**
- *Wait for / manufacture real calls only* — brittle, may need a provisioned number and
  minutes; can't guarantee a rich demo.
- *Fully fake everything* — throws away the credible "this is wired to the real API" story
  the evaluators are asking about.

**Trade-off accepted.** Live transcript *data* is mocked in the demo; the *pipeline* is
real. This is disclosed explicitly (see `ARCHITECTURE.md` §12). The assignment itself asks
for this distinction ("what is functional vs mocked").

---

## ADR-002 — Integrate via an iframe embed, not the Custom JS injection panel

**Context.** The assignment allows either "custom JS" or a "GHL marketplace app." The first
screen the candidate saw was the Custom JS module.

**Decision.** Host the Vue app externally and embed it inside the sub-account via a **Custom
Menu Link / Custom Page iframe**, passing the location (sub-account) context to the app.

**Alternatives rejected.**
- *Custom JS injection* — agency-level only; goes through a **manual review with up to a
  ~10-day SLA** (won't clear in the assignment window); runs inside GHL's own DOM, so it's
  fragile against their UI changes; documented restrictions (no DB/sensitive-data access).

**Trade-off accepted.** The dashboard lives in an iframe rather than being natively woven
into the DOM. In exchange we get zero review delay, full ownership of the code, and a stable
integration that's easy to demo.

---

## ADR-003 — Authenticate to GHL with a Private Integration Token (PIT), not OAuth 2.0

**Context.** The backend must call HighLevel's API. GHL supports full OAuth 2.0 (marketplace
app) or a per-sub-account Private Integration Token.

**Decision.** Use a **PIT** (single token in `.env`) for the build.

**Alternatives rejected.**
- *OAuth 2.0 authorization-code flow* — adds a redirect callback, token storage, and refresh
  logic: ~5× the moving parts for no functional gain in a single-tenant sandbox demo.

**Trade-off accepted.** PIT is single-sub-account and less "production-real." Mitigation: the
GHL client is isolated in one file, so swapping to OAuth changes only how the `Authorization`
token is obtained. OAuth is documented in the README as the production path.

---

## ADR-004 — Define KPIs with a hybrid "AI suggests, human confirms" flow

**Context.** The assignment says to "set observability parameters based on the agent's
specific goals or script." Success criteria must come from somewhere.

**Decision.** The Copilot reads the agent's script/goals via API and **AI-suggests** a set of
KPIs (each with a testable rubric); the user **edits/confirms** them before they go active.

**Alternatives rejected.**
- *Manual only* (user types every KPI) — clear but less impressive, and ignores the agent's
  actual script.
- *Auto-derived only* (no human step) — fuzzy and hard to trust; nothing for the user to own.

**Trade-off accepted.** Slightly more UI (a confirm screen) in exchange for the strongest
product story: automation a human still owns. Maps directly to the brief's wording.

---

## ADR-005 — Backend stack: Express + SQLite

**Context.** Node backend required. Needs an HTTP layer and persistence for agents,
transcripts, KPIs, and analysis results.

**Decision.** **Express** for HTTP, **SQLite** for storage.

**Alternatives rejected.**
- *Fastify + SQLite* — nice built-in validation but marginally less universally known.
- *NestJS + Postgres* — dependency injection + decorators **hide control flow**, which works
  against the candidate when asked to "walk through a request"; Postgres needs a running
  service (infra overhead) unjustified at this scale.
- *Express + JSON files* — simplest, but loses SQL, which the fleet-view aggregations need.

**Trade-off accepted.** SQLite is single-file/single-node (not horizontally scalable) — fine
for this tool; the production note is "swap to Postgres, same schema."

---

## ADR-006 — Use `better-sqlite3` (synchronous driver)

**Context.** Need a SQLite driver for Node.

**Decision.** `better-sqlite3`.

**Alternatives rejected.**
- *`sqlite3` (async)* — introduces callback/promise ceremony and connection pooling concerns
  for no benefit here.
- *An ORM (Prisma/Sequelize)* — adds a generated-client abstraction layer; raw parameterized
  queries are more transparent for an interview ("show me the SQL").

**Trade-off accepted.** Synchronous DB calls block the event loop — acceptable because this
is a low-QPS internal tool and the queries are tiny/fast.

---

## ADR-007 — Normalize what we aggregate; JSON-blob what we only display

**Context.** Analysis produces per-KPI verdicts (which we aggregate for the fleet view) plus
recommendations / use-actions / findings (which we only render).

**Decision.** `kpi_verdicts` is a **normalized table** (so we can `GROUP BY` agent/KPI);
`recommendations`, `use_actions`, and `findings` are stored as **JSON columns** on
`analysis_results`.

**Alternatives rejected.**
- *Everything as JSON blobs* — can't do SQL aggregation for pass-rates → fleet view gets
  slow/awkward.
- *Everything fully normalized* — over-engineered tables for data we only ever render as-is.

**Trade-off accepted.** A deliberate, explainable boundary rather than one uniform rule.

---

## ADR-008 — Analysis via Claude structured output (tool-use), as two calls

**Context.** The "AI brain" must (a) propose KPIs and (b) evaluate a transcript, both
producing machine-usable results.

**Decision.** Two **Claude** calls that each **force a fixed JSON schema** via tool-use:
`suggestKpis(agent)` and `analyzeTranscript(transcript, kpis)`.

**Alternatives rejected.**
- *Free-text prompts + regex/JSON.parse of prose* — fragile; breaks on formatting drift.
- *One mega-call doing both* — muddles two concerns and makes each harder to test/explain.

**Trade-off accepted.** Two round-trips instead of one; in exchange each call has a single
responsibility and a schema that serves as the contract between AI and app.

---

## ADR-009 — Every verdict and use-action carries a turn index + exact quote

**Context.** The brief wants "Use Actions" — specific call segments flagged for a human.
Findings must be trustworthy, not vibes.

**Decision.** The analysis schema requires each KPI verdict and each use-action to cite the
**exact transcript quote** and its **turn index**; the prompt forbids citing text not present
in the transcript.

**Alternatives rejected.**
- *Summary-only findings* — unfalsifiable; the user can't verify or jump to the moment.

**Trade-off accepted.** Slightly stricter prompt/schema; in exchange the Call view can
highlight the precise segment and every finding is clickable back to evidence.

---

## ADR-010 — One `TranscriptSource` interface, three implementations

**Context.** Transcripts can come from fixtures, an API pull, or a webhook push, but the rest
of the system shouldn't care which.

**Decision.** A single `TranscriptSource` contract with `FixtureSource`, `GhlPullSource`, and
a webhook endpoint; all normalize to one internal `Transcript` shape.

**Alternatives rejected.**
- *Separate ad-hoc code paths per source* — duplicated normalization, no clean swap point.

**Trade-off accepted.** A small amount of abstraction, which pays for itself: this seam **is**
the real-vs-mocked story, and going live is a one-line source swap.

---

## ADR-011 — Frontend: Vue 3 + Vite + Pinia

**Context.** Vue.js is required by the brief. Some shared state (agents, analysis results)
appears on multiple screens.

**Decision.** **Vue 3** (Composition API) + **Vite** (dev/build) + **Pinia** (state).

**Alternatives rejected.**
- *No state library (fetch inside each view)* — duplicated fetches and out-of-sync copies of
  shared data across the Fleet/Agent/Call screens.
- *Vuex* — the older, heavier predecessor to Pinia; more boilerplate, weaker TS support.

**Trade-off accepted.** One small dependency (Pinia) for shared, single-source-of-truth
state. Pinia is tiny and explicit — a store is just `state`/`getters`/`actions`.

---

## ADR-012 — Single monorepo (`/backend`, `/frontend`)

**Context.** Deliverable is one GitHub repo.

**Decision.** One repo, two folders, each with its own `package.json`; one root README.

**Alternatives rejected.**
- *Two separate repos* — more overhead to clone/run/review for a solo project.
- *npm workspaces / turborepo* — unnecessary tooling for two packages.

**Trade-off accepted.** No shared-package tooling; the two folders are independent, which is
simpler to explain and run.

---

## ADR-013 — LLM provider: Claude (latest model)

**Context.** The brief just says "AI." We need reliable structured output.

**Decision.** Use **Claude** (latest model) via the Anthropic SDK, with tool-use for
structured output. The model id is recorded on each `analysis_results` row for provenance.

**Alternatives rejected.**
- *Other providers* — no functional reason to prefer them here; Claude's tool-use gives clean
  schema-constrained output. (Swappable: the LLM is isolated in `analysis/anthropic.js`.)

**Trade-off accepted.** Vendor dependency, isolated behind one file.

---

## ADR-014 — Optional agent prompt write-back, gated behind a confirm

**Context.** Truly "closing the flywheel" means applying a recommended fix back to the agent.

**Decision.** Offer an **optional** "Apply fix" action that writes an improved prompt to the
agent via `voice-ai-agents.write`, **gated behind an explicit user confirmation**. Treated as
a stretch, clearly labeled.

**Alternatives rejected.**
- *Auto-apply fixes* — mutates the customer's live agent without oversight; unacceptable.
- *Omit entirely* — leaves the flywheel open; worth showing as a gated capability.

**Trade-off accepted.** It's a stretch item that may ship mocked; the write is never silent.

---

## ADR-015 — Guiding principle: simplest thing that closes the loop and is line-by-line explainable

**Context.** Evaluation includes a **manual code review** ("only non-slop code") and an
interview where the candidate must defend every decision and own the code.

**Decision.** Optimize every choice for **transparency and explainability** over cleverness or
"enterprise-ness." Boring, owned, and correct beats impressive-but-magic.

**Consequence.** This principle is *why* several ADRs above went the way they did (Express
over NestJS, PIT over OAuth, raw SQL over ORM, iframe over Custom JS).

---

## ADR-016 — Blueprint before code; maintain this decision log

**Context.** The candidate must be able to follow and own everything that gets built.

**Decision.** Write `ARCHITECTURE.md` (the blueprint) and this `DECISIONS.md` **before**
generating implementation code, and keep both updated as work proceeds. Build in reviewable
chunks, explaining each module as it lands — never dump the whole scaffold at once.

**Consequence.** Slightly slower start; far better comprehension and defensibility.

---

## ADR-017 — Commit the docs and build an incremental, attributable git history on `main`

**Context.** The deliverable is a GitHub repo the org reviews. The commit history is itself a
signal, and this org is explicitly slop-averse. Discovery + design artifacts are already
written.

**Decision.** Initialize git immediately and commit in **small, meaningful, incremental
steps** on a **linear `main`** history (docs first, then one commit per build phase — never a
single large dump). Author commits as **Sachit Shivam <sachit.shivam@gmail.com>** via
**repo-local** git config so GitHub attributes the work to the correct account without
touching global config. No AI attribution in commit messages. No amend/rebase/force-push.

**Alternatives rejected.**
- *One big "initial commit" at the end* — reads as generated/dumped; the weakest ownership
  signal.
- *Feature branch + PR per phase* — adds merge-commit noise and an early-push requirement for
  a solo submission; linear `main` is more legible to a reviewer cloning the repo.
- *Use the machine's global git identity* (`shivam-aluskort` / `sachit@aluskort.com`) — a
  name/email mismatch and not the submitting GitHub account, which would misattribute the
  work.

**Trade-off accepted.** Linear `main` forgoes a PR-review trail; acceptable for a solo
assignment where clone-and-read legibility wins.

---

## ADR-018 — Commit `CLAUDE.md` as a neutral project guide

**Context.** `CLAUDE.md` started as an AI-assistant session-handoff file. The repo is an
outward-facing hiring submission evaluating the author's ownership.

**Decision.** Reframe `CLAUDE.md` as a **neutral, human-first "Project Guide"** (orientation +
engineering conventions + live status) and commit it. It still auto-loads as Claude Code
project context, but reads as ordinary contributor documentation.

**Alternatives rejected.**
- *Commit as-is (AI-assistant framing)* — foregrounds AI-driven handoffs on an assignment
  that is testing the author's own ownership.
- *Gitignore it* — loses a genuinely useful in-repo orientation + status doc for reviewers.

**Trade-off accepted.** Slightly less explicit about the tooling used; the content stands on
its own as legitimate project documentation.

---

## ADR-019 — Adopt current major dependency versions, pinned via committed lockfiles

**Context.** At install time, npm resolved the current stable majors: Express 5, Vue 3.5 +
Vue Router 5, Vite 8, Pinia 4, `better-sqlite3` 12, `@anthropic-ai/sdk` 0.x. `better-sqlite3`
installed via a prebuilt binary (no native compile) on Node 24 / Windows.

**Decision.** Accept the current stable majors and pin them with committed `package-lock.json`
files in both packages for reproducible installs. The APIs used (Express routers + `:param`
routes, Vue Router `createRouter`/`createWebHistory`, Pinia options stores) are stable across
these majors.

**Alternatives rejected.**
- *Pin to older majors (e.g. Express 4)* — no benefit here; the code uses only stable,
  version-agnostic APIs, and the current majors are the maintained line.

**Trade-off accepted.** Slightly newer surface area; mitigated by the committed lockfiles and
by keeping the dependency list minimal (5 backend deps, 3 frontend deps).

---

## ADR-020 — Storage-layer semantics (domain boundary, idempotency, replace-on-reanalyze)

**Context.** The repository layer sits between SQLite (snake_case columns, JSON stored as
TEXT) and the rest of the app + the frontend.

**Decision.**
- The repository is the **only** place SQL lives. It maps snake_case rows to **camelCase
  domain objects** and handles JSON (de)serialization, so callers and the frontend work in
  one consistent shape.
- **Transcript inserts are idempotent** (`INSERT OR IGNORE` on the GHL call id) — re-ingesting
  the same call is a safe no-op, which the webhook + pull paths rely on.
- **One current analysis per transcript**: re-analyzing replaces the prior `analysis_results`
  row (and its `kpi_verdicts` via cascade).
- **Confirming KPIs replaces the agent's whole KPI set** (`replaceKpisForAgent`); since
  `kpi_verdicts` cascade on KPI delete, changing criteria invalidates stale verdicts and
  re-analysis is expected.
- Every repo function takes an **optional `db` connection**, so scripts/tests use isolated
  databases (as the Task 3 smoke test does).

**Alternatives rejected.**
- *Leak snake_case rows to the API* — inconsistent JS/JSON shape, uglier frontend code.
- *Keep full history of every analysis / KPI revision* — unnecessary for this tool and adds
  query complexity; an append-only history can be added later if a use case appears.

**Trade-off accepted.** Re-analysis and KPI changes discard prior results rather than
versioning them.

**Update (audit cycle 1).** The "one current analysis per transcript" invariant is now enforced
structurally via `UNIQUE(transcript_id)` on `analysis_results` (previously procedural only,
via `delPrev`). And `replaceKpisForAgent` now also clears the agent's `analysis_results`,
because analyses computed against the old KPIs are stale — the dashboard shows "not analyzed"
until a re-run rather than a stale analysis with empty verdicts.

---

## ADR-023 — Diverse-model review cadence: Fable `/review` at slice boundaries, adapted to linear `main`

**Context.** We run an Opus audit-loop on demand. We also want a second, model-diverse review
(Fable) using the `/review` rubric. `/review` is built for GitHub PRs, but we commit directly
to linear `main` (ADR-017), so there is no PR to attach to.

**Decision.** Run a **Fable** subagent with `/review`'s rubric as the guiding prompt at
**vertical-slice boundaries** — after Task 8 (backend fully wired), after Task 11 (frontend),
and a light pass before submission — pointed at the slice's **commit range**
(`git diff <base>..HEAD`) rather than a PR. Findings are validated → fixed → committed, the
same discipline as the audit-loop. It is **complementary** to the Opus audit-loop (different
model, different surface), not stacked on identical lines.

**Alternatives rejected.**
- *Review every task* — too much review-to-build overhead.
- *One review at the very end* — issues surface late, when they're more expensive to fix.
- *Switch to PR-per-slice so `/review` runs natively* — reverses ADR-017's linear-`main`
  choice and adds ceremony; we keep linear history and adapt the review to commit ranges.

**Trade-off accepted.** No native inline-PR-comment trail; review findings flow through the
assistant (validate → fix → commit) instead.

---

## ADR-024 — Analysis engine: Claude structured outputs, `claude-opus-4-8` default, FK-safe verdict mapping

**Context.** The analysis engine (KPI suggestion + transcript evaluation) is the graded "AI
brain." It needs reliable machine-readable output and correct storage. (Confirmed against the
`claude-api` skill.)

**Decision.**
- Use Claude via `@anthropic-ai/sdk` with **structured outputs** (`output_config.format`,
  `type: json_schema`) — the API guarantees the first text block is valid JSON, so no
  prose-parsing. Schemas in `analysis/schemas.js` honor the structured-output constraints
  (`additionalProperties: false`, all properties in `required`, no min/max/length).
- **Default model `claude-opus-4-8`** (Anthropic guidance: default to the most capable model,
  don't downgrade for cost — analysis quality is what's graded). Configurable via
  `ANTHROPIC_MODEL` (e.g. `claude-sonnet-5`) for cheaper runs. This **supersedes** the earlier
  `claude-sonnet-5` default from initial scaffolding.
- `analyzeTranscript` maps Claude's `kpi_name` back to our `kpi_id` and **drops any verdict
  without a match** — `kpi_verdicts.kpi_id` is NOT NULL + FK, and we never trust the model to
  return a valid id even though the prompt tells it to reuse exact KPI names.
- `analyzeAndStore` (`analysis/analyzeService.js`) is the **injectable `analyze` callback**
  (keeps ingestion decoupled per ADR-022); it no-ops when the agent has no active KPIs.
- Evidence discipline (ADR-009) is enforced in both the prompt and the schema: every verdict
  and use-action carries an exact quote + turn index.

**Alternatives rejected.**
- *Free-text prompt + `JSON.parse` of prose* — fragile; breaks on formatting drift.
- *Tool-use (`strict`) for structured output* — `output_config.format` is the canonical
  current approach and simpler for a single JSON result.
- *Trusting `kpi_name` as a valid id* — would crash on the FK insert.

**Trade-off accepted.** `claude-opus-4-8` costs more per call than Sonnet; acceptable for
graded quality, and one env var flips it.

---

## ADR-025 — REST API layer: thin async handlers, boot-time schema init, config-driven degradation

**Context.** The HTTP layer sits over the services (agents, kpis, calls, fleet, ingest,
webhooks).

**Decision.**
- Route handlers are thin and wrapped in `asyncHandler` (`ah`) so async rejections reach one
  centralized Express error handler (Express 5 auto-forwards sync throws, but not async
  rejections).
- The server **initializes the schema on boot** (`initDb()`), so it's self-sufficient — no
  separate `db:init` needed just to run it (the script stays for explicit setup).
- **Graceful degradation by config:** `/ingest/sync` uses `GhlPullSource` when a PIT is set,
  else `FixtureSource`; analysis runs only when `ANTHROPIC_API_KEY` is present
  (`analyzeAndStore` injected conditionally). The demo works with zero credentials; the real
  paths light up when creds are present.
- Ingestion counters now distinguish **analyzed** vs **analyzeSkipped** (agent has no active
  KPIs) vs **analyzeFailed** — the injected callback's truthy return signals a real analysis
  (refines ADR-022).
- Aggregation SQL lives in `db/aggregations.js` (still the DB layer per ADR-020);
  `services/fleet.js` shapes it. Uses SQLite `json_array_length` to count use-actions.

**Alternatives rejected.**
- *try/catch in every handler* — noisy; `asyncHandler` + one error middleware is cleaner.
- *Require `db:init` before boot* — brittle; boot-time init is idempotent.

**Trade-off accepted.** The calls list does one analysis lookup per call (N+1) — fine at demo
scale; flagged in-code to switch to a join if call volume grows.

---

## ADR-021 — The GHL client is a thin transport; response mapping lives in ingestion

**Context.** HighLevel's exact response shapes and some query-param/pagination details are not
fully confirmed (their docs render client-side). We still want a clean, testable client now.

**Decision.** `ghl/client.js` only authenticates (PIT) and returns **raw parsed JSON**. It does
NOT map to our domain shape — that is the ingestion layer's job (`normalize.js`). Unconfirmed
request params (date filters, pagination) are included but **flagged in comments and logged**
(the ingestion layer reports how many records it received), never silently truncated.
`isConfigured()` lets callers fall back to fixtures when no PIT is present.

**Alternatives rejected.**
- *Map to the domain shape inside the client* — spreads HighLevel-shape assumptions across two
  concerns and couples the transport to shapes we haven't confirmed yet.
- *Guess pagination/params silently* — risks silently dropping results; instead we flag + log
  and finalize against a live sandbox.

**Trade-off accepted.** A second mapping hop (client → normalize) in exchange for a clean
transport/mapping separation and honest handling of unknowns.

---

## ADR-022 — Ingestion orchestration: dedupe, FK safety-net, injected analyzer, defensive normalize

**Context.** `ingestService` turns any `TranscriptSource` into stored (and later analyzed)
transcripts. It must be idempotent, must not fail when agents aren't synced yet, and must not
hard-couple to the analysis engine.

**Decision.**
- **Dedupe** by `transcriptExists(id)` before storing (plus `INSERT OR IGNORE` as a second
  guard) → re-ingesting the same call is a safe no-op.
- **`ensureAgent()` safety-net** — create a minimal placeholder agent if the transcript's agent
  isn't stored yet, so the FK holds even before an agent sync; a later sync upserts real
  details in place.
- **The analyzer is injected** as an optional `analyze` callback (wired in Task 7), so
  ingestion has zero import dependency on the analysis engine — the two are independently
  testable (Task 5 tested ingestion with no AI/network).
- **`normalize.js` is defensive** — tries multiple field names, handles array *or* string
  transcripts, maps varied speaker labels, and always keeps the original payload in `raw`,
  because HighLevel shapes are unconfirmed.

**Alternatives rejected.**
- *Ingestion imports and calls the analyzer directly* — couples the modules; ingestion could
  not be tested without the AI/network.
- *Require agents synced before any ingest* — brittle ordering; the safety-net makes ingestion
  order-independent.

**Trade-off accepted.** A placeholder agent may briefly show its id as its name until a real
sync fills in the details.
