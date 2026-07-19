// Wraps an async route handler and forwards any rejection to Express's error middleware.
// (Express 5 also auto-forwards a rejected promise returned from a handler; this makes the
// forwarding explicit and independent of how each handler happens to be written.)
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
