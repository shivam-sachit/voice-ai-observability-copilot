// Wraps an async route handler so a rejected promise is forwarded to Express's error handler
// (Express 5 forwards sync throws automatically, but not async rejections).
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
