// One line per finished request: method, path, status and duration.
// The query string is dropped on purpose - invite and reset links carry
// tokens there, and those must never end up in log files. Health checks
// are skipped (a hosting platform pings them every few seconds) and so is
// the test suite, to keep its output readable.
const SKIP_PATHS = new Set(['/health', '/api/v1/health']);

export const requestLogger = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();

  const path = req.originalUrl.split('?')[0];
  if (SKIP_PATHS.has(path)) return next();

  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    console.log(`${new Date().toISOString()} ${req.method} ${path} ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  next();
};
