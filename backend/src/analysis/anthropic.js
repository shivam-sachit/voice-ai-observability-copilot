// Claude client + a helper that forces structured (tool-use) output validated against a
// schema. The ONLY file that knows Anthropic exists; swapping providers touches only here.
// --- Implemented in Task 7. ---
// Contract:
//   structured({ schema, system, user }) -> validated object matching `schema`
export {}
