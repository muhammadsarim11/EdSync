import rateLimit from 'express-rate-limit';

// Rate-limit windows make functional tests flaky/order-dependent; the
// limiters' own behavior is covered by manual verification, not this flag.
const skipInTests = () => process.env.NODE_ENV === 'test';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { status: 'fail', message: 'Too many requests. Please try again later.' }
});

// For endpoints where a "successful" response is the normal outcome of both
// legitimate and abusive traffic (register, forgot-password, resend-*) -
// every attempt must count, or the limiter never engages.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { status: 'fail', message: 'Too many attempts. Please try again later.' }
});

// Login specifically: don't penalize a user's own successful login for the
// failed attempts that preceded it, but still throttle credential stuffing.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: skipInTests,
  message: { status: 'fail', message: 'Too many failed login attempts. Please try again later.' }
});

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const stripDangerousKeys = (input) => {
  if (Array.isArray(input)) {
    input.forEach(stripDangerousKeys);
    return input;
  }

  if (!isPlainObject(input)) {
    return input;
  }

  for (const key of Object.keys(input)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete input[key];
      continue;
    }
    stripDangerousKeys(input[key]);
  }

  return input;
};

export const sanitizeInput = (req, res, next) => {
  // Mutate in place rather than reassigning req.query/req.params, which are
  // getter-only on the request object in modern Express.
  stripDangerousKeys(req.body);
  stripDangerousKeys(req.params);
  stripDangerousKeys(req.query);
  next();
};
