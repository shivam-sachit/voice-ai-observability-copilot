// The ONLY file that knows HighLevel's API exists. Authenticated with a Private Integration
// Token (see config.ghl). If we later move to OAuth, only the token source changes here.
// --- Implemented in Task 4 (GHL API client with PIT auth). ---
// Contract (all async, return parsed JSON):
//   listAgents()                       GET  /voice-ai/agents
//   getAgent(agentId)                  GET  /voice-ai/agents/:agentId
//   listCallLogs({ agentId, since })   GET  /voice-ai/dashboard/call-logs
//   getCallLog(callId)                 GET  /voice-ai/dashboard/call-logs/:callId
// Every request sends:  Authorization: Bearer <PIT> ,  Version: <apiVersion>.
export {}
