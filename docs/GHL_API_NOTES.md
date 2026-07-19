# HighLevel API research notes

> Discovery already completed on 2026-07-19. **Reuse this instead of re-researching.**
> Confirmed items are cited; unconfirmed items are flagged with how to verify them.
> This exists so no future session wastes time/tokens re-deriving what HighLevel exposes.

## TL;DR
HighLevel **does** expose Voice AI agents and **call transcripts** via a public, documented
API. In a fresh sandbox there is simply no call *data* yet (no calls placed). So: build
against the real API shape, demo on fixtures, and use the webhook for the real-time path.

## Base + auth
- **Base URL:** `https://services.leadconnectorhq.com`
- **Auth (build):** Private Integration Token (PIT), minted per sub-account.
  - Header: `Authorization: Bearer <PIT>`
  - Header: `Version: 2021-07-28`
- **Auth (production):** OAuth 2.0 authorization-code flow (marketplace app) → access +
  refresh tokens; use a Sub-Account (Location) token. Same API client, only token acquisition
  differs.

## Scopes needed
- `voice-ai-agents.readonly` — list/get Voice AI agents (config, script, goals)
- `voice-ai-dashboard.readonly` — Voice AI call logs + call details (incl. transcripts)
- `conversations/message.readonly` — message recordings **and transcriptions**
- (optional) `voice-ai-agent-goals.readonly`, `phonenumbers.read`

## Confirmed endpoints
| Purpose | Method + path |
| --- | --- |
| List Voice AI agents | `GET /voice-ai/agents` |
| Get one agent (config/script/goals) | `GET /voice-ai/agents/:agentId` |
| List call logs (filter by agent/contact/date) | `GET /voice-ai/dashboard/call-logs` |
| Get one call log (+ transcript) | `GET /voice-ai/dashboard/call-logs/:callId` |
| Message transcription (any call message) | `GET /conversations/locations/:locationId/messages/:messageId/transcription` |
| Message recording (audio) | `GET /conversations/messages/:messageId/locations/:locationId/recording` |
| (stretch) Update agent prompt | `PATCH /voice-ai/agents/:agentId` (scope `voice-ai-agents.write`) |

## Transcript ingestion — three routes (this maps to the `TranscriptSource` seam)
1. **Real-time webhook (preferred for "functional" proof):** Workflow trigger
   **"Transcript Generated"** fires when a transcript is ready and delivers the **full
   transcript + duration + direction + timestamps** into the workflow; attach a **Custom
   Webhook** action to POST that payload to our `POST /api/webhooks/transcript`.
   - Caveat: only fires for calls recorded/transcribed inside HighLevel (not imported calls).
2. **API pull:** `GET /voice-ai/dashboard/call-logs` → per call → transcript. Works whenever
   calls exist; drives the "Sync" button.
3. **Fixtures:** seeded JSON shaped like the API response — always available for the demo.

## Other relevant webhooks
- `VoiceAiCallEnd` — fires on Voice AI call completion. **Assume metadata-only** (payload
  schema not confirmed to include transcript text) → react to it by pulling the call log.
- `InboundMessage` / `OutboundMessage` (type CALL) — carry `direction`, `status`,
  `callDuration`, recording URL in `attachments`, etc. **No transcript text** in payload.

## Integration mechanism (how our UI gets inside HighLevel)
- **Chosen: iframe embed.** Add a **Custom Menu Link / Custom Page** in the sub-account
  pointing at our hosted Vue app; HighLevel renders it in an iframe and passes location
  context (e.g. `locationId`). Review-free, owned, stable. (See ADR-002.)
- **Rejected: Custom JS injection** (the panel first seen in the screenshot). Agency-level;
  manual review up to ~10-day SLA; runs in GHL's DOM (fragile); documented restrictions
  (no DB/sensitive-data access, no remote script loading). Not suitable for pulling data.

## NOT yet confirmed — verify against a live sandbox or by hitting the endpoint with a PIT
The marketplace docs render their OpenAPI schemas client-side, so these exact shapes weren't
captured. Confirm before relying on precise field names:
1. Exact JSON of the **transcription** response and the **Voice AI call-log** object — is the
   transcript inline vs a separate call? Does it include per-utterance speaker turns +
   timestamps? (Our internal `Transcript.turns` assumes `{speaker, text, ts}` — map to
   whatever the real fields are inside `normalize.js`.)
2. Exact **`VoiceAiCallEnd`** payload contents.
3. Whether **Get Agent** returns the raw prompt/script text verbatim (needed for KPI
   suggestion; if not, derive KPIs from whatever config fields are returned).

## Sources (official docs, retrieved 2026-07-19)
- Voice AI public APIs — marketplace.gohighlevel.com/docs/ghl/voice-ai/* ;
  help.gohighlevel.com/support/solutions/articles/155000006379
- Conversations message transcription/recording — marketplace.gohighlevel.com/docs/ghl/conversations/*
- Scopes — marketplace.gohighlevel.com/docs/Authorization/Scopes/
- OAuth — marketplace.gohighlevel.com/docs/oauth/* ; .../Authorization/OAuth2.0/
- "Transcript Generated" trigger — help.gohighlevel.com/support/solutions/articles/155000006632
- Custom JS for marketplace apps — help.gohighlevel.com/support/solutions/articles/155000003278
